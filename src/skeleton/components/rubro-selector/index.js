// skeleton/components/rubro-selector/index.js
import { renderRubroSelector } from './render.js';
import { updateRubroSelector } from './update.js';
/**
 * Selector de rubro/subcategoría en 2 niveles encadenados, con extensiones
 * condicionales de tercer nivel según la subcategoría elegida:
 * - matricula (string libre): oficios (gasista, maestro mayor de obra, etc.)
 * - especialidad + matriculaProf {numero, organismo}: profesionales con
 *   carrera (SAL-MED, SAL-DEN, SAL-KIN) — reemplaza los objetos
 *   ESPECIALIDADES/ORGANISMOS_MATRICULA que antes vivían hardcodeados
 *   en mi-perfil-profesional.js.
 *
 * Reemplaza al uso de category-selector para la CLASIFICACIÓN del negocio.
 * category-selector sigue existiendo para tags descriptivos libres (no clasifican).
 *
 * @param {Object} config
 * @param {string} [config.tipo] - codigo de rubro preseleccionado (ej "VEH")
 * @param {string} [config.subcategoria] - codigo de subcategoría preseleccionada (ej "VEH-VTA")
 * @param {string} [config.matricula] - matrícula de oficio precargada (si aplica)
 * @param {string} [config.especialidad] - especialidad clínica/profesional precargada (si aplica)
 * @param {Object} [config.matriculaProf] - {numero, organismo} precargado (si aplica)
 * @param {string[]} [config.tiposExcluidos] - códigos de Nivel 1 a ocultar del dropdown
 *   (ej: ['SAL'] en mi-perfil.js, para no pisar el flujo dedicado de
 *   mi-perfil-profesional.js con rubros de carrera universitaria)
 * @param {Function} [config.onChange] - callback({tipo, subcategoria, matricula, especialidad, matriculaProf, tagLibre?})
 *
 * @returns {HTMLElement} con métodos:
 * - getValue() -> {tipo, subcategoria, matricula?, especialidad?, matriculaProf?, tagLibre?}
 * - setValue({tipo, subcategoria, matricula?, especialidad?, matriculaProf?})
 * - isComplete() -> boolean (true solo si tipo Y subcategoria están elegidos)
 *
 * @fires rubro-change
 */
export function createRubroSelector(config = {}) {
  const dom = renderRubroSelector();
  const container = updateRubroSelector(dom, config);
  container._config = { ...config };
  container._dom = dom;
  container.getValue = () => ({ ...container._rubroValue });
  container.setValue = ({ tipo, subcategoria, matricula, especialidad, matriculaProf }) => {
    updateRubroSelector(dom, { ...container._config, tipo, subcategoria, matricula, especialidad, matriculaProf });
  };
  container.isComplete = () => {
    const v = container._rubroValue;
    return !!(v?.tipo && v?.subcategoria);
  };
  return container;
}
