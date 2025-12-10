// /api/entity-factory/index.js
// ÍndiceIA — Entity Factory v1.0 (A+B+C → JSON → Vercel Blob)

import { put } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Only POST allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // -----------------------------------------------------
    // 1. Leer body A+B+C
    // -----------------------------------------------------
    const body = await req.json();
    const { A, B, C } = body;

    if (!A || !B) {
      return new Response(JSON.stringify({
        error: 'Missing required blocks A or B'
      }), { status: 400 });
    }

    // -----------------------------------------------------
    // 2. Ensamblar JSON final
    // -----------------------------------------------------
    const entity = {
      meta: {
        version: "1.0.0",
        ensamblado: new Date().toISOString()
      },
      A,
      B,
      C: C || null
    };

    const jsonString = JSON.stringify(entity, null, 2);

    // -----------------------------------------------------
    // 3. Subir a Vercel Blob
    // -----------------------------------------------------
    const fileName =
      `entity-${A?.meta?.nombre || 'comercio'}-${Date.now()}.json`;

    const { url } = await put(fileName, jsonString, {
      access: 'public',
      addRandomSuffix: false
    });

    // -----------------------------------------------------
    // 4. Devolver URL final
    // -----------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        entityUrl: url,
        fileName,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error("Entity Factory error:", err);

    return new Response(JSON.stringify({
      error: true,
      message: err.message || 'Unknown error in Entity Factory'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
