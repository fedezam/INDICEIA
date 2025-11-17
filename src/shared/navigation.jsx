// src/shared/navigation.jsx
// Navigation — Solo UI, sin navegación

class Navigation {
  static init() {
    if (!window.flowState) {
      console.warn("Navigation: flowState no está definido");
      return;
    }

    this.renderProgressBar();
    this.renderNavigationButtons();
  }

  /** ------------------------------
   *  Render Progress Bar
   * -------------------------------*/
  static renderProgressBar() {
    const container =
      document.getElementById("progressContainer") ||
      document.querySelector(".progress-indicator");
    if (!container) return;

    const { pages, completed, current } = window.flowState;

    const progressPercent = Math.round(
      (completed.length / pages.length) * 100
    );

    container.innerHTML = `
      <div class="progress-header">
        <div class="progress-title">Configuración de tu IA Comercial</div>
        <div class="progress-subtitle">Completa todos los pasos para activarla</div>
      </div>

      <div class="completion-indicator">
        <div class="completion-bar">
          <div class="completion-fill"
               style="width: ${progressPercent}%"></div>
        </div>
        <div class="completion-text">
          ${progressPercent}% completado
        </div>
      </div>

      <div class="progress-steps">
        ${pages
          .map((p) => {
            const isCompleted = completed.includes(p.id);
            const isCurrent = p.id === current.id;

            return `
              <div class="step
                          ${isCompleted ? "active" : ""}
                          ${isCurrent ? "current" : ""}">
                <div class="step-icon">
                  <i class="${p.icon}"></i>
                </div>
                <div class="step-name">${p.name}</div>
                ${isCompleted ? '<i class="fas fa-check step-check"></i>' : ""}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  /** ------------------------------
   *  Botones (solo apariencia)
   * -------------------------------*/
  static renderNavigationButtons() {
    const container = document.getElementById("navigationControls");
    if (!container) return;

    const { current, completed, pages } = window.flowState;

    const isCurrentCompleted = completed.includes(current.id);
    const isLast = current.index === pages.length - 1;

    container.innerHTML = `
      <div class="nav-buttons">
        <button class="btn btn-secondary" id="prevBtn" disabled>
          <i class="fas fa-arrow-left"></i> Atrás
        </button>

        <button class="btn btn-primary" id="nextBtn" ${isCurrentCompleted ? "" : "disabled"}>
          ${
            isLast
              ? 'Finalizar <i class="fas fa-check"></i>'
              : 'Siguiente <i class="fas fa-arrow-right"></i>'
          }
        </button>
      </div>

      <div class="nav-info">
        Página ${current.index + 1} de ${pages.length}
      </div>
    `;
  }
}

window.Navigation = Navigation;
export default Navigation;
