// /api/entity-factory/index.js
// Versión SEGURA para Vercel – sin fs ni imports problemáticos
// Block A y C hardcodeados o como fallback

const blockA = {
  // PEGÁ ACÁ EL CONTENIDO DE base/blockA.json (todo el objeto)
  // Ejemplo si es pequeño:
  // "version": "1.0",
  // "ler": { ... }
  // Si es grande, dejalo como {} por ahora
};

const blockC = {
  // PEGÁ ACÁ EL CONTENIDO DE base/blockC.json
  // Ejemplo:
  // "defaultColors": { ... }
  // Si es grande, dejalo como {} por ahora
};

/**
 * Determina si un valor tiene datos reales.
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

/**
 * buildEntity - Factory autónoma que construye la entidad
 * 
 * @param {Object} params
 * @param {string} params.comercioId - ID del comercio (OBLIGATORIO)
 * @param {Object} params.comercioData - Datos del comercio (OPCIONAL)
 * @returns {Object} Entidad completa con bloques A, B, C
 */
export async function buildEntity({ comercioId, comercioData = {} }) {
  // ✅ ÚNICA validación obligatoria: comercioId
  if (!comercioId) throw new Error('Falta comercioId');

  // ----- A: Núcleo LER (hardcodeado) -----
  const A = structuredClone(blockA || {});

  // ----- B: Comercio (single source of truth) -----
  const B = { id: comercioId };

  // Solo agregar datos si existen
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
  Object.freeze(B);

  // ----- C: Visual (temporal sin carga dinámica) -----
  let C = structuredClone(blockC || {});
  
  // Comentamos la carga dinámica para evitar fs
  // if (hasData(comercioData.visualTemplate)) {
  //   const template = await loadVisualTemplate(comercioData.visualTemplate);
  //   if (template) {
  //     C.template = template;
  //     C.source = 'external_template';
  //   }
  // }
  
  C.source = 'default_hardcoded'; // para saber que es temporal

  // ----- Retornar entidad completa -----
  return {
    meta: {
      version: '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString()
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
