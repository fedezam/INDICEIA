/**
 * Skeleton Runtime
 * Estado global del sistema. Inmutable después de inicialización.
 * 
 * ADR-001: Contexto Global del Runtime
 * - Single source of truth para identidad y contexto
 * - Read-only para componentes
 * - Selectores explícitos como API pública
 */

let _context = null;
let _initialized = false;

/**
 * Inicializa el runtime. Llamado una sola vez por runSkeleton.
 * @param {Object} ctx - Contexto completo del adapter
 * @throws {Error} Si ya fue inicializado
 */
export function initializeRuntime(ctx) {
  if (_initialized) {
    console.warn('[runtime] Ya inicializado. Ignorando re-inicialización.');
    return;
  }
  
  // Validación defensiva
  if (!ctx || typeof ctx !== 'object') {
    throw new Error('[runtime] Contexto inválido');
  }
  
  // Deep freeze para inmutabilidad superficial
  _context = Object.freeze({ ...ctx });
  _initialized = true;
  
  console.log('[runtime] Inicializado:', {
    uid: ctx.user?.uid,
    comercioId: ctx.comercioId,
    isEditMode: ctx.isEditMode
  });
}

/**
 * Verifica si el runtime está listo
 * @returns {boolean}
 */
export function isRuntimeReady() {
  return _initialized && _context !== null;
}

/**
 * Obtiene contexto completo. Uso interno o debugging.
 * NO usar directamente en componentes. Usar selectores.
 * @returns {Object}
 * @throws {Error} Si no está inicializado
 */
export function getRuntimeContext() {
  if (!isRuntimeReady()) {
    throw new Error(
      '[runtime] No inicializado. ' +
      'Asegurate de llamar runSkeleton() antes de usar componentes.'
    );
  }
  return _context;
}

// ============================================================
// SELECTORES PÚBLICOS
// Componentes deben usar estos, no getRuntimeContext()
// ============================================================

/** @returns {string|null} */
export function getCurrentUserId() {
  return getRuntimeContext().user?.uid || null;
}

/** @returns {Object|null} */
export function getCurrentUser() {
  return getRuntimeContext().user || null;
}

/** @returns {string|null} */
export function getCurrentComercioId() {
  return getRuntimeContext().comercioId || null;
}

/** @returns {Object|null} */
export function getCurrentComercioData() {
  return getRuntimeContext().comercioData || null;
}

/** @returns {boolean} */
export function isEditMode() {
  return getRuntimeContext().isEditMode === true;
}

/** @returns {Object} */
export function getCurrentUserData() {
  return getRuntimeContext().userData || {};
}

// ============================================================
// GUARDS (próxima evolución)
// ============================================================

/**
 * Requiere comercioId o lanza error
 * @returns {string}
 * @throws {Error} Si no hay comercioId
 */
export function requireComercioId() {
  const id = getCurrentComercioId();
  if (!id) {
    throw new Error('[runtime] Requiere comercioId. Usuario sin comercio asignado.');
  }
  return id;
}

/**
 * Requiere userId o lanza error
 * @returns {string}
 * @throws {Error} Si no hay usuario
 */
export function requireUserId() {
  const id = getCurrentUserId();
  if (!id) {
    throw new Error('[runtime] Requiere usuario autenticado.');
  }
  return id;
}

// ============================================================
// DEBUG (solo desarrollo)
// ============================================================

export function __resetRuntime() {
  // Solo disponible en tests o desarrollo
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const isDev = window.location?.hostname === 'localhost';
  
  if (!isTest && !isDev) {
    console.warn('[runtime] __resetRuntime solo disponible en tests/dev');
    return;
  }
  
  _context = null;
  _initialized = false;
  console.log('[runtime] Reseteado (debug)');
}
