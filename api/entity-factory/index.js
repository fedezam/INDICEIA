// /api/entity-factory/index.js
// Factory real – SOLO Block A desde archivo (modo update)

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // ---- Leer Block A REAL desde archivo ----
  const blockAPath = resolve(__dirname, 'base/blockA.json');

  let blockA;
  try {
    blockA = JSON.parse(readFileSync(blockAPath, 'utf-8'));
  } catch (err) {
    console.error('❌ No se pudo leer blockA.json', err);
    throw new Error('Error leyendo Block A');
  }

  return {
    meta: {
      version: blockA?.meta?.version ?? 'unknown',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString(),
      mode: 'update'
    },
    contracts: {
      blockB: {
        role: 'single_source_of_truth',
        mutable: false,
        renderReady: true
      },
      blockC: {
        role: 'visual_only',
        optional: true,
        ignoredByEntity: true
      }
    },
    A: blockA,
    B: {
      id: comercioId
    },
    C: {}
  };
}
