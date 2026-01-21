// INDICEIA/api/public-landing-event.js
import { db } from '../src/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = req.body;

  if (!data?.comercioId || !data?.event) {
    return res.status(400).json({ error: 'comercioId y event son obligatorios' });
  }

  try {
    const ref = collection(db, 'stats', data.comercioId, 'events');

    await addDoc(ref, {
      event: data.event,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      device: data.device || 'unknown',
      browser: data.browser || 'unknown',
      referrer: data.referrer || 'direct',
      fingerprint: data.fingerprint || null
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error escribiendo evento:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
