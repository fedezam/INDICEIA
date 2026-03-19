export function applyGlyphBias(domain) {
  return {
    priority: ["☑", "⊟", "⊕", "⦿"],
    weights: {
      "☑": 1.0,
      "⊟": 1.0,
      "⊕": 0.9,
      "⦿": 0.8,
      "◕": 0.5
    }
  };
}
