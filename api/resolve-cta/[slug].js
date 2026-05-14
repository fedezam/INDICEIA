// ============================================================
// indiceia/api/resolve-cta/[slug].js
// ============================================================
import admin from 'firebase-admin';
import { buildPrompt } from '../../lib/link-builder/config/prompt-template.js';
import { hasData } from '../../lib/entity-factory/utils/hasData.js';

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
    const landingSnap = await db.collection('landings').doc(slug).get();
    if (!landingSnap.exists) return res.status(404).json({ ok: false, error: 'landing no encontrada' });

    const { comercioId } = landingSnap.data();

    const comercioRef  = db.collection('entidades').doc(comercioId);
    const comercioSnap = await comercioRef.get();
    if (!comercioSnap.exists) return res.status(404).json({ ok: false, error: 'comercio no encontrado' });

    const data = comercioSnap.data();
    if (!data.entityPublicUrl) return res.status(409).json({ ok: false, error: 'entidad no generada' });

    // ── miniPrompt ──
    const context = {
      nombre:     data.nombreComercio,
      entityType: data.entityType || 'comercio',
      ubicacion:  data.ubicacion  || {},
    };
    const entityUrl = `https://indiceia.vercel.app/api/entity/${comercioId}`;
    const miniPrompt = buildPrompt(context, data.entityPublicUrl);

    // ── goods ──
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

    return res.status(200).json({
      ok:              true,
      slug,
      comercioId,
      nombreComercio:  data.nombreComercio,
      descripcion:     data.descripcion     || '',
      entityPublicUrl: data.entityPublicUrl,
      seoHtmlUrl:      data.seoHtmlUrl      || null,
      visualHtmlUrl:   data.visualHtmlUrl   || null,
      miniPrompt,
      // ── mini app ──
      whatsapp:        data.whatsapp        || '',
      templateId:      data.visualTemplateId || 'C1_SimpleCatalog',
      goods,
    });

  } catch (err) {
    console.error('[RESOLVE-CTA]', err);
    return res.status(500).json({ ok: false, error: 'error interno' });
  }
}
