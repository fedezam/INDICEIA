// api/comercio/[comercioId].js
import { Blob } from '@vercel/blob';

export default async function handler(req, res) {
  const { comercioId } = req.query;

  if (!comercioId) return res.status(400).json({ error: 'comercioId is required' });

  try {
    const { blobs } = await Blob.list(`bots/${comercioId}-`);
    const latest = blobs.sort((a, b) => b.uploadedAt - a.uploadedAt)[0];

    if (!latest) return res.status(404).json({ error: 'Bot not found' });

    const response = await fetch(latest.url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bot', details: error.message });
  }
}
