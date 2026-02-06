import { renderBadge } from './render';
import { updateBadge } from './update';

export function createBadge(config = {}) {
  const badge = renderBadge();
  updateBadge(badge, config);
  return badge;
}
