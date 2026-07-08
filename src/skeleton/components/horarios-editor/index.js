// skeleton/components/horarios-editor/index.js
import { renderHorariosEditor, DAYS } from './render.js';
import { updateHorariosEditor } from './update.js';

/**
 * Crea el editor visual de horarios (día por día, corrido/partido, selects de hora).
 * Reemplaza la edición cruda de JSON por la misma UX de la página /horarios.
 *
 * @param {Object} horariosIniciales - Estructura { lunes: { open, turnos }, ... } o undefined
 * @param {Object} [opts]
 * @param {boolean} [opts.tieneLocalFisico=true] - Cambia el copy "Abierto/Cerrado" vs "Disponible/No disponible"
 * @param {Function} [opts.onChange] - Callback(horarios) cada vez que cambia algo
 *
 * @returns {Object}
 * - element: HTMLElement para montar
 * - getValue(): devuelve el objeto horarios actual
 * - setValue(horarios): reemplaza los datos y re-renderiza
 *
 * @example
 * const editor = createHorariosEditor(entidad.horarios, {
 *   tieneLocalFisico: true,
 *   onChange: (h) => console.log('cambiaron los horarios', h)
 * });
 * container.appendChild(editor.element);
 * // luego, al guardar:
 * await updateDoc(ref, { horarios: editor.getValue() });
 */
export function createHorariosEditor(horariosIniciales, opts = {}) {
  const dom = renderHorariosEditor();
  const uiState = { horarios: normalizeHorarios(horariosIniciales) };

  const emitChange = () => opts.onChange?.(uiState.horarios);

  updateHorariosEditor(dom, uiState, opts, emitChange);

  return {
    element: dom.wrapper,

    getValue: () => uiState.horarios,

    setValue: (nuevosHorarios) => {
      uiState.horarios = normalizeHorarios(nuevosHorarios);
      updateHorariosEditor(dom, uiState, opts, emitChange);
    },

    /** true si el usuario marcó al menos un día como abierto */
    isValid: () => DAYS.some(day => uiState.horarios[day].open)
  };
}

function normalizeHorarios(horariosData) {
  const result = {};
  DAYS.forEach(day => {
    const existing = horariosData?.[day];
    result[day] = existing
      ? { open: existing.open ?? false, turnos: Array.isArray(existing.turnos) ? existing.turnos : [] }
      : { open: false, turnos: [] };
  });
  return result;
}
