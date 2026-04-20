/**
 * temporal.resolver.js
 * Resuelve qué tags temporales están activos en un momento dado.
 * Se usa en el router para calcular peak moment boost.
 *
 * ── ESTADO ACTUAL ────────────────────────────────────────────
 * Resuelve: dia-momento, estacional
 * Pendiente: feriado (requiere lista externa de feriados AR)
 *
 * ── PARA EXPANDIR ────────────────────────────────────────────
 * 1. FERIADOS: agregar función isFeriado(date) que consulte
 *    una lista estática o API de feriados AR. Activaría el tag
 *    "feriado" en peakMoments.
 *    Referencia: https://nolaborables.com.ar/api/v2/feriados
 *
 * 2. EVENTOS ESPECIALES: tags como "cosecha", "vendimia",
 *    "semana-santa" requieren lógica específica por región.
 *    Pueden modelarse como rangos de fecha en una tabla externa.
 *
 * 3. CLIMA: tags como "dia-lluvia" o "dia-frio" requerirían
 *    integración con API meteorológica. Alto valor para delivery.
 * ─────────────────────────────────────────────────────────────
 */

// ── MAPS ─────────────────────────────────────────────────────

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// Hora → franja del día
const FRANJAS = [
  { tag: 'madrugada', from: 0,  to: 6  },
  { tag: 'manana',    from: 6,  to: 12 },
  { tag: 'mediodia',  from: 12, to: 15 },
  { tag: 'tarde',     from: 15, to: 20 },
  { tag: 'noche',     from: 20, to: 24 },
];

// Mes → estación (hemisferio sur)
const ESTACIONES = [
  { tag: 'verano',   meses: [12, 1, 2]  },
  { tag: 'otono',    meses: [3, 4, 5]   },
  { tag: 'invierno', meses: [6, 7, 8]   },
  { tag: 'primavera', meses: [9, 10, 11] },
];

// Meses de vacaciones escolares AR (aproximado)
const MESES_VACACIONES = [1, 2, 7, 12];

// Meses de fiestas (fin de año)
const MESES_FIESTAS = [12, 1];

// ── RESOLVER PRINCIPAL ───────────────────────────────────────

/**
 * Dado un Date, devuelve el conjunto de tags temporales activos.
 * @param {Date} now
 * @returns {Set<string>}
 */
export function resolveActiveTags(now = new Date()) {
  const tags = new Set();

  const dia     = DIAS[now.getDay()];
  const hora    = now.getHours();
  const mes     = now.getMonth() + 1; // 1-12
  const franja  = getFranja(hora);

  // Tags de día
  tags.add(dia);

  // Tags de día + franja: "viernes-noche", "domingo-mediodia"
  if (franja) {
    tags.add(`${dia}-${franja}`);
    tags.add(franja);
  }

  // Fin de semana
  if (dia === 'sabado' || dia === 'domingo') {
    tags.add('fin-de-semana');
  }

  // Estación
  const estacion = getEstacion(mes);
  if (estacion) tags.add(estacion);

  // Vacaciones escolares
  if (MESES_VACACIONES.includes(mes)) tags.add('vacaciones');

  // Fiestas de fin de año
  if (MESES_FIESTAS.includes(mes)) tags.add('fiestas');

  // PENDIENTE: feriado — ver nota en cabecera del archivo
  // if (await isFeriado(now)) tags.add('feriado');

  return tags;
}

/**
 * Dado un nodo y el momento actual, devuelve cuántos
 * peakMoments del nodo están activos ahora.
 * @param {object} node
 * @param {Set<string>} activeTags
 * @returns {number} cantidad de peaks activos (0-N)
 */
export function countActivePeaks(node, activeTags) {
  const peaks = node.temporal?.peakMoments || [];
  return peaks.filter(p => activeTags.has(p)).length;
}

/**
 * Dado un nodo y el momento actual, devuelve true si
 * el nodo está en alguno de sus peak moments ahora.
 * @param {object} node
 * @param {Set<string>} activeTags
 * @returns {boolean}
 */
export function isInPeakMoment(node, activeTags) {
  return countActivePeaks(node, activeTags) > 0;
}

// ── HELPERS ──────────────────────────────────────────────────

function getFranja(hora) {
  return FRANJAS.find(f => hora >= f.from && hora < f.to)?.tag || null;
}

function getEstacion(mes) {
  return ESTACIONES.find(e => e.meses.includes(mes))?.tag || null;
}
