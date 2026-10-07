// /api/entity/[id].js
// ⟦ROLE⟧ Proxy de entidad. Lee Blob estático → inyecta horaActual →
// resuelve estado de plan → sanitiza para el LLM → devuelve JSON fresco.
//
// ── Fixes aplicados ───────────────────────────────────────────
// 1. now=horaActual / day_key=diaComercialActual → sustituidos por valores
//    reales (fix previo, ya en producción).
// 2. Orden: mind primero, meta/contracts al final (fix previo, ya en
//    producción). Desde el fix 8 solo aplica a la vista ?full=1.
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
//    bloque de huelga, o la entidad recibe instrucciones contradictorias.
// 7. FIX (08/09/2026): entidades demo (firestoreData.isDemo === true)
//    quedan exentas del sistema de plan por completo. Conceptualmente
//    una demo no tiene "cliente que paga" — no hay pago que pueda
//    vencer, así que "huelga por falta de pago" no aplica. Se resuelve
//    ACÁ (antes de llamar a resolvePlanStatus) para que sea imposible
//    que una demo entre en huelga sin importar qué diga plan.expires_at
//    en Firestore — no es un parche de "ponerle muchos días", es que
//    el chequeo directamente no corre para estas entidades.
// 8. SANITIZADOR (07/10/2026): el Blob es la versión de backend
//    (completa); lo que se expone por defecto es la versión para el
//    LLM, sin lo que solo le sirve al backend:
//      - meta, contracts y capabilities (bookkeeping; capabilities
//        repetía lo que ya dicen CANON y ⛔).
//      - el marcador ⦓LER:vX⦔ de la primera línea del mind.
//      - ruido dentro de context (modeloCierre, landing, isDemo,
//        entityType, rubro interno, id y coords de localidad) y
//        visual.available / visual.mode.
//    Se resuelve {{NOMBRE_COMERCIO}} en el mind (CORE lo traía literal)
//    y en channels.templates. mind_hash y mind_id viajan en headers
//    (X-Mind-Hash / X-Mind-Id) para no perder trazabilidad.
//    ?full=1 devuelve la vista completa (con meta, contracts,
//    capabilities y context sin podar), para cualquier consumidor que
//    no sea un LLM (miniapp, panel, debug). Mismo pipeline de hora y
//    plan en ambas vistas.
//    Se poda por lista negra, no por lista blanca: hay entityTypes
//    (soporte, prestador, profesional) con bloques propios en el
//    nivel raíz, y una lista blanca los borraría sin avisar.
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

// ── Sanitizador: constantes ───────────────────────────────────
const NAME_PLACEHOLDER = '{{NOMBRE_COMERCIO}}';
const LER_HEADER_RE = /^⦓LER:[^⦔]*⦔\r?\n?/;

// Claves de context que solo le sirven al backend. NO se tocan
// ia.comportamiento ni ia.contingencias: el LLM las usa como
// instrucciones directas (formatoRespuestas, sinPrecio, etc.).
const CONTEXT_NOISE_KEYS = ['entityType', 'modeloCierre', 'landing', 'isDemo'];

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

