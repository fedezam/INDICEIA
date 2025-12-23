import { put } from '@vercel/blob';
import blockA from './base/blockA.json' assert { type: 'json' };

function hasData(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return false;
}

export async function buildEntity({ comercioId, comercioData }) {
  if (!comercioId) throw new Error('falta comercioId');
  if (!comercioData) throw new Error('falta comercioData');

  // ----- BLOQUE A (igual que antes)
  const A = structuredClone(blockA);

  // ----- BLOQUE B (nuevo)
  const B = { id: comercioId };

  if (hasData(comercioData.nombre)) B.nombre = comercioData.nombre;
  if (hasData(comercioData.descripcion)) B.descripcion = comercioData.descripcion;
  if (hasData(comercioData.direccion)) B.direccion = comercioData.direccion;
  if (hasData(comercioData.telefono)) B.telefono = comercioData.telefono;
  if (hasData(comercioData.categoria)) B.categoria = comercioData.categoria;
  if (hasData(comercioData.plan)) B.plan = comercioData.plan;

  if (hasData(comercioData.horarios)) B.horarios = comercioData.horarios;
  if (hasData(comercioData.catalogo)) B.catalogo = comercioData.catalogo;
  if (hasData(comercioData.pagos)) B.pagos = comercioData.pagos;
  if (hasData(comercioData.envios)) B.envios = comercioData.envios;
  if (hasData(comercioData.imagenes)) B.imagenes = comercioData.imagenes;

  B.updatedAt = new Date().toISOString();

  // ----- ENTIDAD FINAL (A + B)
  const entity = {
    A,
    B
  };

  // ----- OVERWRITE DEL MISMO BLOB
  await put(
    `entidades/${comercioId}.json`,
    JSON.stringify(entity, null, 2),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false // CLAVE: pisa el blob existente
    }
  );

  return { ok: true };
}
