// /api/entity-factory.js
// Endpoint oficial — ÍndiceIA v1.0
// Recibe comercioId y devuelve la entidad completa generada

import { buildEntity } from './entity-factory/index.js';

export default async function handler(req, res) {
  try {
    const { comercioId } = req.query;

    if (!comercioId) {
      return res.status(400).json({
        error: "Falta el parámetro comercioId."
      });
    }

    const entityJSON = await buildEntity(comercioId);

    return res.status(200).json(entityJSON);

  } catch (error) {
    console.error("[EntityFactory] Error:", error);

    return res.status(500).json({
      error: "No se pudo generar la entidad."
    });
  }
}
