// /api/generate-and-upload-entity/index.js
// Handler serverless: genera entidad + sube/sobreescribe blob

import { buildEntity } from '../entity-factory/index.js';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { comercioId } = req.body;

    // Validación
    if (!comercioId || typeof comercioId !== 'string' || comercioId.trim() === '') {
      return res.status(400).json({ error: 'Falta comercioId válido' });
    }

    console.log('🔁 Generando y actualizando entidad para:', comercioId);

    // 1. Construir la entidad completa (A + B proyectado desde Firestore + C)
    const entity = await buildEntity({ comercioId });

    // 2. Serializar con formato legible
    const jsonString = JSON.stringify(entity, null, 2);

    // 3. Path fijo por comercio → siempre sobreescribe el mismo archivo
    const blobPath = `entidades/${comercioId}/entity.json`;

    // 4. Subir a Vercel Blob (overwrite garantizado)
    const { url } = await put(blobPath, jsonString, {
      access: 'public',
      addRandomSuffix: false,                  // ← clave para overwrite
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN // recomendado en Vercel
    });

    console.log('✅ Entidad actualizada en:', url);

    // Respuesta al dashboard
    return res.status(200).json({
      ok: true,
      url,
      message: 'Entidad generada y guardada con éxito'
    });

  } catch (err) {
    console.error('❌ Error generando/subiendo entidad:', err);
    return res.status(500).json({
      error: err.message || 'Error interno al generar la entidad'
    });
  }
}
