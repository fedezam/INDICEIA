// src/skeleton/onboarding/config.js

/**
 * Mapa canónico de pasos de onboarding.
 * Define dónde se persiste cada paso.
 *
 * stepName → {
 *   collection: 'usuarios' | 'comercios',
 *   idField: 'uid' | 'comercioId'
 * }
 */
export const STEP_TARGETS = {
  // --- Usuario ---
  "usuario": {
    collection: "usuarios",
    idField: "uid"
  },

  "crear-entidad": {
    collection: "usuarios",
    idField: "uid"
  },

  // --- Comercio ---
  "mi-comercio": {
    collection: "comercios",
    idField: "comercioId"
  },

  "horarios": {
    collection: "comercios",
    idField: "comercioId"
  },

  "servicios": {
    collection: "comercios",
    idField: "comercioId"
  },

  "productos": {
    collection: "comercios",
    idField: "comercioId"
  },

  "ia-config": {
    collection: "comercios",
    idField: "comercioId"
  }
};
