// src/skeleton/components/card/update.js

/**
 * Actualiza una card con datos reales
 * 
 * @param {HTMLElement} cardElement - El elemento DOM de la card
 * @param {Object} data - Datos de la card
 * @param {string} data.title - Título de la card
 * @param {string} data.icon - Clase del icono (ej: 'fas fa-store')
 * @param {string} [data.description] - Descripción opcional
 * @param {Function} [data.onClick] - Función a ejecutar al hacer click
 * @param {Array} [data.actions] - Array de botones/acciones
 * @param {boolean} [data.disabled] - Si la card está deshabilitada
 * @param {boolean} [data.highlighted] - Si la card está destacada
 */
export function updateCard(cardElement, data) {
  if (!cardElement || !data) {
    console.error('updateCard requiere cardElement y data');
    return;
  }

  // Actualizar icono
  if (data.icon) {
    const iconElement = cardElement.querySelector('.dash-icon i');
    if (iconElement) {
      iconElement.className = data.icon;
    }
  }

  // Actualizar título
  if (data.title) {
    const titleElement = cardElement.querySelector('.dash-content h3');
    if (titleElement) {
      titleElement.textContent = data.title;
    }
  }

  // Actualizar descripción
  if (data.description) {
    let descElement = cardElement.querySelector('.dash-content p');
    if (!descElement) {
      descElement = document.createElement('p');
      cardElement.querySelector('.dash-content').appendChild(descElement);
    }
    descElement.textContent = data.description;
  }

  // Manejar click principal de la card
  if (data.onClick) {
    cardElement.style.cursor = 'pointer';
    cardElement.addEventListener('click', (e) => {
      // Solo ejecutar si no se clickeó un botón de acción
      if (!e.target.closest('.dash-actions')) {
        data.onClick(data);
      }
    });
  }

  // Agregar acciones (botones)
  if (data.actions && data.actions.length > 0) {
    let actionsContainer = cardElement.querySelector('.dash-actions');
    
    if (!actionsContainer) {
      actionsContainer = document.createElement('div');
      actionsContainer.className = 'dash-actions';
      cardElement.appendChild(actionsContainer);
    }

    actionsContainer.innerHTML = '';

    data.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = `btn ${action.className || 'btn-primary'}`;
      btn.innerHTML = `
        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
        ${action.label}
      `;

      if (action.onClick) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Evitar que se dispare el click de la card
          action.onClick(data);
        });
      }

      actionsContainer.appendChild(btn);
    });
  }

  // Estados especiales
  if (data.disabled) {
    cardElement.classList.add('disabled');
  }

  if (data.highlighted) {
    cardElement.classList.add('highlighted');
  }

  return cardElement;
}

/**
 * Helper para crear y actualizar una card en un solo paso
 */
export function createAndUpdateCard(data) {
  const { renderCard } = require('./render.js');
  const card = renderCard();
  return updateCard(card, data);
}
