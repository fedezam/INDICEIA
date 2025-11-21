// src/shared/navigation.jsx
class Navigation {
  static init() {
    if (!window.flowState) {
      console.warn("Navigation: flowState no está definido");
      return;
    }
    this.renderProgressBar();
  }

  static renderProgressBar() {
    const container = document.getElementById("progressContainer");
    if (!container) return;

    const { pages, completed, current } = window.flowState;
    const progressPercent = Math.round((completed.length / pages.length) * 100);

    container.innerHTML = `
      <div class="onboarding-progress">
        <div class="progress-header">
          <h3>Configuración de tu IA Comercial</h3>
          <p class="progress-subtitle">Paso ${current.index + 1} de ${pages.length} • ${progressPercent}% completado</p>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <div class="steps-grid">
          ${pages.map(p => {
            const isCompleted = completed.includes(p.id);
            const isCurrent = p.id === current.id;
            return `
              <div class="step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="step-circle">
                  ${isCompleted ? '<i class="fas fa-check"></i>' : '<span>' + (p.index + 1) + '</span>'}
                </div>
                <div class="step-label">${p.name}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

window.Navigation = Navigation;
export default Navigation;
