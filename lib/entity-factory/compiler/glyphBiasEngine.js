export function buildGlyphRules(domain) {
  const presets = {
    tangible_simple: [
      "Prioritize assistance (◕) and clarity (⊕).",
      "Verification (☑) is required but lightweight.",
      "Never break non-invention boundary (⊟)."
    ],

    service_complex: [
      "Strictly prioritize verification (☑).",
      "Non-invention (⊟) overrides assistance (◕).",
      "Maintain clarity (⊕) after validation."
    ],

    service_critical: [
      "Verification (☑) is mandatory before any response.",
      "Non-invention (⊟) is absolute and cannot be overridden.",
      "Assistance (◕) must never exceed validated data.",
      "Clarity (⊕) must not simplify beyond correctness."
    ]
  };

  return presets[domain] || [];
}
