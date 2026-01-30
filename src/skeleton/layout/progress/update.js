// src/skeleton/layout/progress/update.js
// Inyecta estado, pasos y porcentaje

export function updateProgress({
  currentStep,
  steps = [],
  totalSteps = 5,
  title = 'Configuración de tu comercio'
}) {
  const root = document.getElementById('progress-root');
  if (!root) return;

  const subtitle = document.getElementById('progress-subtitle');
  const fill = document.getElementById('progress-fill');
  const stepsContainer = document.getElementById('progress-steps');
  const titleEl = document.getElementById('progress-title');

  titleEl.textContent = title;

  const completedCount = steps.length;
  const percentage = Math.round((completedCount / totalSteps) * 100);

  subtitle.textContent = `Paso ${currentStep} de ${totalSteps} • ${percentage}% completado`;
  fill.style.width = `${percentage}%`;

  const stepDefs = [
    { id: 1, label: 'Usuario' },
    { id: 2, label: 'Mi Comercio' },
    { id: 3, label: 'Horarios' },
    { id: 4, label: 'Productos' },
    { id: 5, label: 'IA' }
  ];

  stepsContainer.innerHTML = stepDefs.map(step => {
    const completed = steps.includes(step.id);
    const current = step.id === currentStep;

    return `
      <div class="progress-step ${completed ? 'completed' : ''} ${current ? 'current' : ''}">
        <div class="step-circle">
          ${completed ? '✓' : step.id}
        </div>
        <span>${step.label}</span>
      </div>
    `;
  }).join('');

  root.classList.remove('hidden');
}

export function hideProgress() {
  const root = document.getElementById('progress-root');
  if (root) root.classList.add('hidden');
}
