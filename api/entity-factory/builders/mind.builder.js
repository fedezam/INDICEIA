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

function buildCognitivePermissions(cognitivePermissions = {}) {
  const result = {};
  for (const [key, value] of Object.entries(cognitivePermissions)) {
    if (value?.enabled === true) result[key] = value;
  }
  return result;
}

/**
 * Construye el bloque mind.
 * Lee base/mind.json, reemplaza variables de sistema, agrega cognitive_permissions si hay.
 */
export function buildMind(data, context, referralCode) {
  const mind = JSON.parse(
    readFileSync(resolve(__dirname, '../base/mind.json'), 'utf-8')
  );

  const vars = {
    AI_NAME:              context.ia?.nombre       || 'IA del comercio',
    NOMBRE_COMERCIO:      context.nombre           || 'este comercio',
    AI_PERSONALIDAD:      context.ia?.personalidad || 'amigable',
    AI_TONO:              context.ia?.tono         || 'neutral',
    MONEDA:               data.moneda              || 'ARS',
    LIVE_ENABLED:         isLiveEnabled(data.plan).toString(),
    REFERRAL_URL:         `https://indiceia.app/guia?ref=${referralCode}`,
    PERMITE_BUSQUEDA_WEB: 'false',
  };

  const mindProcessed = applyTemplate(mind, vars);

  const cognitivePermissions = buildCognitivePermissions(data.cognitive_permissions);
  if (Object.keys(cognitivePermissions).length > 0) {
    mindProcessed.cognitive_permissions = cognitivePermissions;
  }

  return mindProcessed;
}
