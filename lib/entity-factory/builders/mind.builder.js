import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { applyTemplate } from '../utils/template.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const LIVE_PLANS = ['trial', 'pro', 'highvalue', 'premium'];

function isLiveEnabled(plan) {
  const type = typeof plan === 'object' ? plan?.type : plan;
  return LIVE_PLANS.includes(type);
}

function cognitiveVars(cognitivePermissions = {}) {
  const enabled = (key) => (cognitivePermissions[key]?.enabled === true).toString();
  return {
    EXPLAIN_SERVICES:             enabled('explain_services'),
    RELATE_CATALOG_ITEMS:         enabled('relate_catalog_items'),
    INFER_INTENT:                 enabled('infer_intent'),
    SIMPLIFY_LANGUAGE:            enabled('simplify_language'),
    COMPARE_OFFERED_OPTIONS:      enabled('compare_offered_options'),
    JUSTIFY_RECOMMENDATIONS:      enabled('justify_recommendations'),
    MAINTAIN_CONVERSATION_CONTEXT: enabled('maintain_conversation_context'),
    WEB_SEARCH_CONTEXTUAL:        enabled('web_search_contextual'),
  };
}

/**
 * Construye el bloque mind.
 * Lee base/mind.json, reemplaza variables de sistema y cognitive_permissions.
 */
export function buildMind(data, context, referralCode) {
  const mind = JSON.parse(
    readFileSync(resolve(process.cwd(), 'api/entity-factory/base/mind.json'), 'utf-8')
  );

  const vars = {
    AI_NAME:         context.ia?.nombre       || 'IA del comercio',
    NOMBRE_COMERCIO: context.nombre           || 'este comercio',
    AI_PERSONALIDAD: context.ia?.personalidad || 'amigable',
    AI_TONO:         context.ia?.tono         || 'neutral',
    MONEDA:          data.moneda              || 'ARS',
    LIVE_ENABLED:    isLiveEnabled(data.plan).toString(),
    REFERRAL_URL:    `https://indiceia.app/guia?ref=${referralCode}`,
    ...cognitiveVars(data.cognitive_permissions),
  };

  return applyTemplate(mind, vars);
}
