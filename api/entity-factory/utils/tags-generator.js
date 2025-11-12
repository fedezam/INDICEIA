// /api/entity-factory/utils/tags-generator.js

/**
 * Generador de Tags Semánticos
 * Extrae keywords relevantes de nombres y descripciones
 * v2.1 – Optimizado para comercios generalistas (food + autos + inmuebles)
 */

export function generateSemanticTags(nombre = '', descripcion = '') {
  // 🧩 Normalización base
  const textRaw = `${nombre} ${descripcion}`.toLowerCase();
  const text = textRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quita acentos
  const tags = new Set();

  // ============ BLOQUE 1: COMIDA ============
  const foodKeywords = {
    queso: 'con queso',
    mozzarella: 'mozzarella',
    jamon: 'con jamón',
    tomate: 'con tomate',
    cebolla: 'con cebolla',
    morron: 'con morrón',
    aceituna: 'con aceitunas',
    champinion: 'con champiñones',
    huevo: 'con huevo',
    bacon: 'con bacon',
    panceta: 'con panceta',
    salame: 'con salame',
    pepperoni: 'pepperoni',
    anchoa: 'con anchoas',
    rucula: 'con rúcula',
    picante: 'picante',
    dulce: 'dulce',
    salado: 'salado',
    caliente: 'caliente',
    frio: 'frío',
    vegetariana: 'vegetariana',
    vegana: 'vegana',
    gluten: 'sin gluten',
    casera: 'casera',
    artesanal: 'artesanal',
    premium: 'premium',
    clasica: 'clásica',
    especial: 'especial',
    tradicional: 'tradicional',
    grande: 'tamaño grande',
    mediana: 'tamaño mediano',
    pequena: 'tamaño pequeño',
    individual: 'individual',
    familiar: 'familiar',
    pizza: 'pizza',
    empanada: 'empanada',
    hamburguesa: 'hamburguesa',
    sandwich: 'sandwich',
    ensalada: 'ensalada',
    bebida: 'bebida',
    cerveza: 'cerveza',
    vino: 'vino',
    gaseosa: 'gaseosa',
    agua: 'agua',
    jugo: 'jugo',
    postre: 'postre',
    helado: 'helado',
    torta: 'torta',
    cafe: 'café',
    te: 'té'
  };

  Object.entries(foodKeywords).forEach(([keyword, tag]) => {
    if (text.includes(keyword)) tags.add(tag);
  });

  // ============ BLOQUE 2: AUTOS ============
  const autoKeywords = {
    automatico: 'automático',
    manual: 'manual',
    diesel: 'diésel',
    nafta: 'nafta',
    gnc: 'GNC',
    electrico: 'eléctrico',
    hibrido: 'híbrido',
    '4x4': '4x4',
    suv: 'SUV',
    sedan: 'sedán',
    pickup: 'pickup',
    nuevo: 'nuevo',
    usado: 'usado',
    impecable: 'impecable',
    oportunidad: 'oportunidad',
    oferta: 'en oferta'
  };

  Object.entries(autoKeywords).forEach(([keyword, tag]) => {
    if (text.includes(keyword)) tags.add(tag);
  });

  // ============ BLOQUE 3: INMUEBLES ============
  const realEstateKeywords = {
    departamento: 'departamento',
    casa: 'casa',
    loft: 'loft',
    oficina: 'oficina',
    local: 'local comercial',
    terreno: 'terreno',
    amoblado: 'amoblado',
    garage: 'con garage',
    cochera: 'con cochera',
    jardin: 'con jardín',
    balcon: 'con balcón',
    terraza: 'con terraza',
    pileta: 'con pileta',
    piscina: 'con piscina'
  };

  Object.entries(realEstateKeywords).forEach(([keyword, tag]) => {
    if (text.includes(keyword)) tags.add(tag);
  });

  // ============ BLOQUE 4: NÚMEROS ============
  const numbers = text.match(/\d+/g);
  if (numbers) {
    numbers.forEach(num => {
      if (num.length === 4 && +num > 1900 && +num < 2100) tags.add(`año ${num}`);
      if (text.includes(`${num}ml`) || text.includes(`${num} ml`)) tags.add(`${num}ml`);
      if (text.includes(`${num}cm`) || text.includes(`${num} cm`)) tags.add(`${num}cm`);
      if (text.includes(`${num}m2`) || text.includes(`${num} m2`)) tags.add(`${num}m2`);
      if (text.includes(`${num}lts`) || text.includes(`${num} lts`)) tags.add(`${num}lts`);
    });
  }

  // ============ BLOQUE 5: PALABRAS CLAVE DEL NOMBRE ============
  const nombreWords = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(' ')
    .filter(w => w.length > 3 && !['para', 'con', 'sin', 'del', 'de', 'la', 'el', 'los', 'las'].includes(w))
    .slice(0, 3);
  
  nombreWords.forEach(w => tags.add(w.trim()));

  // ============ BLOQUE 6: CARACTERÍSTICAS ESPECIALES ============
  if (text.includes('sin gluten') || text.includes('libre de gluten')) tags.add('sin gluten');
  if (text.includes('sin azucar') || text.includes('libre de azucar')) tags.add('sin azúcar');
  if (text.includes('sin sal')) tags.add('sin sal');
  if (text.includes('sin lactosa')) tags.add('sin lactosa');

  // ============ BLOQUE 7: LIMPIEZA FINAL ============
  const cleanTags = Array.from(tags)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  return cleanTags.slice(0, 10);
}

/**
 * EJEMPLOS:
 * 
 * generateSemanticTags('Pizza Napolitana', 'Pizza artesanal con mozzarella y albahaca fresca')
 * → ['pizza', 'artesanal', 'mozzarella', 'napolitana', 'clásica']
 * 
 * generateSemanticTags('Hamburguesa Vegana', 'Burger vegetariana sin gluten')
 * → ['hamburguesa', 'vegana', 'vegetariana', 'sin gluten']
 * 
 * generateSemanticTags('Toyota Corolla 2020', 'Sedán automático, nafta, impecable')
 * → ['sedán', 'automático', 'nafta', 'impecable', 'año 2020']
 */
