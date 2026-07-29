// /api/entity/[id].js
// ⟦ROLE⟧ Proxy de entidad. Lee Blob estático → inyecta horaActual →
// resuelve estado de plan → devuelve JSON fresco.
//
// ── Fixes aplicados ───────────────────────────────────────────
// 1. now=horaActual / day_key=diaComercialActual → sustituidos por valores
//    reales (fix previo, ya en producción).
// 2. Orden: mind primero, meta/contracts al final (fix previo, ya en
//    producción).
// 3. hours_from_context / delivery_hours_from_context — sustituidos por
//    los horarios YA RESUELTOS para el día comercial de hoy (fix previo,
//    ya en producción). Deliberadamente NO se calcula un booleano
//    "abierto=true/false": el LLM sigue siendo quien compara la hora
//    contra los rangos.
// 4. Enforcement de plan (28/07/2026): se resuelve el estado real con
//    resolvePlanStatus() (tiempo real, cierra el gap de hasta 24hs entre
//    corridas del cron) y, si no está activa, la entidad entra en
//    estado de "huelga": frame LER + frase fija de aterrizaje (mismo
//    patrón que originEscapePhrase). goods/services/professional/visual
//    se omiten del JSON; channels (contacto) se mantiene siempre.
// 5. FIX: el plan NUNCA vivió en el Blob (entity.json) — vive en
//    Firestore, documento que este mismo proxy YA lee en el paso 1 para
//    sacar entityPublicUrl. resolvePlanStatus() lee de
//    `firestoreData.plan` (el snap que ya tenemos), no de `entity.plan`.
// 6. FIX (28/07/2026): omitir goods/services/visual como campos del
//    JSON no alcanza — el `mind` es un string ya horneado en
//    buildEntity(), con MINIAPP:<url> y ORDER_CLOSE/SERVICE_CLOSE/
//    CONTACT_CLOSE escritos como texto plano ADENTRO del string.
//    Agregar ⟦INACTIVE⟧ al final no borra eso — hay que recortarlo
//    explícitamente con stripOperationalBlocks() antes de appendear el
//    bloque de huelga, o la entidad recibe instrucciones contradictorias
//    (mini-app + flujo de pedido conviviendo con "estoy en huelga").
// ───────────────────────────────────────────────────────────────

import { getHoraActual } from '../../lib/utils/getHoraActual.js';
import { getDiaComercialActual } from '../../lib/utils/getDiaComercialActual.js';
import { resolvePlanStatus } from '../../lib/plan/resolvePlanStatus.js';
import { stripOperationalBlocks } from '../../lib/plan/stripOperationalBlocks.js';
import { mindConfig } from '../../lib/entity-factory/mind.config.js';
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

// ── Arma el bloque LER de huelga, con placeholders resueltos ──
function buildInactiveBlock(entity) {
  const nombreComercio = entity.context?.nombre || entity.meta?.comercioId || 'este comercio';
  const escapePhrase = mindConfig.inactiveConfig.escapePhrase.replace(
    '{{NOMBRE_COMERCIO}}',
    nombreComercio
  );
  return `\n⟦INACTIVE⟧${mindConfig.inactiveConfig.frame}∧escape="${escapePhrase}"`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id inválido' });
  }

  try {
    // 1. Leer documento de Firestore — de acá sale la URL del Blob Y
    //    el plan real (fuente única de verdad para el estado de plan,
    //    nunca vivió en el Blob).
    const snap = await db.collection('entidades').doc(id).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Entidad no encontrada' });
    }
    const firestoreData = snap.data();
    const { entityPublicUrl } = firestoreData;
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
    const horariosHoy = diaComercialActual ? entity.context?.horarios?.[diaComercialActual] : null;
    const deliveryHoy = diaComercialActual ? entity.context?.horariosDelivery?.[diaComercialActual] : null;

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
    let mindResuelto = typeof entity.mind === 'string'
      ? entity.mind
          .replace('now=horaActual', `now=${horaActual}`)
          .replace(
            'day_key=diaComercialActual',
            diaComercialActual ? `day_key=${diaComercialActual}` : 'day_key=diaComercialActual'
          )
          .replace('hours_from_context', hoursToken)
          .replace('delivery_hours_from_context', deliveryToken)
      : entity.mind;

    // 6. Resolver estado de plan — en tiempo real, leyendo Firestore
    //    (firestoreData.plan), NO el Blob. Cierra el gap del cron.
    const planStatus = resolvePlanStatus(firestoreData.plan);

    // 7. Si está inactiva → recortar bloques operativos del mind
    //    (mini-app, cierre de pedido/servicio/contacto) ANTES de
    //    agregar el bloque de huelga. Sin esto, la entidad recibiría
    //    instrucciones contradictorias.
    if (!planStatus.active) {
      mindResuelto = stripOperationalBlocks(mindResuelto);
      mindResuelto = `${mindResuelto}${buildInactiveBlock(entity)}`;
    }

    // 8. Reensamblar en el orden en que el LLM debería leerlo:
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
      // goods/services/professional/visual se omiten completos si la
      // entidad está en huelga — la ausencia habla por sí sola, sin
      // necesidad de nombrar "catálogo" (vocabulario que no aplica a
      // todos los entityType) ni de dar la coordenada de la mini-app.
      ...(planStatus.active && goods        && { goods }),
      ...(planStatus.active && services     && { services }),
      ...(planStatus.active && professional && { professional }),
      ...(planStatus.active && visual       && { visual }),
      // channels (contacto) se mantiene siempre — la salida de la
      // huelga es justamente que alguien se contacte.
      ...(channels     && { channels }),
      ...(capabilities && { capabilities }),
      ...resto,
      meta,
      contracts,
    };

    // 9. Cache corto — la hora cambia cada minuto y el estado de plan
    //    puede cambiar en cualquier momento
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(enriched);
  } catch (err) {
    console.error('[api/entity] Error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
