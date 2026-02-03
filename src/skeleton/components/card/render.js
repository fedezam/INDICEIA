// src/skeleton/components/card/render.js
import './card.css';

/**
 * Renderiza la estructura base de una card
 * Retorna el elemento DOM para que pueda ser montado donde se necesite
 */
export function renderCard() {
  const card = document.createElement('div');
  card.className = 'dash-card';
  
  card.innerHTML = `
    <div class="dash-icon">
      <i class="fas fa-box"></i>
    </div>
    <div class="dash-content">
      <h3>Título</h3>
      <p>Descripción</p>
    </div>
  `;
  
  return card;
}

/**
 * Renderiza una card con acciones (botones)
 */
export function renderCardWithActions() {
  const card = document.createElement('div');
  card.className = 'dash-card';
  
  card.innerHTML = `
    <div class="dash-icon">
      <i class="fas fa-box"></i>
    </div>
    <div class="dash-content">
      <h3>Título</h3>
      <p>Descripción</p>
    </div>
    <div class="dash-actions">
      <!-- Los botones se agregan dinámicamente -->
    </div>
  `;
  
  return card;
}
