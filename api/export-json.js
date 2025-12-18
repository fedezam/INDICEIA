// /api/entity-factory/index.js
// Entity Factory oficial — Ensamblador A + B + C (ÍndiceIA v1.0)

import blockA from './base/blockA.json' assert { type: 'json' };
import { loadVisualTemplate } from './utils/template-loader.js';

/**
 * Ensambla entidad comercial:
 * A = núcleo LER
 * B = datos dinámicos del comercio
 * C = visual opcional
 */
export async function buildEntity({ comercioId, comercioData }) {
  if (!comercioId) throw new Error('Falta comercioId');
  if (!comercioData) throw new Error('Falta comercioData');

  // ---------- BLOQUE A ----------
  const A = structuredClone(blockA);

  // ---------- BLOQUE B ----------
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

  // ---------- BLOQUE C ----------
  let C;
  if (comercioData.visualTemplate) {
    C = await loadVisualTemplate(comercioData.visualTemplate);
  }

  // ---------- ENSAMBLE ----------
  return {
    meta: {
      version: '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId
    },
    A,
    B,
    ...(C ? { C } : {})
  };
}

