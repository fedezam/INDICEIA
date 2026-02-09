// src/skeleton/layout/index.js

import { renderLayout } from './renderLayout.js';
import { updateHeader } from './header/update.js';

/**
 * Monta el layout (solo si no existe) y actualiza con datos
 */
export function mountLayout(context) {
  // ✅ Solo renderiza si no existe (idempotente)
  if (!document.getElementById('skeleton-root')) {
    renderLayout();
  }

  // Extraemos SOLO lo que updateHeader necesita
  const { userData, comercioData } = context;

  console.log('📍 mountLayout → userData:', userData);
  console.log('📍 mountLayout → comercioData:', comercioData);

  updateHeader({ userData, comercioData });
}
