// navigation.js - Control de navegación y progress bar
import { LocalData, Utils } from './shared.js';

class Navigation {
  // Configuración de páginas y orden
  // Configuración de páginas y orden
  static pages = [
    { id: 'mi-comercio', name: 'Mi Comercio', url: 'mi-comercio.html', icon: 'fas fa-store' },
    { id: 'horarios', name: 'Horarios', url: 'horarios.html', icon: 'fas fa-clock' },
    { id: 'productos', name: 'Productos', url: 'productos.html', icon: 'fas fa-boxes' },
    { id: 'mi-ia', name: 'IA Config', url: 'mi-ia.html', icon: 'fas fa-robot' }
  ];

  // Obtener página actual desde URL
  static getCurrentPage() {
    const path = window.location.pathname;
    const currentPage = this.pages.find(page => path.includes(page.id));
    return currentPage || this.pages[0];
  }

  // Obtener índice de página actual
  static getCurrentPageIndex() {
    const current = this.getCurrentPage();
    return this.pages.findIndex(page => page.id === current.id);
  }

  // Inicializar navigation en una página
  static init() {
    this.renderProgressBar();
    this.renderNavigationButtons();
    this.updateProgressBar();
    this.bindEventListeners();
  }

  // Renderizar progress bar
  static renderProgressBar() {
    const container = document.getElementById('progressContainer') || document.querySelector('.progress-indicator');
    if (!container) return;

    const currentPageIndex = this.getCurrentPageIndex();
    const progressPercent = Math.round(((currentPageIndex + 1) / this.pages.length) * 100);

    container.innerHTML = `
      <div class="progress-header">
        <div class="progress-title">Configuración de tu IA Comercial</div>
        <div class="progress-subtitle">Completa todos los pasos para tener tu asistente listo</div>
      </div>
      <div class="completion-indicator">
        <div class="completion-bar">
          <div class="completion-fill" id="completionFill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="completion-text" id="completionText">${progressPercent}% completado</div>
      </div>
      <div class="progress-steps" id="progressSteps">
        ${this.pages.map((page, index) => `
          <div class="step ${index <= currentPageIndex ? 'active' : ''} ${index === currentPageIndex ? 'current' : ''}" 
               data-page="${page.id}" onclick="Navigation.goToPage('${page.id}')">
            <div class="step-icon">
              <i class="${page.icon}"></i>
            </div>
            <div class="step-name">${page.name}</div>
            ${index < currentPageIndex ? '<i class="fas fa-check step-check"></i>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Renderizar botones de navegación
  static renderNavigationButtons() {
    let container = document.getElementById('navigationControls');
    if (!container) {
      // Si no existe, crear al final de main-content
      const mainContent = document.querySelector('.main-content') || document.querySelector('.container');
      if (mainContent) {
        container = document.createElement('div');
        container.id = 'navigationControls';
        container.className = 'navigation-controls';
        mainContent.appendChild(container);
      }
    }

    if (!container) return;

    const currentIndex = this.getCurrentPageIndex();
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < this.pages.length - 1;

    container.innerHTML = `
      <div class="nav-buttons">
        <button class="btn btn-secondary" id="prevBtn" ${!hasPrev ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i> Atrás
        </button>
        <button class="btn btn-primary" id="nextBtn" ${!hasNext ? 'disabled' : ''}>
          ${hasNext ? 'Siguiente' : 'Finalizado'} <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      <div class="nav-info">
        Página ${currentIndex + 1} de ${this.pages.length}
      </div>
    `;
  }

  // Actualizar progress bar dinámicamente
  static updateProgressBar() {
    const shared = LocalData.getSharedData();
    const completedSections = shared.completedSections || [];
    
    // Actualizar steps según secciones completadas
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
      const pageId = this.pages[index].id;
      const isCompleted = completedSections.includes(pageId);
      const isCurrent = index === this.getCurrentPageIndex();
      
      step.classList.toggle('completed', isCompleted);
      step.classList.toggle('current', isCurrent);
      
      // Agregar/remover check
      const existingCheck = step.querySelector('.step-check');
      if (isCompleted && !existingCheck) {
        step.insertAdjacentHTML('beforeend', '<i class="fas fa-check step-check"></i>');
      } else if (!isCompleted && existingCheck) {
        existingCheck.remove();
      }
    });

    // Actualizar barra de progreso
    const completionPercent = Math.round((completedSections.length / this.pages.length) * 100);
    const fillElement = document.getElementById('completionFill');
    const textElement = document.getElementById('completionText');
    
    if (fillElement) fillElement.style.width = `${completionPercent}%`;
    if (textElement) textElement.textContent = `${completionPercent}% completado`;
  }

