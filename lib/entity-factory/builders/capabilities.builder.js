import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { hasData } from '../utils/hasData.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Construye el bloque capabilities según base/capabilities.json.
 * Habilita canales según los datos de contacto del comercio.
 */
export function buildCapabilities(context) {
  const capabilities = JSON.parse(
    readFileSync(resolve(process.cwd(), 'api/entity-factory/base/capabilities.json'), 'utf-8')
  );

  // Habilitar canales según contacto disponible
  if (capabilities?.availableChannels && context.contacto) {
    Object.entries(capabilities.availableChannels).forEach(([channel, cfg]) => {
      if (typeof cfg === 'object') {
        cfg.enabled = hasData(context.contacto[channel]);
      }
    });
  }

  return capabilities;
}
