import { classifyDomain } from "./domainClassifier.js";
import { mapCognition } from "./cognitionMapper.js";
import { buildGovernance } from "./governanceBuilder.js";
import { buildGlyphRules } from "./glyphBiasEngine.js";
import { assembleMind } from "./mindAssembler.js";

export function compileMind(config) {
  const domain = classifyDomain(config.rubro);

  const cognition = mapCognition(domain);
  const governance = buildGovernance(domain);
  const glyphRules = buildGlyphRules(domain);

  return assembleMind({
    config,
    domain,
    cognition,
    governance,
    glyphRules
  });
}
