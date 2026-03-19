import { classifyDomain } from './domainClassifier.js';
import { mapCognition } from './cognitionMapper.js';
import { buildGovernance } from './governanceBuilder.js';
import { applyGlyphBias } from './glyphBiasEngine.js';

export function enhanceMind(baseMind, config) {
  const domain = classifyDomain(config.rubro);

  const cognition = mapCognition(config.cognitive_permissions, domain);

  const governance = buildGovernance(domain);

  const glyphBias = applyGlyphBias(domain);

  return {
    ...baseMind,

    cognition,
    inference_governance: governance,
    glyph_priority_rules: glyphBias
  };
}