  // Bind event listeners
  static bindEventListeners() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.goToPreviousPage());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.goToNextPage());
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.goToPreviousPage();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.goToNextPage();
        }
      }
    });
  }

  // Ir a página específica
  static goToPage(pageId) {
    const page = this.pages.find(p => p.id === pageId);
    if (page) {
      // Guardar página actual antes de navegar
      LocalData.updateSharedData({ 
        currentStep: pageId,
        lastNavigation: new Date().toISOString()
      });
      
      window.location.href = page.url;
    }
  }

  // Ir a página anterior
  static goToPreviousPage() {
    const currentIndex = this.getCurrentPageIndex();
    if (currentIndex > 0) {
      this.goToPage(this.pages[currentIndex - 1].id);
    }
  }

  // Ir a página siguiente (con validación)
  static async goToNextPage() {
    const currentIndex = this.getCurrentPageIndex();
    const currentPage = this.pages[currentIndex];
    
    // Validar página actual antes de continuar
    const isValid = await this.validateCurrentPage();
    if (!isValid) {
      Utils.showToast('Campos incompletos', 'Por favor completa todos los campos requeridos antes de continuar', 'warning');
      return;
    }

    // Marcar página actual como completada
    this.markPageAsCompleted(currentPage.id);

    // Ir a siguiente página
    if (currentIndex < this.pages.length - 1) {
      this.goToPage(this.pages[currentIndex + 1].id);
    } else {
      // Última página - mostrar mensaje de finalización
      Utils.showToast('¡Configuración completa!', 'Tu IA comercial está lista para usar', 'success');
    }
  }

  // Validar página actual (override en cada página específica)
  static async validateCurrentPage() {
    const currentPage = this.getCurrentPage();
    
    // Llamar función de validación específica de cada página si existe
    if (window.validateCurrentPageData && typeof window.validateCurrentPageData === 'function') {
      return await window.validateCurrentPageData();
    }
    
    // Validación genérica - verificar campos required
    const form = document.querySelector('form');
    if (form) {
      const requiredFields = form.querySelectorAll('[required]');
      return Array.from(requiredFields).every(field => {
        if (field.type === 'checkbox') {
          return field.checked;
        }
        return field.value.trim() !== '';
      });
    }
    
    return true;
  }

  // Marcar página como completada
  static markPageAsCompleted(pageId) {
    const shared = LocalData.getSharedData();
    const completed = shared.completedSections || [];
    
    if (!completed.includes(pageId)) {
      completed.push(pageId);
      LocalData.updateSharedData({ 
        completedSections: completed,
        [`${pageId}_completed`]: new Date().toISOString()
      });
    }
  }

  // Verificar si página está completada
  static isPageCompleted(pageId) {
    const shared = LocalData.getSharedData();
    const completed = shared.completedSections || [];
    return completed.includes(pageId);
  }

  // Obtener progreso total
  static getOverallProgress() {
    const shared = LocalData.getSharedData();
    const completed = shared.completedSections || [];
    return {
      completed: completed.length,
      total: this.pages.length,
      percentage: Math.round((completed.length / this.pages.length) * 100),
      completedPages: completed,
      nextPage: this.getNextIncompletePage()
    };
  }

  // Obtener próxima página incompleta
  static getNextIncompletePage() {
    const shared = LocalData.getSharedData();
    const completed = shared.completedSections || [];
    
    for (const page of this.pages) {
      if (!completed.includes(page.id)) {
        return page;
      }
    }
    return null;
  }

  // Resetear progreso (útil para testing)
  static resetProgress() {
    LocalData.updateSharedData({ 
      completedSections: [],
      currentStep: 'mi-comercio'
    });
    this.updateProgressBar();
    this.renderNavigationButtons();
  }
}

// Auto-inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  // Solo inicializar en páginas del dashboard
  if (window.location.pathname.includes('/dashboard/')) {
    Navigation.init();
  }
});

// Exponer globalmente para uso en páginas individuales
window.Navigation = Navigation;

export default Navigation;
