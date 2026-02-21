// ============================================================
// src/skeleton/utils/cleanPayload.js
//
// ADR: Limpieza técnica de payloads antes de persistir.
//
// Elimina: undefined, null, '', [] vacío, {} vacío
// Respeta:  false, 0, true, strings con contenido
//
// Esta utilidad NO decide semántica de negocio.
// La página es responsable de no incluir campos
// cuyo dominio no existe (campos huérfanos).
// ============================================================

/**
 * Limpia recursivamente un objeto eliminando ruido técnico.
 * @param {*} value
 * @returns {*} valor limpio, o undefined si debe eliminarse
 */
export function cleanPayload(value) {
  // Array
  if (Array.isArray(value)) {
    const cleaned = value
      .map(cleanPayload)
      .filter(v => v !== undefined);
    return cleaned.length ? cleaned : undefined;
  }

  // Objeto plano
  if (value !== null && typeof value === 'object') {
    const cleaned = Object.fromEntries(
      Object.entries(value)
        .map(([k, v]) => [k, cleanPayload(v)])
        .filter(([, v]) => v !== undefined)
    );
    return Object.keys(cleaned).length ? cleaned : undefined;
  }

  // Ruido técnico
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  // Valor real — false, 0, true, string, number
  return value;
}
