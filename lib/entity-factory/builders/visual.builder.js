// lib/entity-factory/builders/visual.builder.js
// ⟦ROLE⟧ Compila el visual.html del comercio para el template.
// Lee productos DIRECTO de Firestore — NO usa goods.builder.
// Los datos van al template tal como están en la DB.

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

// templateId se recibe explícito — ya no vive en context
export async function buildVisual(context, comercioRef, comercioId, slug = null, templateId = null) {
  try {
    if (!templateId) {
      console.warn('[visual-builder] ⚠️ No hay templateId — skipping');
      return null;
    }

    // ── LEER PRODUCTOS DIRECTO DE FIRESTORE ──────────────────
    // No usamos goods.builder — necesitamos los datos crudos tal como
    // los espera el template: nombre, precio_final, categoria, imagen, variantes
    const snap = await comercioRef.collection('productos').get();
    const items = snap.empty
      ? []
      : snap.docs.map(d => d.data()).filter(p => !p.paused);

    const isPrestador = context.entityType === 'prestador';
    if (!isPrestador && items.length === 0) {
      console.warn('[visual-builder] ⚠️ Sin productos activos — skipping');
      return null;
    }

    // ── COMPILAR TEMPLATE ─────────────────────────────────────
    let html = await compileTemplate(templateId);
    if (!html) {
      console.warn('[visual-builder] ⚠️ No se pudo compilar el template:', templateId);
      return null;
    }
    console.log('[visual-builder] html length:', html?.length);
    console.log('[visual-builder] __DATA__ match:', html?.includes('__DATA__'));
    console.log('[visual-builder] items count:', items.length);

    // ── DATOS ─────────────────────────────────────────────────
    const nombre   = context.nombre || '';
    const whatsapp = context.contacto?.whatsapp || '';
    const entrega  = context.entrega || null;

    const profile = {
      especialidad: context.especialidad || '',
      descripcion:  context.descripcion  || '',
      experiencia:  context.experiencia  || '',
      ubicacion:    context.ubicacion    || {},
      contacto:     context.contacto     || {},
      horarios:     context.horarios     || {},
      galeria:      context.galeria      || [],
    };

    // ── JSON SEGURO ───────────────────────────────────────────
    const safify = (obj) => JSON.stringify(obj)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    // ── REEMPLAZOS ────────────────────────────────────────────
    html = html
      .replace(/\{\{NOMBRE_COMERCIO\}\}/g, nombre)
      .replace(/\{\{WHATSAPP\}\}/g,        whatsapp)
      .replace(/\{\{GOODS\}\}/g,           safify(items))
      .replace(/\{\{SERVICES\}\}/g,        safify([]))
      .replace(/\{\{PROFILE\}\}/g,         safify(profile));

    // ── INYECTAR DATA ─────────────────────────────────────────
    const safeData = safify({ nombre, whatsapp, goods: items, entrega });
    html = html.replace(
      /<script id="__DATA__"[^>]*><\/script>/,
      `<script id="__DATA__" type="application/json">${safeData}</script>`
    );

    // ── SUBIR A BLOB ──────────────────────────────────────────
    const blobPath = `entidades/${comercioId}/visual.html`;
    const { url: blobUrl } = await put(blobPath, html, {
      access:          'public',
      addRandomSuffix: false,
      contentType:     'text/html; charset=utf-8',
      token:           process.env.BLOB_READ_WRITE_TOKEN,
    });

    // ── URL PÚBLICA ───────────────────────────────────────────
    const publicUrl = slug ? `${PUBLIC_BASE_URL}/m/${slug}` : null;

    // ── GUARDAR EN FIRESTORE ──────────────────────────────────
    const db = admin.firestore();
    await db.collection('entidades').doc(comercioId).update({
      visualHtmlUrl:     blobUrl,
      visualPublicUrl:   publicUrl,
      visualGeneratedAt: new Date().toISOString(),
      visualTemplateId:  templateId,
    });

    console.log('[visual-builder] ✅ visual.html subido →', blobUrl);

    return {
      available:    !!publicUrl,
      mode:         'html',
      mini_app_url: publicUrl,
    };

  } catch (err) {
    console.error('[visual-builder] ❌ Error:', err);
    return null;
  }
}
