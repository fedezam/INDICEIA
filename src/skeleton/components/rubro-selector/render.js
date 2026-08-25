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
  subLabel.textContent = 'Especialidad';
  const subSelect = document.createElement('select');
  subSelect.className = 's-rubro-select';
  subSelect.disabled = true;
  subSelect.innerHTML = '<option value="">Primero elegí un rubro</option>';
  subWrapper.append(subLabel, subSelect);

  // ---- Matrícula opcional (visible solo si la subcategoría lo requiere) ----
  const matriculaWrapper = document.createElement('div');
  matriculaWrapper.className = 's-rubro-field s-rubro-matricula hidden';
  const matriculaLabelEl = document.createElement('label');
  matriculaLabelEl.className = 's-rubro-label';
  const matriculaInput = document.createElement('input');
  matriculaInput.type = 'text';
  matriculaInput.className = 's-rubro-matricula-input';
  matriculaInput.placeholder = 'Ej: GN-4521';
  matriculaWrapper.append(matriculaLabelEl, matriculaInput);

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

  container.append(tipoWrapper, subWrapper, matriculaWrapper, status, noMatchWrapper);

  return {
    container, tipoSelect, subSelect, status,
    matriculaWrapper, matriculaLabelEl, matriculaInput,
    noMatchToggle, noMatchPanel, noMatchInput, noMatchSuggestion, noMatchSubmit
  };
}
