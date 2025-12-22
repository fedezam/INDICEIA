import { buildEntity } from '../entity-factory/index.js';
import { put } from '@vercel/blob';
import { db } from '../../firebase-server.js';
import { doc, updateDoc } from 'firebase/firestore';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { comercioId, comercioData } = await req.json();

  if (!comercioId || !comercioData) {
    return new Response('Datos incompletos', { status: 400 });
  }

  try {
    // 1. Armar entidad oficial
    const entity = await buildEntity({ comercioId, comercioData });

    // 2. Serializar
    const json = JSON.stringify(entity, null, 2);

    // 3. Subir a Vercel Blob
    const filename = `entidades/${comercioId}/entity-v1.json`;
    const { url } = await put(filename, json, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    // 4. Guardar URL en Firestore
    const ref = doc(db, 'comercios', comercioId);
    await updateDoc(ref, {
      entidadBlobUrl: url,
      entidadVersion: '1.0.0',
      entidadGeneradaAt: new Date().toISOString()
    });

    return new Response(JSON.stringify({ blobUrl: url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(err);
    return new Response('Error interno', { status: 500 });
  }
}
