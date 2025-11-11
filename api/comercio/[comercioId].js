// api/comercio/[comercioId].js
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const { comercioId } = req.query;

  if (!comercioId) {
    return res.status(400).json({ error: 'comercioId is required' });
  }

  try {
    // 🔹 Buscar blobs que empiecen con bots/{comercioId}-
    const { blobs } = await list({ prefix: `bots/${comercioId}-` });

    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // 🔹 Ordenar por fecha de subida (más reciente primero)
    const sorted = blobs.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    const latest = sorted[0];

    // 🔹 Descargar el contenido JSON del blob
    const response = await fetch(latest.url);
    if (!response.ok) {
      throw new Error(`Blob fetch failed with status ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Blob content is not valid JSON');
    }

    // 🔹 Responder con el contenido del bot
    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Error fetching bot:', error);
    return res.status(500).json({
      error: 'Failed to fetch bot',
      details: error.message,
    });
  }
}
