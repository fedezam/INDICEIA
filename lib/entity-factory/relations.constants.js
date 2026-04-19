/**
 * Mapas estáticos para relaciones de complementariedad y patrones de fallback.
 * Basado en business-vocabulary.json — 16 tipos reales de ÍndiceIA.
 *
 * Criterio de complementariedad:
 * No "qué rubros se parecen" sino "qué aparece en el mismo contexto de intención".
 * Un usuario que interactúa con X, ¿qué otro nodo necesita naturalmente?
 *
 * Fácil de tunear sin tocar lógica.
 */

export const COMPLEMENTARY_BY_TYPE = {

  // Restaurante / Parrilla / Bar
  // Contexto: salida, comida, noche, celebración
  // → postre, bebida después, o algo para comprar antes
  FRR: ['ALI', 'EVT', 'BIE'],

  // Almacén / Dietética / Despensa
  // Contexto: compras cotidianas, alimentación, hogar
  // → farmacia (salud), panadería/rotisería (gastronomía), hogar
  ALI: ['FAR', 'FRR', 'HOM'],

  // Indumentaria / Calzado / Moda
  // Contexto: compras personales, regalo, salida
  // → estética (arreglarse), eventos (vestirse para algo), bienestar
  MOD: ['EST', 'EVT', 'BIE'],

  // Clínica / Consultorio / Médico
  // Contexto: salud, urgencia, cuidado
  // → farmacia (medicamentos), bienestar (recuperación), deportes (prevención)
  SAL: ['FAR', 'BIE', 'DEP'],

  // Spa / Centro de Bienestar
  // Contexto: relajación, autocuidado, pareja, regalo
  // → estética (complementa tratamiento), gastronomía (después del spa), moda
  BIE: ['EST', 'FRR', 'MOD'],

  // Peluquería / Estética / Barbería
  // Contexto: arreglarse, imagen personal, evento próximo
  // → moda (ropa para la salida), bienestar, eventos
  EST: ['MOD', 'BIE', 'EVT'],

  // Gimnasio / Club Deportivo
  // Contexto: rutina, salud, cuerpo
  // → dietética/alimentación (nutrición), salud (médico), bienestar
  DEP: ['ALI', 'SAL', 'BIE'],

  // Farmacia / Herboristería
  // Contexto: urgencia, salud, medicamento
  // → médico/consultorio (diagnóstico), bienestar (recuperación), veterinaria si hay mascotas
  FAR: ['SAL', 'BIE', 'MAS'],

  // Ferretería / Materiales / Hogar
  // Contexto: arreglo, obra, mantenimiento
  // → vehículos (herramientas, taller), profesional (arquitecto, técnico), almacén
  HOM: ['VEH', 'PRO', 'ALI'],

  // Mecánica / Taller / Repuestos
  // Contexto: problema con el auto, urgencia técnica
  // → ferretería/repuestos (complemento), profesional (técnico especialista), seguro
  VEH: ['HOM', 'PRO', 'FAR'],

  // Profesional / Estudio / Oficina
  // Contexto: trámite, asesoramiento, decisión importante
  // → otro profesional (derivación especializada), educación (formación), inmobiliaria
  PRO: ['EDU', 'INM', 'PRO'],

  // Instituto / Academia / Escuela
  // Contexto: aprendizaje, formación, crecimiento
  // → profesional (aplicar lo aprendido), bienestar, deportes
  EDU: ['PRO', 'DEP', 'BIE'],

  // Veterinaria / Pet Shop
  // Contexto: mascota, cuidado animal, urgencia
  // → farmacia veterinaria (medicamentos), alimentación (comida para mascotas), bienestar animal
  MAS: ['FAR', 'ALI', 'BIE'],

  // Inmobiliaria / Propiedades
  // Contexto: mudanza, inversión, nuevo hogar
  // → profesional (escribano, contador), hogar (muebles, refacción), ferretería
  INM: ['PRO', 'HOM', 'ALI'],

  // Eventos / Catering / Salón
  // Contexto: celebración, organización, fecha especial
  // → gastronomía (comida), estética (arreglarse), moda (vestimenta)
  EVT: ['FRR', 'EST', 'MOD'],

  // Turismo / Agencia de Viajes
  // Contexto: viaje, vacaciones, escapada
  // → gastronomía (dónde comer), eventos (qué hacer), moda (ropa de viaje)
  TRV: ['FRR', 'EVT', 'MOD'],
};

export const FALLBACK_PATTERNS = [
  'abre-tarde',
  'abre-todos-los-dias',
  'abre-fines-de-semana',
  'abre-feriados',
  'atencion-online',
  'delivery-disponible',
];

/**
 * Afinidad contextual entre tipos.
 * Define qué tan cerca están dos tipos en el espacio de intención,
 * independientemente de si son complementarios directos.
 *
 * Escala: 0 (sin relación) → 1 (mismo espacio semántico)
 *
 * Esto permite al router subir el score de nodos relacionados
 * cuando el contexto los activa, aunque no sean complementarios directos.
 *
 * Ejemplo: FAR y SAL están muy cerca en contexto "urgencia" o "dolor".
 * FRR y EVT están cerca en contexto "celebración" o "noche".
 */
export const CONTEXTUAL_AFFINITY = {
  // Salud y urgencia
  FAR: { SAL: 0.92, BIE: 0.61, MAS: 0.55, DEP: 0.48 },
  SAL: { FAR: 0.92, BIE: 0.67, DEP: 0.55, EDU: 0.40 },

  // Celebración y salida
  FRR: { EVT: 0.80, EST: 0.62, MOD: 0.55, BIE: 0.50 },
  EVT: { FRR: 0.80, EST: 0.75, MOD: 0.70, TRV: 0.60 },

  // Imagen personal
  EST: { MOD: 0.82, BIE: 0.70, EVT: 0.75, FRR: 0.62 },
  MOD: { EST: 0.82, EVT: 0.70, BIE: 0.55, TRV: 0.50 },

  // Cuerpo y rutina
  DEP: { ALI: 0.75, SAL: 0.55, BIE: 0.68, EDU: 0.42 },
  BIE: { EST: 0.70, SAL: 0.67, DEP: 0.68, FRR: 0.50 },

  // Hogar y obra
  HOM: { VEH: 0.65, PRO: 0.60, ALI: 0.40, INM: 0.55 },
  VEH: { HOM: 0.65, PRO: 0.58, FAR: 0.30 },

  // Trámites y decisiones
  PRO: { INM: 0.72, EDU: 0.55, HOM: 0.60, VEH: 0.58 },
  INM: { PRO: 0.72, HOM: 0.68, ALI: 0.35 },

  // Mascotas
  MAS: { FAR: 0.55, ALI: 0.60, BIE: 0.40 },

  // Viaje
  TRV: { FRR: 0.62, EVT: 0.60, MOD: 0.50, INM: 0.38 },

  // Cotidiano
  ALI: { FAR: 0.58, FRR: 0.52, HOM: 0.40, MAS: 0.60 },
  EDU: { PRO: 0.55, DEP: 0.42, BIE: 0.45 },
};
