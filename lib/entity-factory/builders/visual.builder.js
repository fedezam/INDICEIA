import { put } from '@vercel/blob';
import admin from 'firebase-admin';

// ─── Base URL del repo de templates ─────────────────────────────────────────
const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';

/**
 * Proceso autonomo de construccion del bloque visual.
 * No depende de nadie para ejecutarse.
 *
 * Flujo:
 * 1. Verifica que haya templateId y goods
 * 2. Fetch al artifact.txt del template elegido
 * 3. Reemplaza placeholders con datos reales
 * 4. Sube el HTML final a Vercel Blob como .txt
 * 5. Guarda la URL en Firestore
 * 6. Retorna el bloque visual para la entidad
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

    // 2. Fetch al template base del repo (.txt para recibir codigo fuente limpio)
    const templateUrl = `${TEMPLATES_BASE_URL}/${templateId}/artifact.txt`;
    const res = await fetch(templateUrl);
    if (!res.ok) {
      console.warn(`No se pudo cargar el template ${templateId}:`, res.status);
      return null;
    }
    const templateHtml = await res.text();

    // 3. Reemplazar placeholders
    const nombre    = context.nombre             || '';
    const whatsapp  = context.contacto?.whatsapp || '';
    const goodsJson = JSON.stringify(items);

    const html = templateHtml
      .replace('{{NOMBRE}}',     nombre)
      .replace("'{{WHATSAPP}}'", JSON.stringify(whatsapp))
      .replace('{{GOODS}}',      goodsJson);

    // 4. Subir a Vercel Blob como .txt
    const blobPath = `entidades/${comercioId}/visual.txt`;
    const { url } = await put(blobPath, html, {
      access:          'public',
      addRandomSuffix: false,
      contentType:     'text/plain; charset=utf-8',
      token:           process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 5. Guardar en Firestore
    const db = admin.firestore();
    await db.collection('comercios').doc(comercioId).update({
      visualHtmlUrl:     url,
      visualGeneratedAt: new Date().toISOString(),
      visualTemplateId:  templateId,
    });

    console.log('Visual generado para', comercioId, '->', url);

    // 6. Retornar bloque visual para la entidad
    return {
      available:    true,
      mode:         'artifact_html',
      artifact_url: url,
    };

  } catch (err) {
    console.warn('No se pudo construir visual:', err.message);
    return null;
  }
}
