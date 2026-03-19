export function classifyDomain(rubro = "") {
  const r = rubro.toLowerCase();

  if (r.includes("pizza") || r.includes("comida") || r.includes("restaurant")) {
    return "food";
  }

  if (r.includes("ropa") || r.includes("indumentaria")) {
    return "retail";
  }

  return "generic";
}
