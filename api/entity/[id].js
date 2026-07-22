// /api/entity/[id].js
// ⟦ROLE⟧ Proxy de entidad. Lee Blob estático → inyecta horaActual → devuelve JSON fresco.
//
// ── Fix aplicado ──────────────────────────────────────────────
// 1. BUG REAL: antes, `horaActual`/`diaComercialActual` se agregaban como
//    campos sueltos al tope del JSON, pero el string `entity.mind` seguía
//    con el placeholder literal "now=horaActual" / "day_key=diaComercialActual"
//    sin sustituir. El LLM tenía que inferir la conexión por coincidencia
//    de nombre de variable, no por dato real. Ahora se sustituye adentro
//    del propio mind.
// 2. ORDEN: antes el spread servía `{horaActual, ...entity}`, que dejaba
//    meta/contracts (bookkeeping técnico, no cognitivo) antes que mind.
//    Ahora mind va primero — el LLM lee identidad antes que schema.
//    meta/contracts quedan al final: siguen disponibles para quien los
//    necesite (debug, tooling), pero ya no compiten por atención con
//    la identidad de la entidad.
// No se tocó entity-factory/index.js ni mind.builder.js — todo el fix
// vive acá, en el único lugar que ya tiene el dato real de la hora.
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

    // 4. Sustituir los placeholders reales dentro del mind (bug fix).
    //    Antes: el string traía literalmente "now=horaActual" y
    //    "day_key=diaComercialActual" sin reemplazar.
    const mindResuelto = typeof entity.mind === 'string'
      ? entity.mind
          .replace('now=horaActual', `now=${horaActual}`)
          .replace(
            'day_key=diaComercialActual',
            diaComercialActual ? `day_key=${diaComercialActual}` : 'day_key=diaComercialActual'
          )
      : entity.mind;

    // 5. Reensamblar en el orden en que el LLM debería leerlo:
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

    // 6. Cache corto — la hora cambia cada minuto
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(enriched);
  } catch (err) {
    console.error('[api/entity] Error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
