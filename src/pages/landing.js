// /api/link-builder.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!global._firebaseAdmin) {
  global._firebaseAdmin = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN))
  });
}

const db = getFirestore();

// ==============================
// HANDLER
// ==============================
export default async function handler(req, res) {
  try {
    const { action } = req.method === 'GET' ? req.query : req.body;

    switch (action) {
      case 'log_interaction':
        return logInteraction(req, res);

      case 'resolve_link':
        return resolveLink(req, res);

      case 'get_stats':
        return getStats(req, res);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    console.error('[LINK-BUILDER]', err);
    res.status(500).json({ error: 'internal_error' });
  }
}

// ==============================
// ACTIONS
// ==============================
async function logInteraction(req, res) {
  const { comercio_id, type, ts, user_agent } = req.body;

  if (!comercio_id || !type) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  await db
    .collection('stats')
    .add({
      comercio_id,
      type,
      user_agent: user_agent || null,
      created_at: Timestamp.fromMillis(ts || Date.now())
    });

  res.json({ ok: true });
}

// ------------------------------

async function resolveLink(req, res) {
  const { comercio_id } = req.query;

  if (!comercio_id) {
    return res.status(400).json({ error: 'missing_comercio_id' });
  }

  res.json({
    comercio_id,
    landing_url: `/bot/${comercio_id}`,
    api_bot_url: `/api/bot/${comercio_id}`
  });
}

// ------------------------------

async function getStats(req, res) {
  const { comercio_id } = req.query;

  if (!comercio_id) {
    return res.status(400).json({ error: 'missing_comercio_id' });
  }

  const snap = await db
    .collection('stats')
    .where('comercio_id', '==', comercio_id)
    .get();

  const stats = {
    landing_view: 0,
    talk_click: 0,
    chat_open: 0
  };

  snap.forEach(doc => {
    const { type } = doc.data();
    if (stats[type] !== undefined) stats[type]++;
  });

  res.json(stats);
}
