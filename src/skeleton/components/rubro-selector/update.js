// skeleton/components/rubro-selector/update.js
//
// Depende de las funciones del resolver para no duplicar el árbol acá:
//   getTiposOrdenados()       -> [{codigo, nombre}]  (todo vocab.tipos)
//   getSubcategoriasDeTipo(t) -> [{codigo, nombre, schema_org}]
//   sugerirSubcategoria(txt)  -> {tipo, subcategoria, nombre, confidence} | null
import { getSubcategoriasDeTipo, sugerirSubcategoria } from '/lib/entity-factory/rubro-resolver.js';
import vocab from '/lib/entity-factory/base/business-vocabulary.json' with { type: 'json' };

function getTiposOrdenados() {
  return [...vocab.tipos]
    .map(t => ({ codigo: t.codigo, nombre: t.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function updateRubroSelector(dom, config = {}) {
  const {
    tipo = null,
    subcategoria = null,
    onChange = () => {}
  } = config;

  const {
    container, tipoSelect, subSelect, status,
    noMatchToggle, noMatchPanel, noMatchInput, noMatchSuggestion, noMatchSubmit
  } = dom;

  // ==================== POBLAR NIVEL 1 ====================
  tipoSelect.innerHTML = '<option value="">Seleccioná tu rubro...</option>';
  getTiposOrdenados().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.codigo;
    opt.textContent = t.nombre;
    tipoSelect.appendChild(opt);
  });

  // ==================== POBLAR NIVEL 2 (según tipo actual) ====================
  const poblarSubcategorias = (codigoTipo, seleccionar = null) => {
    subSelect.innerHTML = '';
    const subs = codigoTipo ? getSubcategoriasDeTipo(codigoTipo) : [];

    if (!codigoTipo) {
      subSelect.innerHTML = '<option value="">Primero elegí un rubro</option>';
      subSelect.disabled = true;
      return;
    }

    subSelect.innerHTML = '<option value="">Elegí tu especialidad...</option>';
    subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.codigo;
      opt.textContent = s.nombre;
      subSelect.appendChild(opt);
    });
    subSelect.disabled = false;

    if (seleccionar) subSelect.value = seleccionar;
  };

  // ==================== ESTADO / FEEDBACK ====================
  const setStatus = (msg, kind = 'info') => {
    status.textContent = msg;
    status.className = `s-rubro-status s-rubro-status--${kind}`;
    status.classList.toggle('hidden', !msg);
  };

  const emitChange = () => {
    const t = tipoSelect.value || null;
    const s = subSelect.value || null;
    container._rubroValue = { tipo: t, subcategoria: s };

    if (t && !s) {
      setStatus('Falta elegir la especialidad para clasificar bien tu negocio.', 'warning');
    } else if (t && s) {
      setStatus('', 'ok');
    } else {
      setStatus('', 'info');
    }

    container.dispatchEvent(new CustomEvent('rubro-change', {
      detail: { tipo: t, subcategoria: s },
      bubbles: true
    }));
    onChange({ tipo: t, subcategoria: s });
  };

  // ==================== EVENTOS NIVEL 1 ====================
  tipoSelect.onchange = () => {
    poblarSubcategorias(tipoSelect.value);
    emitChange();
  };

  // ==================== EVENTOS NIVEL 2 ====================
  subSelect.onchange = () => {
    emitChange();
  };

  // ==================== "NO ENCUENTRO MI RUBRO" ====================
  noMatchToggle.onclick = () => {
    noMatchPanel.classList.toggle('hidden');
  };

  noMatchInput.oninput = () => {
    const texto = noMatchInput.value.trim();
    if (texto.length < 3) {
      noMatchSuggestion.classList.add('hidden');
      return;
    }
    const sugerencia = sugerirSubcategoria(texto);
    if (sugerencia) {
      noMatchSuggestion.textContent =
        `¿Quisiste decir "${sugerencia.nombre}"? Elegilo arriba si coincide.`;
      noMatchSuggestion.classList.remove('hidden');
    } else {
      noMatchSuggestion.textContent =
        'No encontramos nada parecido. Podés enviarlo igual y lo revisamos manualmente.';
      noMatchSuggestion.classList.remove('hidden');
    }
  };

  noMatchSubmit.onclick = () => {
    const texto = noMatchInput.value.trim();
    if (!texto) return;
    // Sin subcategoria: el resolver lo va a marcar requiere_revision
    // y guardamos el texto libre en un campo aparte para que vos lo audites.
    container._rubroValue = { tipo: tipoSelect.value || null, subcategoria: null, tagLibre: texto };
    setStatus('Guardado. Nuestro equipo va a revisar la clasificación de tu negocio.', 'info');
    container.dispatchEvent(new CustomEvent('rubro-change', {
      detail: { tipo: tipoSelect.value || null, subcategoria: null, tagLibre: texto },
      bubbles: true
    }));
    onChange({ tipo: tipoSelect.value || null, subcategoria: null, tagLibre: texto });
    noMatchPanel.classList.add('hidden');
  };

  // ==================== INICIALIZAR ====================
  if (tipo) tipoSelect.value = tipo;
  poblarSubcategorias(tipo, subcategoria);
  container._rubroValue = { tipo, subcategoria };
  setStatus(tipo && !subcategoria ? 'Falta elegir la especialidad para clasificar bien tu negocio.' : '', 'warning');

  return container;
}
