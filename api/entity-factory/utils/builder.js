import { readFile } from 'fs/promises';
import path from 'path';
import { uploadJSON } from './uploader.js';

const schemaPath = path.resolve('api/entity-factory/schema');

export async function buildEntity(blockB) {
  try {
    // ============================
    // Validación básica de B
    // ============================
    if (!blockB || typeof blockB !== 'object') {
      throw new Error('Bloque B inválido.');
    }

    // ============================
    // 1. Cargar A
    // ============================
    const blockAPath = path.join(schemaPath, 'blockA.json');
    const blockA = JSON.parse(await readFile(blockAPath, 'utf8'));

    // ============================
    // 2. Cargar C
    // ============================
    const blockCPath = path.join(schemaPath, 'blockC.json');
    const blockC = JSON.parse(await readFile(blockCPath, 'utf8'));

    // ============================
    // 3. Unificar A + B + C
    // ============================
    const entidad = {
      meta: {
        generado: new Date().toISOString(),
        version: '1.0.0',
        motor: 'IndiceIA-EntityFactory',
        bloques: ['A', 'B', 'C']
      },
      ler: blockA.ler || {},
      negocio: blockB,
      visual: blockC.visual || {}
    };

    // ============================
    // 4. Subir JSON generado
    // ============================
    const fileName = `entidad_${blockB.id || Date.now()}.json`;
    const url = await uploadJSON(fileName, entidad);

    // ============================
    // 5. Devolver
    // ============================
    return { url, entidad };

  } catch (err) {
    console.error('Builder error:', err);
    throw err;
  }
}
