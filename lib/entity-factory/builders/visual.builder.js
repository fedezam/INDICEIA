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
 * Replica la lógica de compile.js pero en runtime.
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
  if (css) compiled = compiled.replace(/<\/head>/i, `  <style>\n${css}\n  </style>\n</head>`);
  if (js)  compiled = compiled.replace(/<\/body>/i, `  <script>\n${js}\n  </script>\n</body>`);

  return compiled;
}

/**
 * Proceso autonomo de construccion del bloque visual.
 *
 * Flujo:
 * 1. Verifica que haya templateId y goods
 * 2. Fetchea y compila src/ del template elegido (index.html + style.css + script.js)
 * 3. Reemplaza placeholders con datos reales
 * 4. Sube el HTML final a Vercel Blob
 * 5. Guarda la URL del blob en Firestore
 * 6. Busca el slug en la colección landings
 * 7. Retorna artifact_url apuntando a indiceia-public /m/[slug]
 *
 * @param {object} context    - Bloque context (nombre, contacto, templateId)
 * @param {object} goods      - Bloque goods ({ goods: [] })
 * @param {string} comercioId - ID del comercio
 * @returns {object|null}
 */
export async function buildVisual(context, goods, comercioId) {
  try {
    // 1. Validaciones minimas
    const templateId = context.templateId;
    if (!templateId) return null;
    const items = goods?.goods;
    if (!items || items.length === 0) return null;

    // 2. Compilar src/ del template en runtime
    const templateHtml = await compileTemplate(templateId);
    if (!templateHtml) {
      console.warn(`No se pudo cargar el template ${templateId}: 404`);
      return null;
    }

    // 3. Reemplazar placeholders
    const nombre       = context.nombre             || '';
    const whatsapp     = context.contacto?.whatsapp || '';
    const goodsJson    = JSON.stringify(items);
    const deliveryCosto = context.entrega?.delivery?.costo != null 
      ? Number(context.entrega.delivery.costo) 
      : 'null';

    const html = templateHtml
      .replace(/\{\{NOMBRE_COMERCIO\}\}/g,  nombre)
      .replace(/\{\{WHATSAPP\}\}/g,         whatsapp)
      .replace(/\{\{GOODS\}\}/g,            goodsJson)
      .replace(/\{\{DELIVERY_COSTO\}\}/g,   String(deliveryCosto));

    // 4. Subir a Vercel Blob
    const blobPath = `entidades/${comercioId}/visual.html`;
    const { url: blobUrl } = await put(blobPath, html, {
      access:          'public',
      addRandomSuffix: false,
      contentType:     'text/html; charset=utf-8',
      token:           process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 5. Guardar blobUrl en Firestore
    const db = admin.firestore();
    await db.collection('comercios').doc(comercioId).update({
      visualHtmlUrl:     blobUrl,
      visualGeneratedAt: new Date().toISOString(),
      visualTemplateId:  templateId,
    });
    console.log('Visual generado para', comercioId, '→ blob:', blobUrl);

    // 6. Buscar el slug en landings
    const landingSnap = await db.collection('landings')
      .where('comercioId', '==', comercioId)
      .limit(1)
      .get();
    const slug = landingSnap.empty ? null : landingSnap.docs[0].id;
    const publicUrl = slug
      ? `${PUBLIC_BASE_URL}/m/${slug}`
      : blobUrl;
    console.log('Visual público:', publicUrl);

    // 7. Retornar URL pública
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
