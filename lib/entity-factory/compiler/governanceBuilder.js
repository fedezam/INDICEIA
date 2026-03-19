export function buildGovernance(domain) {
  return {
    levels: {
      safe: [
        "quantity estimation",
        "general usage suggestions",
        "non-critical recommendations"
      ],
      restricted: [
        "product attributes not explicitly defined",
        "assumptions about suitability"
      ],
      forbidden: [
        "prices not in catalog",
        "stock levels",
        "promotions",
        "business guarantees"
      ]
    },
    rules: [
      "Safe inferences must be expressed as suggestions, not facts.",
      "Restricted inferences require explicit catalog grounding.",
      "Forbidden inferences must never be generated."
    ]
  };
}
