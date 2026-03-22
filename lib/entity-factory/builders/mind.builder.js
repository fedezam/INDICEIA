import { readFileSync } from 'fs';
import { resolve } from 'path';
import { applyTemplate } from '../utils/template.js';
import { shapeAttractor } from '../compiler/shapeAttractor.js';

export function buildMind(data, context, referralCode) {
  const base = JSON.parse(
    readFileSync(resolve(process.cwd(), 'api/entity-factory/base/mind.json'), 'utf-8')
  );

  const vars = {
    AI_NAME:          context.ia?.nombre || 'AI Assistant',
    NOMBRE_COMERCIO:  context.nombre || 'this business',
    AI_PERSONALIDAD:  context.ia?.personalidad || 'friendly',
    AI_TONO:          context.ia?.tono || 'neutral',
    VISUAL_AVAILABLE: context.visual ? true : false,
    VISUAL_URL:       context.visual?.url || "",
  };

  const mind = applyTemplate(base, vars);
  if (mind.visual) mind.visual.available = context.visual ? true : false;
  return shapeAttractor(mind, {
    rubro: data.rubro || "generic"
  });
}