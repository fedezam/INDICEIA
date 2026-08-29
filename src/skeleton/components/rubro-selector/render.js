// skeleton/components/rubro-selector/render.js
import './styles.css';

export function renderRubroSelector() {
  const container = document.createElement('div');
  container.className = 's-rubro-selector';

  // ---- Nivel 1: Rubro ----
  const tipoWrapper = document.createElement('div');
  tipoWrapper.className = 's-rubro-field';
  const tipoLabel = document.createElement('label');
  tipoLabel.className = 's-rubro-label';
  tipoLabel.textContent = 'Rubro';
  const tipoSelect = document.createElement('select');
  tipoSelect.className = 's-rubro-select';
  tipoSelect.innerHTML = '<option value="">Seleccioná tu rubro...</option>';
  tipoWrapper.append(tipoLabel, tipoSelect);

  // ---- Nivel 2: Subcategoría (deshabilitado hasta elegir rubro) ----
  const subWrapper = document.createElement('div');
  subWrapper.className = 's-rubro-field';
  const subLabel = document.createElement('label');
  subLabel.className = 's-rubro-label';
  subLabel.textContent = 'Categoría';
  const subSelect = document.createElement('select');
  subSelect.className = 's-rubro-select';
  subSelect.disabled = true;
  subSelect.innerHTML = '<option value="">Primero elegí un rubro</option>';
  subWrapper.append(subLabel, subSelect);

  // ---- Nivel 3: Especialidad clínica/profesional (condicional, ej: SAL-MED) ----
  const nivel3Wrapper = document.createElement('div');
  nivel3Wrapper.className = 's-rubro-field s-rubro-nivel3 hidden';
  const nivel3Label = document.createElement('label');
  nivel3Label.className = 's-rubro-label';
  nivel3Label.textContent = 'Especialidad';
  const nivel3Select = document.createElement('select');
  nivel3Select.className = 's-rubro-select';
  nivel3Select.innerHTML = '<option value="">Seleccioná tu especialidad...</option>';
  nivel3Wrapper.append(nivel3Label, nivel3Select);

  // ---- Matrícula opcional (input libre, ej: gasista/oficio) ----
  const matriculaWrapper = document.createElement('div');
  matriculaWrapper.className = 's-rubro-field s-rubro-matricula hidden';
  const matriculaLabelEl = document.createElement('label');
  matriculaLabelEl.className = 's-rubro-label';
  const matriculaInput = document.createElement('input');
  matriculaInput.type = 'text';
  matriculaInput.className = 's-rubro-matricula-input';
  matriculaInput.placeholder = 'Ej: GN-4521';
  matriculaWrapper.append(matriculaLabelEl, matriculaInput);

  // ---- Matrícula profesional: número + organismo select (ej: SAL-MED/SAL-DEN/SAL-KIN) ----
  const matriculaProfWrapper = document.createElement('div');
  matriculaProfWrapper.className = 's-rubro-field s-rubro-matricula-prof hidden';

  const matriculaNumeroLabel = document.createElement('label');
  matriculaNumeroLabel.className = 's-rubro-label';
  matriculaNumeroLabel.textContent = 'Número de matrícula';
  const matriculaNumeroInput = document.createElement('input');
  matriculaNumeroInput.type = 'text';
  matriculaNumeroInput.inputMode = 'numeric';
  matriculaNumeroInput.className = 's-rubro-matricula-input';
  matriculaNumeroInput.placeholder = 'Ej: 12345';

  const organismoLabel = document.createElement('label');
  organismoLabel.className = 's-rubro-label';
  organismoLabel.textContent = 'Organismo que emite la matrícula';
  const organismoSelect = document.createElement('select');
  organismoSelect.className = 's-rubro-select';
  organismoSelect.innerHTML = '<option value="">Seleccioná el organismo</option>';

  matriculaProfWrapper.append(matriculaNumeroLabel, matriculaNumeroInput, organismoLabel, organismoSelect);

  // ---- Feedback / estado ----
  const status = document.createElement('div');
  status.className = 's-rubro-status';

  // ---- "No encuentro mi rubro" ----
  const noMatchWrapper = document.createElement('div');
  noMatchWrapper.className = 's-rubro-nomatch';
  const noMatchToggle = document.createElement('button');
  noMatchToggle.type = 'button';
  noMatchToggle.className = 's-rubro-nomatch-toggle';
  noMatchToggle.textContent = '¿No encontrás tu rubro?';
  const noMatchPanel = document.createElement('div');
  noMatchPanel.className = 's-rubro-nomatch-panel hidden';
  const noMatchInput = document.createElement('input');
  noMatchInput.type = 'text';
  noMatchInput.className = 's-rubro-nomatch-input';
  noMatchInput.placeholder = 'Describí brevemente tu negocio...';
  const noMatchSuggestion = document.createElement('div');
  noMatchSuggestion.className = 's-rubro-suggestion hidden';
  const noMatchSubmit = document.createElement('button');
  noMatchSubmit.type = 'button';
  noMatchSubmit.className = 's-btn s-btn-primary s-btn-sm';
  noMatchSubmit.textContent = 'Enviar de todos modos';
  noMatchPanel.append(noMatchInput, noMatchSuggestion, noMatchSubmit);
  noMatchWrapper.append(noMatchToggle, noMatchPanel);

  container.append(
    tipoWrapper, subWrapper, nivel3Wrapper,
    matriculaWrapper, matriculaProfWrapper,
    status, noMatchWrapper
  );

  return {
    container, tipoSelect, subSelect, status,
    nivel3Wrapper, nivel3Select,
    matriculaWrapper, matriculaLabelEl, matriculaInput,
    matriculaProfWrapper, matriculaNumeroInput, organismoSelect,
    noMatchToggle, noMatchPanel, noMatchInput, noMatchSuggestion, noMatchSubmit
  };
}
