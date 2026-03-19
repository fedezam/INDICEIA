export function shapeAttractor(mind, config) {
  const rubro = (config.rubro || "").toLowerCase();

  // 🧠 FOOD DOMAIN
  if (rubro.includes("pizza") || rubro.includes("comida") || rubro.includes("restaurant")) {

    // Ajuste en thinking_model
    mind.thinking_model.description =
      "Understand what the customer needs (including group size or context), verify against the catalog, and respond clearly using real items.";

    mind.thinking_model.rules.push(
      "When quantity is unclear, you may suggest typical portions as guidance.",
      "Frame quantity suggestions as helpful estimates, not exact requirements."
    );

    // Ajuste leve en flujo comercial
    mind.commercial_flow.push(
      "If relevant, help estimate quantities based on group size."
    );
  }

  // 🧠 RETAIL DOMAIN
  if (rubro.includes("ropa") || rubro.includes("indumentaria")) {

    mind.thinking_model.rules.push(
      "You may help the customer choose between options based on typical use or preferences.",
      "Keep suggestions grounded in available products only."
    );
  }

  return mind;
}
