// src/skeleton/layout/index.js
import { renderLayout } from './renderLayout.js';
import { updateHeader } from './header/update.js';

export function mountLayout(context) {
  renderLayout();  // crea estructura + renderiza header/banner/progress una sola vez

  // Desestructuramos para pasar exactamente lo que updateHeader espera
  const { userData, comercioData } = context;

  updateHeader({ userData, comercioData });
}
