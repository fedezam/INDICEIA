/**
 * Parser heurístico de consultas naturales.
 * Devuelve shape estandarizado + confidence por grupo.
 */

const TIPO_KEYWORDS = {
  veterinaria: ['veterinaria', 'veterinario', 'animal', 'mascota', 'pet'],
  restaurante: ['restaurante', 'comida', 'almuerzo', 'cena', 'parrilla'],
  farmacia:    ['farmacia', 'medicamento', 'remedio', 'droguería'],
  gimnasio:    ['gimnasio', 'entrenar', 'fitness', 'pesas', 'crossfit'],
  cafeteria:   ['cafetería', 'cafe', 'café', 'desayuno', 'merienda'],
  heladeria:   ['heladería', 'helado', 'postre helado'],
  petshop:     ['petshop', 'mascotas', 'alimento perro', 'accesorios animal'],
};

const INTENT_KEYWORDS = {
  urgencia:      ['urgencia', 'urgente', 'emergencia', 'ya', 'ahora mismo'],
  delivery:      ['delivery', 'envío', 'enviar', 'a domicilio', 'llevar'],
  visitarLocal:  ['ir', 'visitar', 'presencial', 'local', 'pasar'],
  takeaway:      ['retirar', 'buscar pedido', 'take away', 'takeaway'],
};

const TEMPORAL_KEYWORDS = {
  openNow: ['abierto ahora', 'abre ahora', 'ahora', 'en este momento', 'hoy'],
  weekend: ['fin de semana', 'sábado', 'domingo', 'sabado', 'finde'],
  night:   ['noche', 'de noche', 'tarde', '24 horas', 'madrugada'],
};

const CAPABILITY_KEYWORDS = {
  delivery:   ['delivery', 'envío', 'a domicilio', 'llevar'],
  pickup:     ['retirar', 'buscar', 'pick up', 'takeaway'],
  virtual:    ['online', 'web', 'ecommerce', 'digital'],
  presencial: ['ir', 'local', 'presencial', 'mostrador'],
};

const URGENCY_KEYWORDS = { high: ['urgente', 'emergencia', 'ya', 'corriendo'], medium: ['pronto', 'hoy', 'rápido'], low: [] };
const AUDIENCE_KEYWORDS = { familia: ['familia', 'hijos', 'niños'], amigos: ['amigos', 'grupo'], mascotas: ['mascota', 'perro', 'gato'] };
const OCCASION_KEYWORDS = { cena: ['cena', 'noche'], cumpleaños: ['cumpleaños', 'fiesta'], emergencia: ['emergencia', 'accidente', 'fiebre'] };

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').trim();
}

function detectGroup(normalized, map) {
  const matches = [];
  for (const [group, kws] of Object.entries(map)) {
    if (kws.some(k => normalized.includes(k))) matches.push(group);
  }
  return { matches, confidence: matches.length > 0 ? Math.min(0.6 + (matches.length - 1) * 0.2, 1) : 0.1 };
}

function detectTipo(normalized) {
  let best = null, max = 0;
  for (const [tipo, kws] of Object.entries(TIPO_KEYWORDS)) {
    const overlap = kws.filter(k => normalized.includes(k)).length;
    if (overlap > max) { max = overlap; best = tipo; }
  }
  return { tipo: best, confidence: max > 0 ? Math.min(0.5 + max * 0.25, 1) : 0.1 };
}

export function parseQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return { raw: '', normalized: '', tipo: null, intents: [], temporal: { openNow: false, weekend: false, night: false }, geo: { nearUser: false, nearCity: null }, capabilities: [], urgency: 'low', audience: null, occasion: null, confidence: { tipo: 0.1, intents: 0.1, temporal: 0.1, capabilities: 0.1, audience: 0.1, occasion: 0.1 } };
  }

  const normalized = normalize(rawQuery);
  const tipo = detectTipo(normalized);
  const intents = detectGroup(normalized, INTENT_KEYWORDS);
  const temporal = detectGroup(normalized, TEMPORAL_KEYWORDS);
  const caps = detectGroup(normalized, CAPABILITY_KEYWORDS);
  const audience = detectGroup(normalized, AUDIENCE_KEYWORDS);
  const occasion = detectGroup(normalized, OCCASION_KEYWORDS);

  let urgency = 'low';
  if (URGENCY_KEYWORDS.high.some(k => normalized.includes(k))) urgency = 'high';
  else if (URGENCY_KEYWORDS.medium.some(k => normalized.includes(k))) urgency = 'medium';
  else if (intents.matches.includes('urgencia')) urgency = 'high';

  return {
    raw: rawQuery,
    normalized,
    tipo: tipo.tipo,
    intents: intents.matches,
    temporal: { openNow: temporal.matches.includes('openNow'), weekend: temporal.matches.includes('weekend'), night: temporal.matches.includes('night') },
    geo: { nearUser: /(cerca|mío|mi zona|barrio)/i.test(rawQuery), nearCity: null },
    capabilities: caps.matches,
    urgency,
    audience: audience.matches[0] || null,
    occasion: occasion.matches[0] || null,
    confidence: {
      tipo: tipo.confidence,
      intents: intents.confidence,
      temporal: temporal.confidence,
      capabilities: caps.confidence,
      audience: audience.confidence,
      occasion: occasion.confidence,
    }
  };
}