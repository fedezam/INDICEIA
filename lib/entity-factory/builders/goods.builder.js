// lib/entity-factory/builders/goods.builder.js
// ⟦ROLE⟧ Compila productos de Firebase → formato comprimido para LLM.
// Agrupa variantes por nombre. NO modifica Firebase.
// Dos outputs posibles: items simples o items con variantes.

import { getDocs, collection } from 'firebase/firestore';

export async function buildGoods(comercioRef, context) {
  const snap = await getDocs(collection(comercioRef, 'productos'));
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

      // descripcion solo si agrega info real (no repite el nombre)
      if (p.descripcion && !isTautology(p.nombre, p.descripcion)) {
        item.desc = p.descripcion;
      }

      // atributos si existen
      if (p.atributos && Object.keys(p.atributos).length) {
        item.attrs = p.atributos;
      }

      // imagen si existe
      if (p.imagen) item.img = p.imagen;

      // disponibilidad solo si no es inmediata
      if (p.disponibilidad && p.disponibilidad !== 'inmediata') {
        item.disp = p.disponibilidad;
      }

      goods.push(item);

    } else {
      // ── ITEM CON VARIANTES ───────────────────────────────────
      const base = items[0];

      // extraer diferenciador de cada variante
      const variantes = items.map(p => {
        const v = {
          id: p.id,
          p:  p.precio_final,
        };

        // diferenciador desde atributos explícitos
        if (p.atributos && Object.keys(p.atributos).length) {
          Object.assign(v, p.atributos);
        }
        // diferenciador desde descripcion si no hay atributos
        else if (p.descripcion) {
          const diff = extractDiff(p.nombre, p.descripcion);
          if (diff) v.v = diff;
        }

        // imagen por variante si existe
        if (p.imagen) v.img = p.imagen;

        return v;
      });

      const item = {
        n:   base.nombre,
        cat: base.categoria || 'general',
        v:   variantes,
      };

      // imagen base si todas comparten la misma
      const imgs = [...new Set(items.map(p => p.imagen).filter(Boolean))];
      if (imgs.length === 1) item.img = imgs[0];

      goods.push(item);
    }
  });

  // ordenar por categoría
  goods.sort((a, b) => (a.cat || '').localeCompare(b.cat || '', 'es'));

  return goods;
}

// ── UTILS ─────────────────────────────────────────────────────

/**
 * Detecta si la descripción es tautológica respecto al nombre.
 * "Pizza Muzzarella" + "Pizza Muzzarella tamaño grande" → no es tautología
 * "Pizza Muzzarella" + "Pizza Muzzarella" → es tautología
 */
function isTautology(nombre, descripcion) {
  const n = normalize(nombre);
  const d = normalize(descripcion);
  return d === n || d.startsWith(n) && d.replace(n, '').trim().length === 0;
}

/**
 * Extrae el diferenciador de una descripción respecto al nombre base.
 * "Pizza Roquefort" + "Pizza Roquefort tamaño grande" → "grande"
 * "Coca Cola" + "Bebida Coca Cola 500ml" → "500ml"
 */
function extractDiff(nombre, descripcion) {
  const n    = normalize(nombre);
  const d    = normalize(descripcion);
  const diff = d.replace(n, '').trim();

  // limpiar palabras de relleno comunes
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
