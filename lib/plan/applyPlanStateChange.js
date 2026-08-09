// lib/plan/applyPlanStateChange.js
import { getFirestore, Timestamp } from "firebase-admin/firestore";

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
  const db = getFirestore();
  const comercioRef = db.collection("entidades").doc(comercioId);
  const now = Timestamp.now();

  const planUpdate = {
    'plan.type': type,
    'plan.active': active,
    'plan.trial': trial,
    'plan.started_at': startedAt,
    'plan.startedAt': startedAt,
    'plan.expires_at': expiresAt,
    'plan.expiresAt': expiresAt,
    'plan.source': source,
    'plan.reason': reason,
    'plan.last_event_id': eventId,
    'plan.updated_at': now,
    'plan.updatedAt': now,
  };

  await comercioRef.update(planUpdate);

  if (active && !trial) {
    const entidadSnap = await comercioRef.get();
    const duenoId     = entidadSnap.data()?.duenoId || null;
    if (duenoId) {
      const usuarioSnap = await db.collection('usuarios').doc(duenoId).get();
      const referredBy  = usuarioSnap.data()?.referredBy || null;
      if (referredBy) {
        const eventosSnap = await db.collection('referral_events')
          .where('createdEntityId', '==', comercioId)
          .limit(1)
          .get();
        if (!eventosSnap.empty) {
          await eventosSnap.docs[0].ref.update({
            valid:       true,
            validatedAt: Timestamp.now(),
          });
        } else {
          await db.collection('referral_events').add({
            referrerCode:    referredBy,
            referrerType:    'usuario',
            createdUserId:   duenoId,
            createdEntityId: comercioId,
            valid:           true,
            validatedAt:     Timestamp.now(),
            timestamp:       Timestamp.now(),
          });
        }
        console.log('🎯 Referral validado para:', referredBy);
      }
    }
  }

  try {
    console.log(`🔄 Regenerando entidad para comercio: ${comercioId}`);
    const response = await fetch('https://indiceia.dev/api/generate-and-upload-entity', {
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
