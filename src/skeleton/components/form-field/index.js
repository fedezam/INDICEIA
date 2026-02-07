// src/skeleton/components/form-field/index.js
import { renderFormField } from './render.js';
import { updateFormField } from './update.js';

/**
 * Crea un campo de formulario con label, input y validación
 * @param {Object} config
 * @param {string} config.label - Etiqueta del campo
 * @param {string} config.name - Atributo name del input
 * @param {'text'|'email'|'password'|'number'|'tel'|'url'|'select'|'textarea'} [config.type='text'] - Tipo de input
 * @param {string} [config.value=''] - Valor inicial
 * @param {string} [config.placeholder] - Placeholder del input
 * @param {boolean} [config.required=false] - Si es obligatorio
 * @param {boolean} [config.disabled=false] - Si está deshabilitado
 * @param {Array<{value: string, label: string}>} [config.options] - Opciones (solo para type='select')
 * @param {number} [config.rows] - Cantidad de filas (solo para type='textarea')
 * @returns {HTMLElement & {input: HTMLElement, getValue: Function, setValue: Function, setInvalid: Function, isInvalid: Function, disable: Function, enable: Function, getId: Function}}
 * Elemento con métodos adicionales:
 * - input - Referencia directa al elemento input/select/textarea
 * - getValue() - Obtiene el valor actual
 * - setValue(value) - Establece un nuevo valor
 * - setInvalid(state: boolean) - Marca como inválido
 * - isInvalid() - Verifica si está inválido
 * - disable() - Deshabilita el campo
 * - enable() - Habilita el campo
 * - getId() - Obtiene el ID único del campo
 */
export function createFormField(config = {}) {
  const dom = renderFormField();
  const input = updateFormField(dom, config);
  const el = dom.wrapper;
  
  // ---- Exponer el input directamente ----
  el.input = input;
  
  // ---- API pública ----
  el.getValue = () => input.value;
  
  el.setValue = (value) => {
    input.value = value ?? '';
  };
  
  el.setInvalid = (state) => {
    el.classList.toggle('is-invalid', !!state);
  };
  
  el.isInvalid = () => {
    return el.classList.contains('is-invalid');
  };
  
  el.disable = () => {
    input.disabled = true;
    el.classList.add('is-disabled');
  };
  
  el.enable = () => {
    input.disabled = false;
    el.classList.remove('is-disabled');
  };
  
  el.getId = () => {
    return el.dataset.fieldId;
  };
  
  return el;
}
