import admin from 'firebase-admin';
import { hasData } from '../lib/entity-factory/utils/hasData.js';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ ok: false, error: 'slug requerido' });

  try {
    // 1. slug → comercioId
    const landingSnap = await db.collection('landings').doc(slug).get();
    if (!landingSnap.exists)
      return res.status(404).json({ ok: false, error: 'landing no encontrada' });

    const { comercioId } = landingSnap.data();

    // 2. comercioId → comercio
    const comercioRef  = db.collection('comercios').doc(comercioId);
    const comercioSnap = await comercioRef.get();
    if (!comercioSnap.exists)
      return res.status(404).json({ ok: false, error: 'comercio no encontrado' });

    const data = comercioSnap.data();

    // 3. productos
    const snapshot = await comercioRef.collection('productos').get();
    const goods = snapshot.empty ? [] : snapshot.docs
      .filter(doc => !doc.data().paused)
      .map(doc => {
        const p = doc.data();
        const imagenRaw = p.imagen || p.atributos?.url_imagen || null;
        const imagen = imagenRaw ? imagenRaw.replace(/ /g, '_') : null;
        return {
          id:           doc.id,
          nombre:       p.nombre,
          precio_final: p.precio_final,
          ...(hasData(p.codigo)         && { codigo: p.codigo }),
          ...(hasData(p.descripcion)    && { descripcion: p.descripcion }),
          ...(hasData(p.categoria)      && { categoria: p.categoria }),
          ...(hasData(p.subcategoria)   && { subcategoria: p.subcategoria }),
          ...(hasData(p.marca)          && { marca: p.marca }),
          ...(hasData(imagen)           && { imagen }),
          ...(hasData(p.stock)          && { stock: p.stock }),
          ...(hasData(p.disponibilidad) && { disponibilidad: p.disponibilidad }),
          ...(hasData(p.etiquetas)      && { etiquetas: p.etiquetas }),
          ...(hasData(p.variantes)      && { variantes: p.variantes }),
        };
      });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok:         true,
      nombre:     data.nombreComercio   || '',
      whatsapp:   data.whatsapp         || '',
      templateId: data.visualTemplateId || 'C1_SimpleCatalog',
      goods,
    });

  } catch (err) {
    console.error('[MINI-APP]', err);
    return res.status(500).json({ ok: false, error: 'error interno' });
  }
}
