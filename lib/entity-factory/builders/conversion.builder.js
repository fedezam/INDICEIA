// ============================================================
// lib/entity-factory/builders/conversion.builder.js
// ============================================================

import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { hasData }      from '../utils/hasData.js';

const INTENT_MAP = {
  comercio:    'order',
  prestador:   'quote',
  profesional: 'appointment',
};

function loadTemplates() {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), 'lib/entity-factory/base/conversion.json'), 'utf-8')
  );
}

/**
 * Construye el bloque conversion del entity output.
 *
 * @param {object} context    — output de buildContext()
 * @param {string} entityType — 'comercio' | 'prestador' | 'profesional'
 * @returns {object|null}
 */
export function buildConversion(context, entityType) {
  const intent_type = INTENT_MAP[entityType] ?? 'order';

  const { templates, rules } = loadTemplates();
  const template = templates[intent_type];

  if (!template) {
    console.warn(`[conversion-builder] No template found for intent_type: ${intent_type}`);
    return null;
  }

  // Teléfono — whatsapp tiene prioridad
  const phone =
    context.contacto?.whatsapp ||
    context.contacto?.telefono ||
    '';

  if (!hasData(phone)) {
    console.warn('[conversion-builder] Sin teléfono — bloque conversion omitido');
    return null;
  }

  // Resolver NOMBRE_COMERCIO en build time — no dejarlo al LLM
  const message_template = template.message_template
    .replace('{{NOMBRE_COMERCIO}}', context.nombre || '');

  return {
    intent_type,
    channel:  'whatsapp',
    phone,
    cta:      template.cta,
    message_template,
    placeholders: {
      required: template.required_placeholders.filter(p => p !== 'NOMBRE_COMERCIO'),
      optional: template.optional_placeholders,
    },
    rules,
  };
}
