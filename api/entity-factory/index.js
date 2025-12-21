// /api/entity-factory/index.js
// Entity Factory oficial — A + B + C (ÍndiceIA v1.0)

import blockA from './base/blockA.json' assert { type: 'json' };
import blockC from './base/blockC.json' assert { type: 'json' };
import { loadVisualTemplate } from './utils/template-loader.js';

export async function buildEntity({ comercioId, comercioData }) {
  if (!comercioId) throw new Error('Falta comercioId');
  if (!comercioData) throw new Error('Falta comercioData');

  // ----- A: Núcleo LER -----
  const A = structuredClone(blockA);

  // ----- B: Comercio (render-ready, immutable) -----
  const B = {
    id: comercioId,
    nombre: comercioData.nombre ?? '',
    descripcion: comercioData.descripcion ?? '',
    direccion: comercioData.direccion ?? '',
    telefono: comercioData.telefono ?? '',
    horarios: comercioData.horarios ?? {},
    productos: comercioData.productos ?? [],
    imagenes: comercioData.imagenes ?? [],
    categoria: comercioData.categoria ?? '',
    plan: comercioData.plan ?? '',
    updatedAt: new Date().toISOString()
  };

  // Blindaje: B es fuente única de verdad
  Object.freeze(B);

  // ----- C: Visual (opcional, solo renderer) -----
  let C = structuredClone(blockC);

  if (comercioData.visualTemplate) {
    const template = await loadVisualTemplate(comercioData.visualTemplate);
    if (template) {
      C.template = template;
      C.source = 'external_template';
    }
  }

  return {
    meta: {
      version: '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId
    },

    // Contratos explícitos entre bloques
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

    A,
    B,
    C
  };
}
