import baseMind from "../base/mind_base.json";

export function assembleMind({
  config,
  cognition,
  governance,
  glyphRules
}) {
  const mind = JSON.parse(JSON.stringify(baseMind));

  // identidad
  mind.identidad.tono = config.tono;

  // cognition
  mind.cognition = cognition;

  // governance
  mind.inference_governance = governance;

  // glifos interpretados
  mind.glyph_priority_rules = glyphRules;

  // visual
  mind.visual.disponible = config.visual;
  mind.visual.url = config.visual_url || "";

  return mind;
}
