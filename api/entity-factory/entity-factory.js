// Endpoint oficial del Entity Factory
// Recibe comercioId + comercioData → devuelve entidad completa A+B+C

import { buildEntity } from './entity-factory/index.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { comercioId, comercioData } = req.body || {};

    if (!comercioId) {
      return res.status(400).json({ error: "Falta comercioId" });
    }

    if (!comercioData) {
      return res.status(400).json({ error: "Falta comercioData" });
    }

    // Construir entidad final A+B+C
    const entidad = await buildEntity({ comercioId, comercioData });

    return res.status(200).json({
      status: "ok",
      mensaje: "Entidad generada correctamente",
      entidad
    });

  } catch (err) {
    console.error("Error en /api/entity-factory:", err);
    return res.status(500).json({
      status: "error",
      error: err.message
    });
  }
}
