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
  const now = Timestamp.now();

  // Dot-notation: solo tocamos las claves de plan.* que nos interesan.
  // comercioRef.update({ plan: {...} }) reemplazaría el mapa "plan" ENTERO
  // (Firestore no hace merge de sub-objetos con update()), lo que borraría
  // campos que no pasamos acá — como el "createdAt" que quedó de la
  // migración camelCase → snake_case. Con dot-notation el resto del mapa
  // queda intacto. También mantenemos el mirror camelCase (startedAt,
  // expiresAt, updatedAt) sincronizado en cada write, para no reintroducir
  // la mezcla snake/camel que causó el bug del 30/07.
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

  // 1. Actualizar DB
  await comercioRef.update(planUpdate);

  // 2. Referral válido — solo si es plan pagado activo
  if (active && !trial) {
    const entidadSnap = await comercioRef.get();
    const duenoId     = entidadSnap.data()?.duenoId || null;
    if (duenoId) {
      const usuarioSnap = await db.collection('usuarios').doc(duenoId).get();
      const referredBy  = usuarioSnap.data()?.referredBy || null;
      if (referredBy) {
        // Buscar si ya existe el evento
        const eventosSnap = await db.collection('referral_events')
          .where('createdEntityId', '==', comercioId)
          .limit(1)
          .get();
        if (!eventosSnap.empty) {
          // Marcar el existente como válido
          await eventosSnap.docs[0].ref.update({
            valid:       true,
            validatedAt: Timestamp.now(),
          });
        } else {
          // Crear el evento directamente como válido
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

  // 3. Regenerar entidad
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
