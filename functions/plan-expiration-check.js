// functions/plan-expiration-check.js

import { db, Timestamp } from "./firebaseAdmin.js";

async function applyPlanStateChange({
  comercioId,
  type,
  active,
  trial,
  startedAt,
  expiresAt,
  source,
  reason,
  eventId = null,
}) {
  if (!comercioId) {
    throw new Error("comercioId requerido");
  }

  const comercioRef = db.collection("comercios").doc(comercioId);

  const planData = {
    plan: {
      type,
      active,
      trial,
      started_at: startedAt ? Timestamp.fromDate(new Date(startedAt)) : null,
      expires_at: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
      source,
      reason,
      last_event_id: eventId,
      updated_at: Timestamp.now(),
    },
  };

  // 1. escribir DB
  await comercioRef.update(planData);

  // 2. regenerar entidad llamando al endpoint de Vercel
  try {
    console.log(`🔄 Regenerando entidad para comercio: ${comercioId}`);
    
    const response = await fetch('https://indiceia.vercel.app/api/generate-and-upload-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP ${response.status} al regenerar entidad:`, errorText);
    } else {
      console.log(`✅ Entidad regenerada correctamente para comercio: ${comercioId}`);
    }
  } catch (error) {
    console.error('⚠️ Error al llamar a generate-and-upload-entity:', error);
    // No lanzamos error para que no falle el cambio de plan
  }
}

export async function checkExpiredPlans() {
  console.log("⏱️ checkExpiredPlans running");
  
  const now = Timestamp.now();
  const snapshot = await db.collection("comercios").get();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const plan = data.plan;

    if (!plan?.active || !plan.expiresAt) continue;
    if (plan.expiresAt.toMillis() > now.toMillis()) continue;

    await applyPlanStateChange({
      comercioId: docSnap.id,
      type: plan.type,
      active: false,
      trial: plan.trial,
      startedAt: plan.startedAt,
      expiresAt: plan.expiresAt,
      source: "system",
      reason: plan.trial ? "trial_expired" : "plan_expired"
    });
  }
}
