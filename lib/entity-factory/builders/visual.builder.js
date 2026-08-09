// lib/entity-factory/builders/visual.builder.js
// ⟦ROLE⟧ Compila el visual.html del comercio para el template.
// Lee productos DIRECTO de Firestore — NO usa goods.builder.
// Los datos van al template tal como están en la DB.
// ⟦DIRTY STATE⟧ Computa hash de { nombre, whatsapp, goods, entrega, templateId }.
// Si el hash no cambió respecto al guardado en Firestore → skip upload.

import { put }    from '@vercel/blob';
import { createHash } from 'crypto';
import admin from 'firebase-admin';

const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';
const PUBLIC_BASE_URL    = 'https://ia.indiceia.dev';

// ── HASH ──────────────────────────────────────────────────────
// Cubre exactamente los datos que se inyectan en el template.
// templateId incluido — si cambia el template, hay que regenerar.
function computeVisualHash({ nombre, whatsapp, entrega, items, templateId }) {
  const payload = JSON.stringify({ nombre, whatsapp, entrega, items, templateId });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

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
export async function buildVisual(context, comercioRef, comercioId, slug = null, templateId = null, savedData = {}) {
  try {
    if (!templateId) return null;

    // ── LEER PRODUCTOS DIRECTO DE FIRESTORE ──────────────────
    const snap = await comercioRef.collection('productos').get();
    const items = snap.empty
      ? []
      : snap.docs.map(d => d.data()).filter(p => !p.paused);

    const isPrestador = context.entityType === 'prestador';
    if (!isPrestador && items.length === 0) {
      console.warn('[visual-builder] ⚠️ Sin productos activos — skipping');
      return null;
    }

    // ── DATOS ─────────────────────────────────────────────────
    const nombre   = context.nombre || '';
    const whatsapp = context.contacto?.whatsapp || '';
    const entrega  = context.entrega || null;

    // ── DIRTY STATE CHECK ─────────────────────────────────────
    const currentHash  = computeVisualHash({ nombre, whatsapp, entrega, items, templateId });
    const savedHash    = savedData.visualHash || null;
    const existingUrl  = savedData.visualHtmlUrl || null;
    const publicUrl    = slug ? `${PUBLIC_BASE_URL}/m/${slug}` : null;

    if (savedHash && savedHash === currentHash && existingUrl) {
      console.log('[visual-builder] ✅ Sin cambios (hash igual) — skip upload');
      return {
        available:    !!publicUrl,
        mode:         'html',
        mini_app_url: publicUrl,
      };
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

    // ── GUARDAR EN FIRESTORE (con nuevo hash) ─────────────────
    const db = admin.firestore();
    await db.collection('entidades').doc(comercioId).update({
      visualHtmlUrl:     blobUrl,
      visualPublicUrl:   publicUrl,
      visualGeneratedAt: new Date().toISOString(),
      visualTemplateId:  templateId,
      visualHash:        currentHash,   // ← persiste el hash para la próxima comparación
    });

    console.log('[visual-builder] ✅ visual.html subido →', blobUrl, '| hash:', currentHash);

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
