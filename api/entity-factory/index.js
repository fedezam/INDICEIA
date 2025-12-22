// /api/entity-factory/index.js
// VERSIÓN CAPADA – Solo lee blockA desde archivo y lo devuelve

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function buildEntity({ comercioId, comercioData }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // ----- A: Núcleo LER – leido desde archivo -----
  const blockAPath = resolve(__dirname, 'base/blockA.json');
  let blockA;
  try {
    const blockAContent = readFileSync(blockAPath, 'utf-8');
    blockA = JSON.parse(blockAContent);
  } catch (error) {
    console.error('Error leyendo blockA.json:', error);
    throw new Error('No se pudo leer blockA.json');
  }

  // Entidad capada: solo A, B y C vacíos
  return {
    meta: {
      version: '1.0.0-capada-A-only',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      note: 'Versión capada – solo blockA leido desde archivo'
    },
    contracts: {
      blockB: {
        role: 'single_source_of_truth',
        mutable: false,
        renderReady: true,
        allowedConsumers: ['renderer']
      },
      blockC: {
        role: 'visual_only',
        optional: true,
        consumedBy: ['renderer'],
        ignoredByEntity: true
      }
    },
    A: blockA,
    B: { id: comercioId, note: 'B capado' },
    C: { note: 'C capado' }
  };
}
