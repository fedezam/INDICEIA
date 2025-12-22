// /api/generate-and-upload-entity/index.js
// Update real – sobrescribe blob existente

import { buildEntity } from '../entity-factory/index.js';
import { put } from '@vercel/blob';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { comercioId } = body;

    if (!comercioId) {
      return new Response('Falta comercioId', { status: 400 });
    }

    console.log('🔁 Actualizando entidad del comercio:', comercioId);

    // 1. Construir entidad (Block A real)
    const entity = await buildEntity({ comercioId });

    // 2. Serializar
    const json = JSON.stringify(entity, null, 2);

    // 3. MISMO PATH SIEMPRE → overwrite
    const blobPath = `entidades/${comercioId}/entity.json`;

    const { url } = await put(blobPath, json, {
      access: 'public',
      addRandomSuffix: false, // ⬅️ CLAVE: sobrescribe
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log('✅ Entidad actualizada en:', url);

    return new Response(
      JSON.stringify({ ok: true, url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('❌ CRASH:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}

