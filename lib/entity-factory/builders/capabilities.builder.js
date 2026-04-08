// lib/entity-factory/builders/capabilities.builder.js
// ⟦ROLE⟧ Compila cognitive_permissions → LER comprimido para el LLM.
// Lee cognitive_permissions del comercioData (guardado por capacidadesCognitivas.js).
// Output: bloque CAP_COG con keys enabled + regla de contención.
// Si ninguna está enabled → null (bloque omitido del entity.json).

// Keys válidos — coordenadas semánticas puras, fuera del vocabulario de source code.
// El LLM tiene grounding nativo de estos conceptos — no necesitan label ni description.
const VALID_KEYS = new Set([
  'explain_services',
  'relate_catalog_items',
  'infer_intent',
  'simplify_language',
  'compare_offered_options',
  'justify_recommendations',
  'maintain_conversation_context',
  'web_search_contextual',
]);

/**
 * Construye el bloque capabilities cognitivas del entity output.
 *
 * @param {object} comercioData — datos crudos del comercio (Firestore)
 * @returns {object|null}
 */
export function buildCapabilities(comercioData) {
  const raw = comercioData?.cognitive_permissions ?? {};

  // Filtrar solo los enabled y con key válido
  const enabled = Object.entries(raw)
    .filter(([key, val]) => VALID_KEYS.has(key) && val?.enabled === true)
    .map(([key]) => key);

  if (!enabled.length) return null;

  // LER comprimido — keys como coordenadas semánticas unidas por ∧
  // Regla de contención: el LLM no puede inventar catálogo ni consultar datos externos
  const ler = `⟦${enabled.join('∧')}⟧∧⛔¬invent_catalog∧¬external_data`;

  return { CAP_COG: ler };
}
