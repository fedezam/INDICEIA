// lib/entity-factory/builders/visual.builder.js
import { put } from '@vercel/blob';
import admin from 'firebase-admin';

const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';
const PUBLIC_BASE_URL    = 'https://indiceia-public.vercel.app';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

async function compileTemplate(templateId) {
  const base = `${TEMPLATES_BASE_URL}/${templateId}/src`;
  const [html, css] = await Promise.all([
    fetchText(`${base}/index.html`),
    fetchText(`${base}/style.css`),
  ]);
  if (!html) return null;

  let compiled = html;
  if (css) {
    compiled = compiled.replace(
      /<\/head>/i,
      `<style>\n${css}\n</style>\n</head>`
    );
  }
  return compiled;
}

export async function buildVisual(context, goods, comercioId) {
  try {
    const templateId = context.templateId;
    if (!templateId) return null;

    const items = goods?.goods;
    if (!items || items.length === 0) return null;

    // 1. Compilar template (solo HTML + CSS inline)
    let html = await compileTemplate(templateId);
    if (!html) return null;

    // 2. Datos
    const nombre   = context.nombre || '';
    const whatsapp = context.contacto?.whatsapp || '';
    const entrega  = context.entrega || null;

    // 3. JSON seguro — sin base64
    const safeData = JSON.stringify({ nombre, whatsapp, goods: items, entrega })
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    // 4. Reemplazos de placeholders
    html = html
      .replace(/\{\{NOMBRE_COMERCIO\}\}/g, nombre)
      .replace(/\{\{WHATSAPP\}\}/g, whatsapp);

    // 5. Inyectar DATA en el tag vacío que ya existe en el template
    html = html.replace(
      /<script id="__DATA__"[^>]*><\/script>/,
      `<script id="__DATA__" type="application/json">${safeData}</script>`
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
    const publicUrl = slug ? `${PUBLIC_BASE_URL}/m/${slug}` : blobUrl;

    return {
      available:    true,
      mode:         'html',
      artifact_url: publicUrl,
    };

  } catch (err) {
    console.error('buildVisual error:', err);
    return null;
  }
}
