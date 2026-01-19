// /lib/cartel/index.js
// ====================
// ENTRYPOINT del módulo Cartel
// Punto único de acceso desde pages / apps

import { CartelConfig } from "./cartel.config.js"
import { renderCartel } from "./cartel.renderer.js"
import { CartelTemplates } from "./cartel.templates.js"

/**
 * Inicializa el módulo Cartel
 * @param {Object} options
 * @param {string} options.containerId - ID del nodo donde renderizar
 * @param {Object} options.data - Datos del comercio / entidad
 * @param {string} options.template - Template visual a usar
 */
export function initCartel({
  containerId = "cartel",
  data = {},
  template = "default"
} = {}) {
  const container = document.getElementById(containerId)

  if (!container) {
    console.error("[Cartel] Contenedor no encontrado:", containerId)
    return
  }

  const config = CartelConfig.normalize(data)
  const tpl = CartelTemplates.get(template)

  if (!tpl) {
    console.error("[Cartel] Template inexistente:", template)
    return
  }

  renderCartel({
    container,
    config,
    template: tpl
  })
}

// Exports avanzados (opcional, pero prolijo)
export {
  CartelConfig,
  CartelTemplates,
  renderCartel
}
