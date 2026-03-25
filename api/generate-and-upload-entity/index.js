// /api/generate-and-upload-entity/index.js
import { buildEntity } from '../entity-factory/index.js';
import { put } from '@vercel/blob';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { comercioId } = req.body;
    if (!comercioId || typeof comercioId !== 'string') {
      return res.status(400).json({ error: 'comercioId inválido' });
    }

    console.log('Generando entidad para:', comercioId);

    // Resolver slug ANTES de buildEntity
    const landingSnap = await db.collection('landings')
      .where('comercioId', '==', comercioId)
      .limit(1)
      .get();
    const slug = landingSnap.empty ? null : landingSnap.docs[0].id;

    const entity = await buildEntity({ comercioId, slug });
    const jsonString = JSON.stringify(entity, null, 2);

    const blobPath = `entidades/${comercioId}/entity.json`;
    const { url } = await put(blobPath, jsonString, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    await db.collection('entidades').doc(comercioId).update({
      entityPublicUrl: url,
      entityGeneratedAt: new Date().toISOString(),
    });

    console.log('Entidad completa para', comercioId, '→', url);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Error en generate-and-upload-entity:', err);
    return res.status(500).json({ error: 'Falló la generación pública' });
  }
}
