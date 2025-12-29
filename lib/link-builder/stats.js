import { logEvent } from './utils/index.js';

export function recordStats(comercio_id, data) {
  // Fire-and-forget
  logEvent(comercio_id, data.event || 'unknown', null, null, { extra: data });
}
