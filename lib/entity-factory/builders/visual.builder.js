import { put } from '@vercel/blob';
import admin from 'firebase-admin';

// ─── Base URLs ────────────────────────────────────────────────
const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';
const PUBLIC_BASE_URL    = 'https://indiceia-public.vercel.app';

// ─── Fetch helper ─────────────────────────────────────────────
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

// ─── Compile template ─────────────────────────────────────────
async function compileTemplate(templateId) {
  const base = `${TEMPLATES_BASE_URL}/${templateId}/src`;

  const [html, css, js] = await Promise.all([
    fetchText(`${base}/index.html`),
    fetchText(`${base}/style.css`),
    fetchText(`${base}/script.js`),
  ]);

  if (!html) return null;

  let compiled = html;

  // CSS inline
  if (css) {
    compiled = compiled.replace(
      /<\/head>/i,
      `<style>\n${css}\n</style>\n</head>`
    );
  }

  // JS inline
  if (js) {
    compiled = compiled.replace(
      /<\/body>/i,
      `<script>\n${js}\n</script>\n</body>`
    );
  }

  return compiled;
}

// ─── Builder ──────────────────────────────────────────────────
export async function buildVisual(context, goods, comercioId) {
  try {
    const templateId = context.templateId;
    if (!templateId) return null;

    const items = goods?.goods;
    if (!items || items.length === 0) return null;

    // 1. Compilar template
    let html = await compileTemplate(templateId);
    if (!html) return null;

    // 2. Datos
    const nombre        = context.nombre || '';
    const whatsapp      = context.contacto?.whatsapp || '';
    const deliveryCosto = context.entrega?.delivery?.costo?.valor ?? null;

    // 3. JSON → BASE64
    const goodsJson = JSON.stringify(items)
      .replace(/<\/script>/gi, '<\\/script>')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    const encoded = Buffer.from(goodsJson, 'utf-8').toString('base64');

    // 4. Reemplazos
    html = html
      .replace(/\{\{NOMBRE_COMERCIO\}\}/g, nombre)
      .replace(/\{\{WHATSAPP\}\}/g, whatsapp)
      .replace(/\{\{DELIVERY_COSTO\}\}/g, deliveryCosto === null ? 'null' : String(deliveryCosto));

    // 5. Inyectar DATA
    html = html.replace(
      '</body>',
      `<script id="__DATA__" type="application/json">${encoded}</script></body>`
    );

    // 6. Subir a Blob
    const blobPath = `entidades/${comercioId}/visual.html`;

    const { url: blobUrl } = await put(blobPath, html, {
      access:          'public',
      addRandomSuffix: false,
      contentType:     'text/html; charset=utf-8',
      token:           process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 7. Guardar en Firestore
    const db = admin.firestore();

    await db.collection('comercios').doc(comercioId).update({
      visualHtmlUrl:     blobUrl,
      visualGeneratedAt: new Date().toISOString(),
      visualTemplateId:  templateId,
    });

    // 8. Resolver slug
    const landingSnap = await db.collection('landings')
      .where('comercioId', '==', comercioId)
      .limit(1)
      .get();

    const slug = landingSnap.empty ? null : landingSnap.docs[0].id;

    const publicUrl = slug
      ? `${PUBLIC_BASE_URL}/m/${slug}`
      : blobUrl;

    return {
      available: true,
      mode: 'html',
      artifact_url: publicUrl,
    };

  } catch (err) {
    console.error('buildVisual error:', err);
    return null;
  }
}
