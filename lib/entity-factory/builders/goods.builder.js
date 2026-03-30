// lib/entity-factory/builders/goods.builder.js
// ⟦ROLE⟧ Compila productos de Firebase → formato comprimido para LLM.
// Agrupa variantes por nombre. NO modifica Firebase.
// Dos outputs posibles: items simples o items con variantes.

// Prefijos de relleno que los loaders de datos suelen anteponer al nombre
const DESC_PREFIXES = [
  'bebida', 'empanada de', 'empanada', 'postre', 'minuta',
  'pizza', 'gaseosa', 'porción', 'plato', 'unidad',
];

export async function buildGoods(comercioRef, context) {
  const snap = await comercioRef.collection('productos').get();
  if (snap.empty) return null;

  const raw = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.paused); // pausados no van al LLM

  if (!raw.length) return null;

  // ── AGRUPAR POR NOMBRE ───────────────────────────────────────
  const groups = new Map();

  raw.forEach(p => {
    const key = (p.nombre || '').trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });

  // ── COMPILAR ─────────────────────────────────────────────────
  const goods = [];

  groups.forEach((items, key) => {
    if (items.length === 1) {
      // ── ITEM SIMPLE ──────────────────────────────────────────
      const p = items[0];
      const item = {
        id:  p.id,
        n:   p.nombre,
        cat: p.categoria || 'general',
        p:   p.precio_final,
      };

      // descripcion solo si agrega info real
      if (p.descripcion && !isTautology(p.nombre, p.descripcion)) {
        item.desc = p.descripcion;
      }

      // atributos: excluir url_imagen (ruido para el LLM), conservar tamaño
      if (p.atributos) {
        const cleanAttrs = cleanAttributes(p.atributos);
        if (Object.keys(cleanAttrs).length) item.attrs = cleanAttrs;
      }

      // disponibilidad solo si no es inmediata
      if (p.disponibilidad && p.disponibilidad !== 'inmediata') {
        item.disp = p.disponibilidad;
      }

      // ⚠️ img deliberadamente omitido — el LLM no usa imágenes

      goods.push(item);

    } else {
      // ── ITEM CON VARIANTES ───────────────────────────────────
      const base = items[0];

      const variantes = items.map(p => {
        const v = {
          id: p.id,
          p:  p.precio_final,
        };

        // diferenciador desde atributos explícitos (sin url_imagen)
        if (p.atributos && Object.keys(p.atributos).length) {
          const cleanAttrs = cleanAttributes(p.atributos);
          if (Object.keys(cleanAttrs).length) Object.assign(v, cleanAttrs);
        }
        // diferenciador desde descripcion si no hay atributos útiles
        else if (p.descripcion) {
          const diff = extractDiff(p.nombre, p.descripcion);
          if (diff) v.v = diff;
        }

        // ⚠️ img deliberadamente omitido

        return v;
      });

      const item = {
        n:   base.nombre,
        cat: base.categoria || 'general',
        v:   variantes,
      };

      // ⚠️ img base deliberadamente omitida

      goods.push(item);
    }
  });

  // ordenar por categoría
  goods.sort((a, b) => (a.cat || '').localeCompare(b.cat || '', 'es'));

  return goods;
}

// ── UTILS ─────────────────────────────────────────────────────

/**
 * Elimina campos de imágenes de los atributos — ruido para el LLM.
 * tamaño se conserva: es el diferenciador semántico de variantes.
 */
function cleanAttributes(attrs) {
  const SKIP_KEYS   = ['url_imagen', 'talla', 'size'];
  // Valores genéricos de tamaño — no aportan info al LLM
  const SKIP_VALUES = ['unidad', 'porción', 'porcion'];

  return Object.fromEntries(
    Object.entries(attrs).filter(([k, v]) => {
      if (SKIP_KEYS.includes(k.toLowerCase())) return false;
      if (k.toLowerCase() === 'tamaño' && SKIP_VALUES.includes((v || '').toLowerCase())) return false;
      return true;
    })
  );
}

/**
 * Detecta si la descripción es tautológica respecto al nombre.
 * Cubre tres casos:
 *   1. Igualdad directa: "Vino Blanco" === "Vino Blanco"
 *   2. La desc empieza con el nombre y no agrega nada
 *   3. La desc tiene un prefijo de relleno seguido del nombre:
 *      "Bebida Vino Blanco", "Empanada de Carne", "Postre Brownie"
 */
function isTautology(nombre, descripcion) {
  const n = normalize(nombre);
  const d = normalize(descripcion);

  // Caso 1 y 2 — igualdad directa
  if (d === n) return true;
  if (d.startsWith(n) && d.slice(n.length).trim().length === 0) return true;

  // Caso 3: prefijo de relleno + nombre
  for (const prefix of DESC_PREFIXES) {
    const candidate = `${prefix} ${n}`;
    if (d === candidate) return true;
    if (d.startsWith(candidate) && d.slice(candidate.length).trim().length === 0) return true;
  }

  // Caso 4: descripción es el nombre con partículas insertadas ("de", "con", "a la")
  // "Empanada de Carne" vs "Empanada Carne" → remover partículas y comparar
  const PARTICLES = [' de ', ' con ', ' a la ', ' al ', ' y '];
  let dClean = d;
  let nClean = n;
  for (const p of PARTICLES) {
    dClean = dClean.split(p).join(' ');
    nClean = nClean.split(p).join(' ');
  }
  // normalizar espacios dobles
  dClean = dClean.replace(/\s+/g, ' ').trim();
  nClean = nClean.replace(/\s+/g, ' ').trim();
  if (dClean === nClean) return true;

  return false;
}

/**
 * Extrae el diferenciador de una descripción respecto al nombre base.
 * "Pizza Roquefort tamaño grande" → "grande"
 */
function extractDiff(nombre, descripcion) {
  const n    = normalize(nombre);
  const d    = normalize(descripcion);
  const diff = d.replace(n, '').trim();

  return diff
    .replace(/^(tamano|tamaño|talla|size|bebida|variante)\s*/i, '')
    .trim() || null;
}

function normalize(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