// ── Nombre legible para frases que ve el cliente ──────────────
// No usa sanitize() del builder: ese convierte espacios en "_"
// (como en @PizzaBot:Pizzeria_La_Esquina) y acá el nombre aparece
// dentro de frases como "acá te ayudo con {{NOMBRE_COMERCIO}}".
// Solo se quitan los caracteres que romperían la sintaxis LER o
// las comillas de redirigir("...").
function cleanName(raw) {
  return String(raw ?? '')
    .replace(/[⟦⟧⧦⧧⦓⦔"\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Reemplaza {{NOMBRE_COMERCIO}} dentro de un objeto JSON ────
function fillName(value, nombre) {
  if (value == null) return value;
  const escaped = JSON.stringify(nombre).slice(1, -1);
  return JSON.parse(JSON.stringify(value).split(NAME_PLACEHOLDER).join(escaped));
}

// ── Poda de context para la vista LLM ─────────────────────────
// Defensiva: la forma de context cambia según entityType.
function pruneContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return ctx;
  const out = { ...ctx };

  for (const k of CONTEXT_NOISE_KEYS) delete out[k];

  // rubro: queda solo el nombre (schema_org, requiere_*,
  // domain_confidence, tags, subcategoria son del backend).
  if (out.rubro && typeof out.rubro === 'object') {
    if (out.rubro.nombre) out.rubro = { nombre: out.rubro.nombre };
    else delete out.rubro;
  }

  // ubicacion.localidad: queda solo el nombre (id y coords están
  // en el backend; las coords ya viajan en SPACETIME del mind).
  if (out.ubicacion && typeof out.ubicacion === 'object') {
    const { localidad, ...restUbicacion } = out.ubicacion;
    out.ubicacion = {
      ...restUbicacion,
      ...(localidad?.nombre && { localidad: { nombre: localidad.nombre } }),
    };
  }

  return out;
}

// ── Poda de visual para la vista LLM ──────────────────────────
// available/mode son flags de backend; el LLM necesita la URL.
function pruneVisual(visual) {
  if (!visual || typeof visual !== 'object') return visual;
  const { available, mode, ...rest } = visual;
  return Object.keys(rest).length ? rest : undefined;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id inválido' });
  }

  // Vista completa (backend / miniapp / panel). Por defecto, vista LLM.
  const full = req.query.full === '1';

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
    //    {{NOMBRE_COMERCIO}} se resuelve con split/join (no replace)
    //    para reemplazar TODAS las apariciones y evitar que un
    //    nombre con "$&" o similar se interprete como patrón.
    const nombreVisible = cleanName(entity.context?.nombre) || 'este comercio';

    let mindResuelto = typeof entity.mind === 'string'
      ? entity.mind
          .replace('now=horaActual', `now=${horaActual}`)
          .replace(
            'day_key=diaComercialActual',
            diaComercialActual ? `day_key=${diaComercialActual}` : 'day_key=diaComercialActual'
          )
          .replace('hours_from_context', hoursToken)
          .replace('delivery_hours_from_context', deliveryToken)
          .split(NAME_PLACEHOLDER).join(nombreVisible)
      : entity.mind;

    // 6. Resolver estado de plan — en tiempo real, leyendo Firestore
    //    (firestoreData.plan), NO el Blob. Cierra el gap del cron.
    //    EXCEPCIÓN: entidades demo no tienen plan que pueda vencer —
    //    quedan exentas del sistema completo, sin importar qué diga
    //    plan.expires_at en Firestore. Ver nota 7 al inicio del archivo.
    const planStatus = firestoreData.isDemo === true
      ? { active: true, reason: 'demo_exempt' }
      : resolvePlanStatus(firestoreData.plan);

    // 7. Si está inactiva → recortar bloques operativos del mind
    //    (mini-app, cierre de pedido/servicio/contacto) ANTES de
    //    agregar el bloque de huelga. Sin esto, la entidad recibiría
    //    instrucciones contradictorias.
    if (!planStatus.active) {
      mindResuelto = stripOperationalBlocks(mindResuelto);
      mindResuelto = `${mindResuelto}${buildInactiveBlock(entity)}`;
    }

    // 8. Sanitizar y reensamblar. Vista LLM (default): sin meta,
    //    contracts, capabilities, marcador LER ni ruido de backend.
    //    Vista completa (?full=1): todo, con el bookkeeping al final.
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

    let mindOut = mindResuelto;
    if (!full && typeof mindOut === 'string') {
      mindOut = mindOut.replace(LER_HEADER_RE, '');
    }

    const contextOut  = full ? context : pruneContext(context);
    const visualOut   = full ? visual  : pruneVisual(visual);
    const channelsOut = fillName(channels, nombreVisible);

    const enriched = {
      mind: mindOut,
      context: contextOut,
      // goods/services/professional/visual se omiten completos si la
      // entidad está en huelga — la ausencia habla por sí sola, sin
      // necesidad de nombrar "catálogo" (vocabulario que no aplica a
      // todos los entityType) ni de dar la coordenada de la mini-app.
      ...(planStatus.active && goods        && { goods }),
      ...(planStatus.active && services     && { services }),
      ...(planStatus.active && professional && { professional }),
      ...(planStatus.active && visualOut    && { visual: visualOut }),
      // channels (contacto) se mantiene siempre — la salida de la
      // huelga es justamente que alguien se contacte.
      ...(channelsOut && { channels: channelsOut }),
      ...(full && capabilities && { capabilities }),
      ...resto,
      ...(full && { meta, contracts }),
    };

    // 9. Trazabilidad fuera del payload: el hash y el id del mind
    //    viajan en headers, no en el JSON que lee el LLM.
    if (meta?.mind_hash) res.setHeader('X-Mind-Hash', String(meta.mind_hash));
    if (meta?.mind_id)   res.setHeader('X-Mind-Id', String(meta.mind_id));

    // 10. Cache corto — la hora cambia cada minuto y el estado de plan
    //     puede cambiar en cualquier momento. (Vercel cachea por URL
    //     completa, así que ?full=1 y la vista LLM no se pisan.)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'X-Mind-Hash, X-Mind-Id');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(enriched);
  } catch (err) {
    console.error('[api/entity] Error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
