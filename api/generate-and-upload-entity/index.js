// /api/generate-and-upload-entity/index.js
import { buildEntity } from '../entity-factory/index.js';
import { buildIndex } from '../../lib/entity-factory/builders/index.builder.js';
import { enrichAndSaveCityIndex } from '../../lib/entity-factory/enrich-index.builder.js';
import { normalizeEntityData } from '../../lib/entity-factory/normalizers/normalizeEntityData.js'; // ← NUEVO
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

    // 1. Leer datos crudos de Firestore y normalizar
    const comercioSnap = await db.collection('entidades').doc(comercioId).get();
    if (!comercioSnap.exists) {
      return res.status(404).json({ error: 'Comercio no encontrado' });
    }
    const rawData = normalizeEntityData(comercioSnap.data()); // ← CAMBIO: era comercioSnap.data()

    // 2. Slug desde rawData — fuente de verdad única
    const slug = rawData.landing?.slug || null;

    // 3. Generar entidad completa
    const entity = await buildEntity({ comercioId });
    const jsonString = JSON.stringify(entity, null, 2);

    // 4. Subir entity.json a Blob
    const blobPath = `entidades/${comercioId}/entity.json`;
    const { url } = await put(blobPath, jsonString, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 5. Actualizar índice de ciudad con datos normalizados
    const indexResult = await buildIndex(
      rawData,
      comercioId,
      entity.goods,
      entity.services
    );

    // 6. Enriquecer relaciones si el índice se actualizó
    if (indexResult?.url) {
      try {
        const baseIndex = indexResult.indice;
        await enrichAndSaveCityIndex(
          baseIndex,
          indexResult.pais,
          indexResult.provincia,
          indexResult.ciudad
        );
        console.log(`[entity-factory] ✅ Índice enriquecido: ${indexResult.ciudad} (${indexResult.total} nodos)`);
      } catch (enrichErr) {
        console.warn('[entity-factory] ⚠️ Enriquecimiento falló (no crítico):', enrichErr.message);
      }
    }

    // 7. Registrar en Firestore
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
