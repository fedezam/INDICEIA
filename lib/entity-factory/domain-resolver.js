// lib/entity-factory/domain-resolver.js
// ⟦ROLE⟧ Resuelve domain tag a partir de señales del context.
// Pure function. NO LER. NO side effects.
// Reemplaza: rubro-resolver.js

import { mindConfig } from './mind.config.js';

export function resolveDomain(context = {}) {

  const signals = extractSignals(context);

  // ── TIER 1: heurística rápida ─────────────────────────────
  for (const [domain, entry] of Object.entries(mindConfig.domain_map)) {
    const match = entry.keywords.some(k => signals.includes(k));
    if (match) {
      return {
        domain_tag:        domain,
        domain_confidence: 'heuristic',
        domain_source:     'heuristic',
      };
    }
  }

  // ── TIER 2: fallback — dominio genérico ───────────────────
  // Si no matchea nada, el LLM opera con identidad pura.
  // El humano puede corregir desde el dashboard.
  return {
    domain_tag:        'commerce.generic',
    domain_confidence: 'low',
    domain_source:     'fallback',
  };
}

// ── SIGNAL EXTRACTION ─────────────────────────────────────────
// Normaliza todas las señales disponibles en un array de strings.

function extractSignals(context = {}) {
  const raw = [
    ...(context.categorias  ?? []),
    context.nombre          ?? '',
    context.descripcion     ?? '',
    context.especialidad    ?? '',
  ];

  return raw
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/);
}
