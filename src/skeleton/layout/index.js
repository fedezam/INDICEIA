// src/skeleton/layout/index.js
import { renderLayout } from './renderLayout.js';
import { updateHeader } from './header/update.js';

export function mountLayout(context) {
  renderLayout();           // crea estructura + renderiza header/banner/progress una sola vez
  updateHeader(context);    // actualiza solo los textos y el evento de logout
}
