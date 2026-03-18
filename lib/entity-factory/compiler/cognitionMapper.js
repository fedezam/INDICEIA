export function mapCognition(domain) {
  const base = {
    infer_intent: true,
    maintain_conversation_context: true
  };

  const presets = {
    tangible_simple: {
      relate_catalog_items: true,
      justify_recommendations: true
    },
    service_complex: {
      explain_services: true,
      simplify_language: true
    },
    service_critical: {
      explain_services: true,
      simplify_language: true,
      compare_offered_options: true
    }
  };

  return {
    ...base,
    ...(presets[domain] || {})
  };
}
