// lib/redirect/resolveDemoWaNumber.js
// ⟦ROLE⟧ Contraparte server-side de closers/demo.js. Único lugar que
// decide si un endpoint *-redirect respeta el parámetro waDestino que
// viene en la URL, o lo ignora y usa el WhatsApp real de la entidad.
//
// Por qué existe (08/09/2026): wa-redirect/[id].js y
// service-redirect/[id].js necesitan exactamente la misma decisión de
// seguridad — y cualquier *-redirect nuevo que se agregue (lead,
// contact, o lo que traiga un entityType futuro) también la va a
// necesitar. Duplicar este chequeo en cada endpoint es el tipo de
// cosa que un día alguien actualiza en un lugar y se olvida en otro,
// dejando un hueco de seguridad silencioso. Un solo punto de verdad.
//
// REGLA DE SEGURIDAD (no negociable): isDemo se lee de `data`, el doc
// de Firestore que el endpoint ya tiene en mano — NUNCA de un query
// param, NUNCA de nada que el LLM haya decidido en la conversación.
// Si la entidad no es demo, el override se ignora EN SILENCIO (sin
// error, sin aviso) aunque venga en la URL — no le da información a
// quien intente falsear el parámetro a mano sobre si el sistema lo
// reconoce. Ver conversación 08/09/2026 para el razonamiento completo.

// ── Normaliza cualquier formato de teléfono AR a los 10 dígitos que
//    espera wa.me/549{numero}. Movido acá desde wa-redirect/[id].js —
//    antes vivía duplicado (con copy-paste) en cada endpoint. ──
export function resolveWaNumber(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/[\s\-\(\)\+]/g, '');
  if (n.startsWith('549')) n = n.slice(3);
  else if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9') && n.length >= 10) n = n.slice(1);
  return n || null;
}

// ── Decide qué número usar: el override de la URL (solo si la
//    entidad es demo Y vino el param) o el número real de la entidad.
//    `data` es el doc de Firestore ya leído por el endpoint — nunca
//    se vuelve a consultar acá. `requestedOverride` es el valor crudo
//    del query param (ej. req.query.waDestino), puede venir undefined. ──
export function resolveDemoAwareNumber(data, requestedOverride) {
  const isDemo = data?.isDemo === true;
  if (isDemo && requestedOverride) {
    return resolveWaNumber(requestedOverride);
  }
  return resolveWaNumber(data?.whatsapp);
}
