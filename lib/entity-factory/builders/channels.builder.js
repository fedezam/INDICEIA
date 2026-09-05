// lib/entity-factory/builders/channels.builder.js
// ⟦ROLE⟧ Compila canales de contacto → formato comprimido para LLM.
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

// Canales que exponen el número físico del comercio. En entidades
// demo (context.isDemo) se excluyen del entity.json compilado —
// el dato sigue existiendo en Firestore (se carga igual que en
// cualquier comercio real, sin flags especiales en el onboarding),
// simplemente no llega al contrato que lee el LLM. Concepto: si el
// campo no existe en el output, no hay ambigüedad que el LLM tenga
// que resolver con una regla aparte (ver demo_mode en closers/order.js
// para el mismo criterio aplicado del lado del cierre de pedido).
const CANALES_CON_NUMERO_FISICO = ['whatsapp', 'telefono'];

export function buildChannels(context) {
  const base = JSON.parse(
    readFileSync(resolve(process.cwd(), 'api/entity-factory/base/channels.json'), 'utf-8')
  );
  // ── CHANNELS ─────────────────────────────────────────────────
  // Construye channels desde contacto del context.
  // Incluye value para canales que el LLM necesita mostrar.
  const isDemo = context.isDemo === true;
  const channels = {};
  const contacto = context.contacto ?? {};
  Object.entries(contacto).forEach(([channel, value]) => {
    if (!hasData(value)) return;
    if (isDemo && CANALES_CON_NUMERO_FISICO.includes(channel)) return;
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
  // whatsapp:primary solo tiene sentido si el canal whatsapp
  // efectivamente está en el output — en demo se excluye arriba
  // (CANALES_CON_NUMERO_FISICO), así que afirmarlo acá sería decirle
  // al LLM que tiene un canal que no tiene. El resto de la regla
  // (¬disabled_channels ∧ ¬invent_channels) es universal, aplica
  // siempre haya o no whatsapp.
  const rules = channels.whatsapp
    ? '⟦whatsapp:primary ∧ ¬disabled_channels ∧ ¬invent_channels⟧'
    : '⟦¬disabled_channels ∧ ¬invent_channels⟧';
  return {
    ...(Object.keys(channels).length  && { channels }),
    ...(Object.keys(templates).length && { templates }),
    rules,
  };
}
