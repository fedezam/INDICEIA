// /api/generate-and-upload-entity/index.js
// Node Serverless – body correcto + overwrite blob

import { buildEntity } from '../entity-factory/index.js';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { comercioId } = req.body; // ⬅️ ESTA ES LA CLAVE

    if (!comercioId) {
      return res.status(400).json({ error: 'Falta comercioId' });
    }

    console.log('🔁 Actualizando entidad del comercio:', comercioId);

    // 1. Construir entidad (Block A real)
    const entity = await buildEntity({ comercioId });

    // 2. Serializar
    const json = JSON.stringify(entity, null, 2);

    // 3. Path fijo → overwrite
    const blobPath = `entidades/${comercioId}/entity.json`;

    const { url } = await put(blobPath, json, {
      access: 'public',
      addRandomSuffix: false, // ⬅️ overwrite real
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log('✅ Entidad escrita en:', url);

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
