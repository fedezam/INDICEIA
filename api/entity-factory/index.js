// /api/entity-factory/index.js
// Entity Factory oficial — A + B + C (ÍndiceIA v1.0)

import blockA from './base/blockA.json' assert { type: 'json' };
import blockC from './base/blockC.json' assert { type: 'json' };
import { loadVisualTemplate } from './utils/template-loader.js';

/**
 * Determina si un valor tiene datos reales.
 * - true / false → válidos
 * - strings vacíos → inválidos
 * - arrays vacíos → inválidos
 * - objetos vacíos → inválidos
 */
function hasData(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  }
  return value !== undefined && value !== null;
}

export async function buildEntity({ comercioId, comercioData }) {
  if (!comercioId) throw new Error('Falta comercioId');
  if (!comercioData) throw new Error('Falta comercioData');

  // ----- A: Núcleo LER -----
  const A = structuredClone(blockA);

  // ----- B: Comercio (single source of truth) -----
  const B = { id: comercioId };

  if (hasData(comercioData.nombre)) B.nombre = comercioData.nombre;
  if (hasData(comercioData.descripcion)) B.descripcion = comercioData.descripcion;
  if (hasData(comercioData.direccion)) B.direccion = comercioData.direccion;
  if (hasData(comercioData.telefono)) B.telefono = comercioData.telefono;
  if (hasData(comercioData.categoria)) B.categoria = comercioData.categoria;
  if (hasData(comercioData.plan)) B.plan = comercioData.plan;

  if (hasData(comercioData.horarios)) B.horarios = comercioData.horarios;
  if (hasData(comercioData.productos)) B.productos = comercioData.productos;
  if (hasData(comercioData.imagenes)) B.imagenes = comercioData.imagenes;
  if (hasData(comercioData.pagos)) B.pagos = comercioData.pagos;
  if (hasData(comercioData.envios)) B.envios = comercioData.envios;

  B.updatedAt = new Date().toISOString();

  // Blindaje: B es fuente única de verdad
  Object.freeze(B);

  // ----- C: Visual (opcional, solo renderer) -----
  let C = structuredClone(blockC);

  if (hasData(comercioData.visualTemplate)) {
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

