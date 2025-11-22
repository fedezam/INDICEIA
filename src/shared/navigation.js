// src/shared/navigation.js

const CONTAINER_ID = 'progressContainer';

const renderProgressBar = (container) => {
  const flow = window.flowState || { pages: [], current: '', completed: 0 };
  const steps = flow.pages || [];
  const currentId = flow.current || '';
  const completedCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length || 1;
  const percentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const currentIndex = steps.findIndex(s => s.id === currentId);

  container.innerHTML = `
    <div class="onboarding-progress">
      <div class="progress-header">
        <h3>Configuración de tu comercio</h3>
        <p class="progress-subtitle">
          Paso ${currentIndex >= 0 ? currentIndex + 1 : '?'} de ${totalSteps} • 
          <strong>${percentage}% completado</strong>
        </p>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>

      <div class="steps-grid">
        ${steps.map((step, idx) => `
          <div class="step-item ${step.completed ? 'completed' : ''} ${step.id === currentId ? 'current' : ''}">
            <div class="step-circle">
              ${step.completed ? '<i class="fas fa-check"></i>' : (idx + 1)}
            </div>
            <div class="step-label">${step.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

export const updateProgress = () => {
  const container = document.getElementById(CONTAINER_ID);
  if (container) renderProgressBar(container);
};

export const initNavigation = () => {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.warn('Progress container not found (#progressContainer)');
    return;
  }
  if (container.dataset.navInitialized === 'true') return;

  renderProgressBar(container);
  container.dataset.navInitialized = 'true';

  window.addEventListener('flowStateUpdated', updateProgress);
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}
