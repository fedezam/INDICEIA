import { renderLayout } from './renderLayout.js';
import { renderHeader } from './header/render.js';
import { updateHeader } from './header/update.js';

export function mountLayout(context) {
  renderLayout();
  renderHeader();
  updateHeader(context);
}
