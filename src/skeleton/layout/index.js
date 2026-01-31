// src/skeleton/layout/index.js
import { renderLayout } from './renderLayout.js';
import { updateHeader } from './header/update.js';

export function mountLayout(context) {
  renderLayout();  // crea estructura + renderiza header/banner/progress una sola vez

  // Extraemos SOLO lo que updateHeader necesita
  const { userData, comercioData } = context;

  // Log temporal para confirmar que llegan los datos reales
  console.log('mountLayout pasa a updateHeader → userData:', userData);
  console.log('mountLayout pasa a updateHeader → comercioData:', comercioData);

  updateHeader({ userData, comercioData });
}
