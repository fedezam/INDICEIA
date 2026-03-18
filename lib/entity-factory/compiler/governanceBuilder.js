export function buildGovernance(domain) {
  const base = {
    safe: [
      "general world knowledge",
      "non-critical suggestions"
    ],
    restricted: [
      "attributes not in catalog"
    ],
    forbidden: [
      "prices not defined",
      "stock",
      "guarantees"
    ]
  };

  if (domain === "service_critical") {
    base.safe = ["general explanations only"];
    base.restricted.push("case-specific interpretation");
    base.forbidden.push("diagnosis", "legal advice");
  }

  return base;
}
