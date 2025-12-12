// /api/export-json.js
// Exportador oficial: usa Entity Factory (A+B+C) y actualiza URL única del comercio.

import { getFirestore } from '../src/firebase.js';
import { buildEntity } from './entity-factory/index.js';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    const { comercioId } = req.query;

    if (!comercioId) {
      return res.status(400).json({ error: "Falta comercioId" });
    }

    const db = getFirestore();

    // 1) Obtener datos del comercio
    const comercioRef = db.collection('comercios').doc(comercioId);
    const comercioSnap = await comercioRef.get();

    if (!comercioSnap.exists) {
      return res.status(404).json({ error: "Comercio no encontrado" });
    }

    const comercioData = comercioSnap.data();

    // 2) Generar entidad final A+B+C con Entity Factory
    const entityJSON = await buildEntity({
      comercioId,
      comercioData
    });

    const jsonString = JSON.stringify(entityJSON, null, 2);

    // 3) SUBIR JSON AL BLOB (siempre MISMA URL → overwrite)
    const fileName = `comercios/${comercioId}/entity.json`;

    const blob = await put(fileName, jsonString, {
      access: "public",
      addRandomSuffix: false,  // <<< clave para mantener URL fija
    });

    // 4) Guardar URL en Firestore
    await comercioRef.update({
      entityUrl: blob.url,
      entityUpdatedAt: new Date().toISOString()
    });

    // 5) Responder
    return res.status(200).json({
      status: "ok",
      url: blob.url
    });

  } catch (err) {
    console.error("export-json ERROR:", err);
    return res.status(500).json({
      error: "Error interno",
      details: err.message
    });
  }
}

