// src/shared/navigation.jsx
// Navigation — versión final (solo UI, sin lógica de flujo)

import { showToast } from "./utils.jsx";

class Navigation {
  /**
   * Inicializa la barra de progreso y los botones
   * Requiere que window.flowState ya esté disponible
   */
  static init() {
    if (!window.flowState) {
      console.warn("Navigation: flowState no está definido");
      return;
    }

    this.renderProgressBar();
    this.renderNavigationButtons();
    this.bindEvents();
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
               id="completionFill"
               style="width: ${progressPercent}%"></div>
        </div>
        <div class="completion-text" id="completionText">
          ${progressPercent}% completado
        </div>
      </div>

      <div class="progress-steps" id="progressSteps">
        ${pages
          .map((p, index) => {
            const isCompleted = completed.includes(p.id);
            const isCurrent = p.id === current.id;

            return `
              <div class="step
                          ${isCompleted ? "active" : ""}
                          ${isCurrent ? "current" : ""}"
                   onclick="Navigation.goTo('${p.id}')">

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
   *  Botones
   * -------------------------------*/
  static renderNavigationButtons() {
    const container = document.getElementById("navigationControls");
    if (!container) return;

    const { current, previous, next, completed, pages } = window.flowState;

    const isCurrentCompleted = completed.includes(current.id);
    const isLast = next === null;

    container.innerHTML = `
      <div class="nav-buttons">
        <button class="btn btn-secondary"
                id="prevBtn"
                ${previous ? "" : "disabled"}>
          <i class="fas fa-arrow-left"></i> Atrás
        </button>

        <button class="btn btn-primary"
                id="nextBtn"
                ${isCurrentCompleted ? "" : "disabled"}>
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

  /** ------------------------------
   *  Eventos
   * -------------------------------*/
  static bindEvents() {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (prevBtn) {
      prevBtn.onclick = () => this.goPrev();
    }

    if (nextBtn) {
      nextBtn.onclick = () => this.goNext();
    }
  }

  /** ------------------------------
   *  Acciones (sin lógica)
   * -------------------------------*/

  static goTo(pageId) {
    // Solo manda a flow-redirect con un parámetro
    window.location.href = `/src/controllers/flow-redirect.html?page=${pageId}`;
  }

  static goPrev() {
    window.location.href = `/src/controllers/flow-redirect.html?nav=prev`;
  }

  static goNext() {
    window.location.href = `/src/controllers/flow-redirect.html?nav=next`;
  }
}

window.Navigation = Navigation;
export default Navigation;
