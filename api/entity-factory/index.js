// lib/entity-factory/builders/capabilities.builder.js
// ⟦ROLE⟧ Compila capabilities + contacto → formato comprimido para LLM.
// Lee fuente humana → output optimizado. NO modifica JSON base.

import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { hasData }      from '../utils/hasData.js';

// Modo de cada canal — define cómo el LLM debe usarlo
const CHANNEL_MODE = {
  whatsapp:  'primary',
  telefono:  'call',
  email:     'mailto_link',
  website:   'link',
  instagram: 'copy_paste',
  facebook:  'copy_paste',
  tiktok:    'copy_paste',
};

export function buildCapabilities(context) {
  const base = JSON.parse(
    readFileSync(resolve(process.cwd(), 'api/entity-factory/base/capabilities.json'), 'utf-8')
  );

  // ── CHANNELS ─────────────────────────────────────────────────
  // Construye channels desde contacto del context.
  // Incluye value para canales que el LLM necesita mostrar.

  const channels = {};
  const contacto = context.contacto ?? {};

  Object.entries(contacto).forEach(([channel, value]) => {
    if (!hasData(value)) return;
    const mode = CHANNEL_MODE[channel];
    if (!mode) return;
    channels[channel] = { enabled: true, mode, value };
  });

  // ── TEMPLATES ────────────────────────────────────────────────
  // Solo si hay canales que los necesiten (email → mailto, redes → social)

  const templates = {};
  const hasEmail  = channels.email;
  const hasSocial = channels.instagram || channels.facebook || channels.tiktok;

  const mailto = base.templates_canonicos?.EMAIL_CON_LINK?.mailto;
  if (hasEmail && mailto) {
    templates.mailto = {
      subject: mailto.subject,
      body:    Array.isArray(mailto.body) ? mailto.body.join('\n') : mailto.body,
    };
  }

  const social = base.templates_canonicos?.MENSAJE_CANONICO?.formato;
  if (hasSocial && social) {
    templates.social = Array.isArray(social) ? social.join('\n') : social;
  }

  // ── RULES (LER) ───────────────────────────────────────────────
  const rules = '⟦whatsapp:primary ∧ ¬disabled_channels ∧ ¬invent_channels⟧';

  return {
    ...(Object.keys(channels).length  && { channels }),
    ...(Object.keys(templates).length && { templates }),
    rules,
  };
}
