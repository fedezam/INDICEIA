import { put } from '@vercel/blob';
import admin from 'firebase-admin';

// ─── Base URL del repo de templates ─────────────────────────────────────────
const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';
const PUBLIC_BASE_URL    = 'https://indiceia-public.vercel.app';

/**
 * Fetch con fallback — devuelve el texto o null si no existe.
 */
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

/**
 * Compila src/index.html + src/style.css + src/script.js en un único HTML.
 */
async function compileTemplate(templateId) {
  const base = `${TEMPLATES_BASE_URL}/${templateId}/src`;

  const [html, css, js] = await Promise.all([
    fetchText(`${base}/index.html`),
    fetchText(`${base}/style.css`),
    fetchText(`${base}/script.js`),
  ]);

  if (!html) return null;

  let compiled = html;

  // Inyectar CSS inline
  if (css) {
    compiled = compiled.replace(
      /<\/head>/i,
      `  <style>\n${css}\n  </style>\n</head>`
    );
  }

  // Inyectar JS inline
  if (js) {
    compiled = compiled.replace(
      /<\/body>/i,
      `  <script>\n${js}\n  </script>\n</body>`
    );
  }

  return compiled;
}

/**
 * Proceso autónomo de construcción del bloque visual.
 */
export async function buildVisual(context, goods, comercioId) {
  try {
    // 1. Validaciones mínimas
    const templateId = context.templateId;
    if (!templateId) return null;

    const items = goods?.goods;
    if (!items || items.length === 0) return null;

    // 2. Compilar template
    const templateHtml = await compileTemplate(templateId);
    if (!templateHtml) {
      console.warn(`No se pudo cargar el template ${templateId}: 404`);
      return null;
    }

    // 3. Preparar datos
    const nombre        = context.nombre || '';
    const whatsapp      = context.contacto?.whatsapp || '';
    const deliveryCosto = context.entrega?.delivery?.costo?.valor ?? 'null';

    const goodsJson = JSON.stringify(items)
      .replace(/<\/script>/gi, '<\\/script>')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    // 4. Reemplazar placeholders básicos (SIN GOODS)
    let html = templateHtml
      .replace(/\{\{NOMBRE_COMERCIO\}\}/g, nombre)
      .replace(/\{\{WHATSAPP\}\}/g, whatsapp)
      .replace(/\{\{DELIVERY_COSTO\}\}/g, String(deliveryCosto));

    // 5. Inyectar DATA segura como JSON
    html = html.replace(
      /<\/body>/i,
      `<script id="__DATA__" type="application/json">${goodsJson}</script>\n</body>`
    );

    // 6. Subir a Vercel Blob
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

    console.log('Visual generado para', comercioId, '→ blob:', blobUrl);

    // 8. Resolver slug público
    const landingSnap = await db.collection('landings')
      .where('comercioId', '==', comercioId)
      .limit(1)
      .get();

    const slug = landingSnap.empty ? null : landingSnap.docs[0].id;

    const publicUrl = slug
      ? `${PUBLIC_BASE_URL}/m/${slug}`
      : blobUrl;

    console.log('Visual público:', publicUrl);

    // 9. Retorno final
    return {
      available:    true,
      mode:         'html',
      artifact_url: publicUrl,
    };

  } catch (err) {
    console.warn('No se pudo construir visual:', err.message);
    return null;
  }
}
