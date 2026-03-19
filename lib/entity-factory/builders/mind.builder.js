import { enhanceMind } from '../compiler/index.js';

export function buildMind(data, context, referralCode) {
  const mind = JSON.parse(
    readFileSync(resolve(process.cwd(), 'api/entity-factory/base/mind.json'), 'utf-8')
  );

  const vars = {
    AI_NAME:         context.ia?.nombre || 'IA del comercio',
    NOMBRE_COMERCIO: context.nombre || 'este comercio',
    AI_PERSONALIDAD: context.ia?.personalidad || 'amigable',
    AI_TONO:         context.ia?.tono || 'neutral',
    MONEDA:          data.moneda || 'ARS',
    LIVE_ENABLED:    isLiveEnabled(data.plan).toString(),
    REFERRAL_URL:    `https://indiceia.app/guia?ref=${referralCode}`,
    VISUAL_AVAILABLE: context.visual ? "true" : "false",
    VISUAL_URL:       context.visual?.url || "",
    ...cognitiveVars(data.cognitive_permissions),
  };

  const instantiated = applyTemplate(mind, vars);

  return enhanceMind(instantiated, {
    rubro: data.rubro,
    cognitive_permissions: data.cognitive_permissions,
    visual: context.visual
  });
}
