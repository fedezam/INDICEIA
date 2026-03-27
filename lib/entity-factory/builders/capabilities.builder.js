// lib/entity-factory/builders/capabilities.builder.js
// ⟦ROLE⟧ Compila capabilities.json base a formato comprimido.
// Lee fuente humana → output optimizado para LLM.
// NO modifica el JSON base.

import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { hasData }      from '../utils/hasData.js';

export function buildCapabilities(context) {
  const base = JSON.parse(
    readFileSync(resolve(process.cwd(), 'api/entity-factory/base/capabilities.json'), 'utf-8')
  );

  // ── CHANNELS ─────────────────────────────────────────────────
  // Solo canales habilitados por contacto disponible.
  // Elimina limitaciones, meta, descripciones.

  const channels = {};
  Object.entries(base.availableChannels).forEach(([channel, cfg]) => {
    const enabled = hasData(context.contacto?.[channel]);
    if (!enabled) return; // canales sin contacto no se incluyen
    channels[channel] = { enabled: true, mode: cfg.modo };
  });

  // ── TEMPLATES ────────────────────────────────────────────────
  // Colapsa arrays a strings. Elimina descripciones.

  const templates = {};

  const mailto = base.templates_canonicos?.EMAIL_CON_LINK?.mailto;
  if (mailto) {
    templates.mailto = {
      subject: mailto.subject,
      body:    Array.isArray(mailto.body) ? mailto.body.join('\n') : mailto.body,
    };
  }

  const social = base.templates_canonicos?.MENSAJE_CANONICO?.formato;
  if (social) {
    templates.social = Array.isArray(social) ? social.join('\n') : social;
  }

  // ── RULES (LER) ───────────────────────────────────────────────
  // reglas_globales colapsadas. El LLM infiere el resto.
  const rules = '⟦¬disabled_channels ∧ ¬invent_channels ∧ whatsapp:primary⟧';

  return {
    ...(Object.keys(channels).length  && { channels }),
    ...(Object.keys(templates).length && { templates }),
    rules,
  };
}
