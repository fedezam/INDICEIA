// skeleton/components/rubro-selector/update.js
//
// Depende de las funciones del resolver para no duplicar el árbol acá:
//   getTiposOrdenados()       -> [{codigo, nombre}]  (todo vocab.tipos)
//   getSubcategoriasDeTipo(t) -> [{codigo, nombre, schema_org,
//                                  matriculaOpcional?, matriculaLabel?,
//                                  especialidades?, organismoMatricula?}]
//   sugerirSubcategoria(txt)  -> {tipo, subcategoria, nombre, confidence} | null
import { getSubcategoriasDeTipo, sugerirSubcategoria } from '/lib/entity-factory/rubro-resolver.js';
import vocab from '/src/shared/business-vocabulary.json' with { type: 'json' };

function getTiposOrdenados(tiposExcluidos = []) {
  return [...vocab.tipos]
    .filter(t => !tiposExcluidos.includes(t.codigo))
    .map(t => ({ codigo: t.codigo, nombre: t.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function updateRubroSelector(dom, config = {}) {
  const {
    tipo = null,
    subcategoria = null,
    matricula = null,
    especialidad = null,
    matriculaProf = null, // { numero, organismo }
    tiposExcluidos = [],
    onChange = () => {}
  } = config;

  const {
    container, tipoSelect, subSelect, status,
    nivel3Wrapper, nivel3Select,
    matriculaWrapper, matriculaLabelEl, matriculaInput,
    matriculaProfWrapper, matriculaNumeroInput, organismoSelect,
    noMatchToggle, noMatchPanel, noMatchInput, noMatchSuggestion, noMatchSubmit
  } = dom;

  // ==================== POBLAR NIVEL 1 ====================
  tipoSelect.innerHTML = '<option value="">Seleccioná tu rubro...</option>';
  getTiposOrdenados(tiposExcluidos).forEach(t => {
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
      toggleExtras(null);
      return;
    }

    subSelect.innerHTML = '<option value="">Elegí tu especialidad...</option>';
    subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.codigo;
      opt.textContent = s.nombre;
      opt.dataset.matriculaOpcional = s.matriculaOpcional ? '1' : '0';
      opt.dataset.matriculaLabel = s.matriculaLabel || '';
      opt.dataset.especialidades = s.especialidades ? JSON.stringify(s.especialidades) : '';
      opt.dataset.organismoMatricula = s.organismoMatricula ? JSON.stringify(s.organismoMatricula) : '';
      subSelect.appendChild(opt);
    });
    subSelect.disabled = false;

    if (seleccionar) {
      subSelect.value = seleccionar;
      const selectedOpt = subSelect.querySelector(`option[value="${seleccionar}"]`);
      toggleExtras(selectedOpt);
    } else {
      toggleExtras(null);
    }
  };

  // ==================== MOSTRAR/OCULTAR MATRÍCULA DE OFICIO ====================
  const toggleMatricula = (selectedOpt) => {
    const activa = selectedOpt?.dataset?.matriculaOpcional === '1';
    matriculaWrapper.classList.toggle('hidden', !activa);
    if (activa) {
      matriculaLabelEl.textContent = selectedOpt.dataset.matriculaLabel || 'Matrícula / habilitación (si tenés)';
    } else {
      matriculaInput.value = '';
    }
  };

  // ==================== MOSTRAR/OCULTAR NIVEL 3 + MATRÍCULA PROFESIONAL ====================
  const toggleNivel3YMatriculaProf = (selectedOpt, preselectEspecialidad = null, preselectMatriculaProf = null) => {
    const especialidades = selectedOpt?.dataset?.especialidades
      ? JSON.parse(selectedOpt.dataset.especialidades) : null;
    const organismos = selectedOpt?.dataset?.organismoMatricula
      ? JSON.parse(selectedOpt.dataset.organismoMatricula) : null;

    const activa = !!(especialidades && especialidades.length);
    nivel3Wrapper.classList.toggle('hidden', !activa);
    matriculaProfWrapper.classList.toggle('hidden', !activa);

    if (!activa) {
      nivel3Select.innerHTML = '<option value="">Seleccioná tu especialidad...</option>';
      organismoSelect.innerHTML = '<option value="">Seleccioná el organismo</option>';
      matriculaNumeroInput.value = '';
      return;
    }

    nivel3Select.innerHTML = '<option value="">Seleccioná tu especialidad...</option>';
    especialidades.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e;
      opt.textContent = e;
      nivel3Select.appendChild(opt);
    });
    if (preselectEspecialidad) nivel3Select.value = preselectEspecialidad;

    organismoSelect.innerHTML = '<option value="">Seleccioná el organismo</option>';
    (organismos || []).forEach(o => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      organismoSelect.appendChild(opt);
    });
    if (preselectMatriculaProf?.organismo) organismoSelect.value = preselectMatriculaProf.organismo;
    matriculaNumeroInput.value = preselectMatriculaProf?.numero || '';
  };

  const toggleExtras = (selectedOpt, preselectEspecialidad = null, preselectMatriculaProf = null) => {
    toggleMatricula(selectedOpt);
    toggleNivel3YMatriculaProf(selectedOpt, preselectEspecialidad, preselectMatriculaProf);
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
    const m = matriculaWrapper.classList.contains('hidden') ? null : (matriculaInput.value.trim() || null);

    const nivel3Activo = !nivel3Wrapper.classList.contains('hidden');
    const esp = nivel3Activo ? (nivel3Select.value || null) : null;
    const matriculaProfActiva = !matriculaProfWrapper.classList.contains('hidden');
    const numero = matriculaProfActiva ? (matriculaNumeroInput.value.trim() || null) : null;
    const organismo = matriculaProfActiva ? (organismoSelect.value || null) : null;
    const mProf = (numero || organismo) ? { numero, organismo } : null;

    container._rubroValue = { tipo: t, subcategoria: s, matricula: m, especialidad: esp, matriculaProf: mProf };

    if (t && !s) {
      setStatus('Falta elegir la especialidad para clasificar bien tu negocio.', 'warning');
    } else if (t && s) {
      setStatus('', 'ok');
    } else {
      setStatus('', 'info');
    }

    const detail = { tipo: t, subcategoria: s, matricula: m, especialidad: esp, matriculaProf: mProf };
    container.dispatchEvent(new CustomEvent('rubro-change', { detail, bubbles: true }));
    onChange(detail);
  };

  // ==================== EVENTOS NIVEL 1 ====================
  tipoSelect.onchange = () => {
    poblarSubcategorias(tipoSelect.value);
    emitChange();
  };

  // ==================== EVENTOS NIVEL 2 ====================
  subSelect.onchange = () => {
    const selectedOpt = subSelect.selectedOptions[0];
    toggleExtras(selectedOpt);
    emitChange();
  };

  // ==================== EVENTOS NIVEL 3 + MATRÍCULA ====================
  matriculaInput.oninput = () => emitChange();
  nivel3Select.onchange = () => emitChange();
  matriculaNumeroInput.oninput = () => {
    matriculaNumeroInput.value = matriculaNumeroInput.value.replace(/\D/g, '');
    emitChange();
  };
  organismoSelect.onchange = () => emitChange();

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
    const detail = { tipo: tipoSelect.value || null, subcategoria: null, matricula: null, especialidad: null, matriculaProf: null, tagLibre: texto };
    container._rubroValue = detail;
    setStatus('Guardado. Nuestro equipo va a revisar la clasificación de tu negocio.', 'info');
    container.dispatchEvent(new CustomEvent('rubro-change', { detail, bubbles: true }));
    onChange(detail);
    noMatchPanel.classList.add('hidden');
  };

  // ==================== INICIALIZAR ====================
  if (tipo) tipoSelect.value = tipo;
  poblarSubcategorias(tipo, subcategoria);

  if (subcategoria) {
    const selectedOpt = subSelect.querySelector(`option[value="${subcategoria}"]`);
    toggleExtras(selectedOpt, especialidad, matriculaProf);
    if (matricula && !matriculaWrapper.classList.contains('hidden')) {
      matriculaInput.value = matricula;
    }
  }

  container._rubroValue = {
    tipo, subcategoria,
    matricula: matriculaWrapper.classList.contains('hidden') ? null : matricula,
    especialidad: nivel3Wrapper.classList.contains('hidden') ? null : especialidad,
    matriculaProf: matriculaProfWrapper.classList.contains('hidden') ? null : matriculaProf,
  };
  setStatus(tipo && !subcategoria ? 'Falta elegir la especialidad para clasificar bien tu negocio.' : '', 'warning');

  return container;
}
