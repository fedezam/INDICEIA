// /api/generate-and-upload-entity/index.js

import { buildEntity } from '../entity-factory/index.js';
import { put } from '@vercel/blob';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { comercioId } = await req.json();
    if (!comercioId) {
      return new Response('Falta comercioId', { status: 400 });
    }

    const entity = await buildEntity({ comercioId });
    const json = JSON.stringify(entity, null, 2);

    const { url } = await put(
      `test/${comercioId}-A.json`,
      json,
      {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    return new Response(
      JSON.stringify({ ok: true, url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('CRASH:', err);
    return new Response(err.message, { status: 500 });
  }
}

