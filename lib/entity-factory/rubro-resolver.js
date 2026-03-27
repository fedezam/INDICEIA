// lib/entity-factory/rubro-resolver.js
// ⟦ROLE⟧ Pure data enrichment. NO LER | NO PROMPTS | NO SIDE EFFECTS

export function resolveRubro(context = {}, data = {}) {

  const rubroRaw = (context.categorias?.[0] || data.rubro || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let rubro = 'generic';
  let tags  = [];
  let mind_override = null;

  if (includesAny(rubroRaw, ['pizza', 'comida', 'restaurant'])) {
    rubro = 'food.restaurant';
    tags.push('food', 'quantities', 'group');
  }
  else if (includesAny(rubroRaw, ['ropa', 'indumentaria'])) {
    rubro = 'retail.clothing';
    tags.push('clothing', 'choice');
  }

  if (!tags.length) {
    if (Array.isArray(data?.goods))    tags.push('catalog');
    if (Array.isArray(data?.services)) tags.push('services');
  }

  return { rubro, tags, mind_override };
}

function includesAny(text, keywords = []) {
  return keywords.some(k => text.includes(k));
}
