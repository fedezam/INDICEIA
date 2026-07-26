// /api/entity/[id].js
// ⟦ROLE⟧ Proxy de entidad. Lee Blob estático → inyecta horaActual → devuelve JSON fresco.
//
// ── Fixes aplicados ───────────────────────────────────────────
// 1. now=horaActual / day_key=diaComercialActual → sustituidos por valores
//    reales (fix previo, ya en producción).
// 2. Orden: mind primero, meta/contracts al final (fix previo, ya en
//    producción).
// 3. NUEVO (25/07/2026): hours_from_context / delivery_hours_from_context
//    seguían como texto literal sin resolver — el mismo bug que now/day_key
//    tenían antes, nunca corregido para estos dos. El LLM recibía la
//    instrucción "andá a buscar los horarios en otro lado" sin que
//    existiera ningún "otro lado" real: el contenido de context.horarios
//    ya viaja en el propio JSON, pero SCHEDULE nunca lo referenciaba.
//
//    Fix: se sustituyen por los horarios YA RESUELTOS para el día
//    comercial de hoy (hours_today=..., delivery_hours_today=...), en
//    el mismo formato compacto que usa el resto del LER (rangos con
//    guion, turnos separados por pipe — sin JSON crudo, sin corchetes).
//    Deliberadamente NO se calcula un booleano "abierto=true/false":
//    eso le impondría el razonamiento al LLM, contradiciendo el
//    principio ya documentado en getDiaComercialActual.js ("el LLM
//    sigue siendo quien compara la hora contra los rangos"). Se le
//    da el dato resuelto (qué día es, qué horario tiene ese día), no
//    la conclusión.
// ───────────────────────────────────────────────────────────────

import { getHoraActual } from '../../lib/utils/getHoraActual.js';
import { getDiaComercialActual } from '../../lib/utils/getDiaComercialActual.js';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

// ── Formatea turnos [[open,close],...] → "open-close|open-close" ──
// Mismo estilo compacto que el resto del LER (pipe-separated, sin
// JSON crudo). Devuelve null si no hay turnos para ese día.
function formatTurnos(turnos) {
  if (!Array.isArray(turnos) || !turnos.length) return null;
  const formateados = turnos
    .filter(t => Array.isArray(t) && t[0] && t[1])
    .map(([open, close]) => `${open}-${close}`);
  return formateados.length ? formateados.join('|') : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id inválido' });
  }

  try {
    // 1. Leer URL del Blob desde Firestore
    const snap = await db.collection('entidades').doc(id).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Entidad no encontrada' });
    }
    const { entityPublicUrl } = snap.data();
    if (!entityPublicUrl) {
      return res.status(404).json({ error: 'Entidad no generada aún' });
    }

    // 2. Fetchear el JSON estático desde Blob
    const blobRes = await fetch(entityPublicUrl);
    if (!blobRes.ok) {
      return res.status(502).json({ error: 'No se pudo leer la entidad desde Blob' });
    }
    const entity = await blobRes.json();

    // 3. Resolver hora y día comercial reales
    const horaActual = getHoraActual();
    const diaComercialActual = getDiaComercialActual(horaActual, entity.context?.horarios);

    // 4. Resolver horarios reales de HOY (local y delivery), ya
    //    indexados por el día comercial correcto (no el día calendario
    //    literal — ver getDiaComercialActual.js para el caso de cruce
    //    de medianoche).
    const horariosHoy   = diaComercialActual ? entity.context?.horarios?.[diaComercialActual] : null;
    const deliveryHoy    = diaComercialActual ? entity.context?.horariosDelivery?.[diaComercialActual] : null;

    const hoursStr    = formatTurnos(horariosHoy);
    const deliveryStr = formatTurnos(deliveryHoy);

    // 'n/a' cuando no hay día resuelto o no hay horarios declarados
    // (ej: entidad remota sin restricción horaria) — distinto de
    // 'closed', que sí sería una afirmación (hoy no atiende).
    const hoursToken    = diaComercialActual
      ? (hoursStr ? `hours_today=${hoursStr}` : 'hours_today=closed')
      : 'hours_today=n/a';
    const deliveryToken = diaComercialActual
      ? (deliveryStr ? `delivery_hours_today=${deliveryStr}` : 'delivery_hours_today=closed')
      : 'delivery_hours_today=n/a';

    // 5. Sustituir los placeholders reales dentro del mind.
    const mindResuelto = typeof entity.mind === 'string'
      ? entity.mind
          .replace('now=horaActual', `now=${horaActual}`)
          .replace(
            'day_key=diaComercialActual',
            diaComercialActual ? `day_key=${diaComercialActual}` : 'day_key=diaComercialActual'
          )
          .replace('hours_from_context', hoursToken)
          .replace('delivery_hours_from_context', deliveryToken)
      : entity.mind;

    // 6. Reensamblar en el orden en que el LLM debería leerlo:
    //    identidad primero, bookkeeping técnico al final.
    const {
      meta,
      contracts,
      mind, // ya resuelto en mindResuelto, se descarta el original
      context,
      goods,
      services,
      professional,
      visual,
      channels,
      capabilities,
      ...resto
    } = entity;

    const enriched = {
      mind: mindResuelto,
      context,
      ...(goods        && { goods }),
      ...(services     && { services }),
      ...(professional && { professional }),
      ...(visual       && { visual }),
      ...(channels     && { channels }),
      ...(capabilities && { capabilities }),
      ...resto,
      meta,
      contracts,
    };

    // 7. Cache corto — la hora cambia cada minuto
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(enriched);
  } catch (err) {
    console.error('[api/entity] Error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
