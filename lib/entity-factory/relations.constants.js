/**
 * Relaciones estructurales del grafo ÍndiceIA.
 * Pocas reglas, mucha semántica.
 * El LLM completa el resto.
 *
 * Tipos base:
 * FRR ALI MOD SAL BIE EST DEP FAR HOM VEH PRO EDU MAS INM EVT TRV
 * Tipos nuevos (zona rural / interior AR):
 * AGR FIN TEC INS
 */

// ─────────────────────────────────────────────────────────────
// COMPLEMENTARY_BY_TYPE
// Qué necesita el usuario después o además de este nodo.
// Relación práctica de primer orden.
// ─────────────────────────────────────────────────────────────
export const COMPLEMENTARY_BY_TYPE = {
  FRR: ['ALI', 'EVT', 'BIE', 'TEC'],
  ALI: ['FAR', 'FRR', 'HOM', 'FIN'],
  MOD: ['EST', 'EVT', 'BIE'],
  SAL: ['FAR', 'BIE', 'DEP', 'FIN', 'INS'],
  BIE: ['EST', 'FRR', 'MOD', 'SAL'],
  EST: ['MOD', 'BIE', 'EVT', 'FRR'],
  DEP: ['ALI', 'SAL', 'BIE'],
  FAR: ['SAL', 'BIE', 'MAS', 'FIN'],
  HOM: ['VEH', 'PRO', 'ALI', 'TEC'],
  VEH: ['HOM', 'PRO', 'AGR', 'FIN'],
  PRO: ['FIN', 'INS', 'INM', 'EDU'],
  EDU: ['PRO', 'TEC', 'DEP', 'BIE'],
  MAS: ['FAR', 'ALI', 'BIE', 'SAL'],
  INM: ['PRO', 'FIN', 'HOM', 'INS'],
  EVT: ['FRR', 'EST', 'MOD', 'TEC'],
  TRV: ['FRR', 'EVT', 'MOD', 'FIN'],
  AGR: ['VEH', 'FIN', 'PRO', 'INS'],
  FIN: ['PRO', 'INS', 'INM', 'VEH', 'AGR'],
  TEC: ['FIN', 'EDU', 'PRO', 'HOM'],
  INS: ['FIN', 'PRO', 'SAL', 'INM'],
};

// ─────────────────────────────────────────────────────────────
// SAME_AUDIENCE_BY_TYPE
// Quién más le habla a la misma persona.
// ─────────────────────────────────────────────────────────────
export const SAME_AUDIENCE_BY_TYPE = {
  FRR: ['EVT', 'MOD', 'EST'],
  MOD: ['EST', 'BIE', 'EVT'],
  EST: ['MOD', 'BIE'],
  DEP: ['ALI', 'BIE', 'SAL'],
  SAL: ['FAR', 'BIE'],
  AGR: ['VEH', 'FIN', 'PRO'],
  FIN: ['PRO', 'INM', 'AGR'],
  TEC: ['EDU', 'PRO'],
};

// ─────────────────────────────────────────────────────────────
// SAME_OCCASION_BY_TYPE
// Qué más aparece en el mismo momento o situación.
// ─────────────────────────────────────────────────────────────
export const SAME_OCCASION_BY_TYPE = {
  FRR: ['EVT', 'MOD', 'EST'],
  EVT: ['FRR', 'MOD', 'EST'],
  SAL: ['FAR', 'INS'],
  FAR: ['SAL', 'MAS'],
  VEH: ['AGR', 'FIN'],
  AGR: ['VEH', 'FIN'],
  INM: ['FIN', 'PRO', 'INS'],
  TEC: ['EDU', 'PRO'],
};

// ─────────────────────────────────────────────────────────────
// FALLBACK_PATTERNS
// Patrones de disponibilidad que hacen a un nodo candidato
// a ser fallback cuando otro del mismo tipo está cerrado.
// ─────────────────────────────────────────────────────────────
export const FALLBACK_PATTERNS = [
  'abre-tarde',
  'abre-temprano',
  'abre-todos-los-dias',
  'abre-fines-de-semana',
  'abre-feriados',
  'atencion-online',
  'delivery-disponible',
  'guardia-24hs',
  'respuesta-rapida',
  'turnos-flexibles',
];

// ─────────────────────────────────────────────────────────────
// CONTEXTUAL_AFFINITY
// Distancia semántica entre tipos según contexto de intención.
// No simétrico por diseño: A puede activar B más que B activa A.
// Escala 0→1. Solo se incluyen valores >= 0.40.
// ─────────────────────────────────────────────────────────────
export const CONTEXTUAL_AFFINITY = {
  // Salud y urgencia
  // FIN en 0.65: adultos mayores, obra social, jubilaciones (zona rural)
  FAR: { SAL: 0.92, BIE: 0.61, MAS: 0.55, FIN: 0.65 },
  SAL: { FAR: 0.92, BIE: 0.67, DEP: 0.55, INS: 0.58 },

  // Comida y celebración
  FRR: { EVT: 0.80, EST: 0.62, MOD: 0.55, BIE: 0.50 },
  EVT: { FRR: 0.80, EST: 0.75, MOD: 0.70, TEC: 0.42 },

  // Imagen personal
  EST: { MOD: 0.82, BIE: 0.70, EVT: 0.75 },
  MOD: { EST: 0.82, EVT: 0.70, BIE: 0.55 },

  // Campo y agroindustria
  AGR: { VEH: 0.88, FIN: 0.85, PRO: 0.68, INS: 0.52 },
  VEH: { AGR: 0.88, HOM: 0.65, PRO: 0.58, FIN: 0.56 },

  // Finanzas y trámites
  FIN: { INS: 0.90, PRO: 0.82, INM: 0.72, AGR: 0.85 },
  PRO: { FIN: 0.82, INM: 0.72, EDU: 0.55, INS: 0.58 },

  // Tecnología y formación
  TEC: { EDU: 0.70, FIN: 0.52, PRO: 0.48, HOM: 0.42 },
  EDU: { TEC: 0.70, PRO: 0.55, DEP: 0.42 },

  // Instituciones
  INS: { FIN: 0.90, PRO: 0.58, SAL: 0.58, INM: 0.50 },

  // Turismo
  TRV: { FRR: 0.62, EVT: 0.60, FIN: 0.45 },
};

// ─────────────────────────────────────────────────────────────
// TYPE_PRIORITY
// Score base por tipo. Desempata cuando varios nodos tienen
// el mismo score semántico. Refleja urgencia e impacto real.
// ─────────────────────────────────────────────────────────────
export const TYPE_PRIORITY = {
  SAL: 100, // urgencia máxima: salud
  FAR: 95,  // urgencia alta: medicamentos
  INS: 90,  // instituciones: trámites críticos
  FIN: 88,  // finanzas: decisiones importantes
  VEH: 84,  // vehículos: movilidad
  AGR: 82,  // agro: producción
  FRR: 78,  // gastronomía: alta frecuencia
  TEC: 76,  // tecnología: creciente demanda
  PRO: 74,  // profesionales: asesoramiento
  HOM: 70,  // hogar: mantenimiento
  EVT: 68,  // eventos: ocasional
  INM: 66,  // inmobiliaria: baja frecuencia pero decisión grande
  EDU: 64,  // educación: planificado
  MOD: 60,  // moda: discrecional
  EST: 58,  // estética: rutina personal
  DEP: 56,  // deportes: rutina
  BIE: 54,  // bienestar: complementario
  ALI: 52,  // alimentos: cotidiano
  MAS: 50,  // mascotas: nicho
  TRV: 45,  // turismo: ocasional
};
