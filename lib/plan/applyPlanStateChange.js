// lib/plan/applyPlanStateChange.js

import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

export async function applyPlanStateChange({
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

  const comercioRef = db.collection("entidades").doc(comercioId);

  const planData = {
    plan: {
      type,
      active,
      trial,
      started_at: startedAt,
      expires_at: expiresAt,
      source,
      reason,
      last_event_id: eventId,
      updated_at: Timestamp.now(),
    },
  };

  // 1. Actualizar DB
  await comercioRef.update(planData);

  // 2. Regenerar entidad
  try {
    console.log(`🔄 Regenerando entidad para comercio: ${comercioId}`);
    
    const response = await fetch('https://indiceia.vercel.app/api/generate-and-upload-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error regenerando entidad:`, errorText);
    } else {
      console.log(`✅ Entidad regenerada para: ${comercioId}`);
    }
  } catch (error) {
    console.error('⚠️ Error al regenerar entidad:', error);
  }
}