// /api/generate-and-upload-entity/index.js

import { buildEntity } from '../entity-factory/index.js';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { comercioId } = req.body || {};

    if (!comercioId) {
      return res.status(400).json({ error: 'Falta comercioId' });
    }

    console.log('🔹 Generando entidad para:', comercioId);

    // 1. Construir entidad (A-only)
    const entity = await buildEntity({ comercioId });

    // 2. Serializar
    const json = JSON.stringify(entity, null, 2);

    // 3. Subir a Vercel Blob
    const { url } = await put(
      `test/${comercioId}-A.json`,
      json,
      {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    console.log('✅ Subido OK:', url);

    return res.status(200).json({
      ok: true,
      url
    });

  } catch (err) {
    console.error('❌ CRASH:', err);
    return res.status(500).json({
      error: err.message
    });
  }
}
