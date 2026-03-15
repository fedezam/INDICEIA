import { put } from '@vercel/blob';
import admin from 'firebase-admin';

// ─── Base URL del repo de templates ─────────────────────────────────────────
const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';
const PUBLIC_BASE_URL    = 'https://indiceia-public.vercel.app';

/**
 * Proceso autonomo de construccion del bloque visual.
 *
 * Flujo:
 * 1. Verifica que haya templateId y goods
 * 2. Fetch a template.txt del template elegido
 * 3. Reemplaza placeholders con datos reales
 * 4. Sube el HTML final a Vercel Blob (storage intermedio)
 * 5. Guarda la URL del blob en Firestore (la usa public-visual.js para re-servirla)
 * 6. Busca el slug en la colección landings
 * 7. Retorna artifact_url apuntando a indiceia-public /m/[slug] (renderizable en browser)
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

    // 2. Fetch al template base del repo
    const templateUrl = `${TEMPLATES_BASE_URL}/${templateId}/template.txt`;
    const res = await fetch(templateUrl);
    if (!res.ok) {
      console.warn(`No se pudo cargar el template ${templateId}:`, res.status);
      return null;
    }
    const templateHtml = await res.text();

    // 3. Reemplazar placeholders (regex global — por si aparecen más de una vez)
    const nombre    = context.nombre             || '';
    const whatsapp  = context.contacto?.whatsapp || '';
    const goodsJson = JSON.stringify(items);

    const html = templateHtml
      .replace(/\{\{NOMBRE_COMERCIO\}\}/g, nombre)
      .replace(/\{\{WHATSAPP\}\}/g,        whatsapp)
      .replace(/\{\{GOODS\}\}/g,           goodsJson);

    // 4. Subir a Vercel Blob (storage intermedio — lo consume public-visual.js)
    const blobPath = `entidades/${comercioId}/visual.html`;
    const { url: blobUrl } = await put(blobPath, html, {
      access:          'public',
      addRandomSuffix: false,
      contentType:     'text/html; charset=utf-8',
      token:           process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 5. Guardar blobUrl en Firestore — public-visual.js la fetchea para re-servirla
    const db = admin.firestore();
    await db.collection('comercios').doc(comercioId).update({
      visualHtmlUrl:     blobUrl,
      visualGeneratedAt: new Date().toISOString(),
      visualTemplateId:  templateId,
    });

    console.log('Visual generado para', comercioId, '→ blob:', blobUrl);

    // 6. Buscar el slug en landings para construir la URL pública
    const landingSnap = await db.collection('landings')
      .where('comercioId', '==', comercioId)
      .limit(1)
      .get();

    const slug = landingSnap.empty ? null : landingSnap.docs[0].id;

    const publicUrl = slug
      ? `${PUBLIC_BASE_URL}/m/${slug}`
      : blobUrl; // fallback al blob si el comercio todavía no tiene landing

    console.log('Visual público:', publicUrl);

    // 7. Retornar URL pública — el browser la renderiza como web ✅
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
