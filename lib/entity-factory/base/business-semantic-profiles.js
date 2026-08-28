// ============================================================
// lib/entity-factory/base/business-semantic-profiles.js
// ============================================================

// ── IMPORTS ─────────────────────────────────────────────────
import vocab from '../../../src/shared/business-vocabulary.json' with { type: 'json' };
import { validateSemanticProfiles } from './validate-semantic-profile.js';

// ── Vocabulario controlado ──────────────────────────────────
//
// Los vocabularios válidos ahora viven en semantic-vocabulary.js
// y son validados automáticamente por validate-semantic-profile.js
//
// estimatedResponseTime : 'fast' | 'medium' | 'slow'
// estimatedDeliveryTime : '15-30m' | '30-45m' | '45-60m' | null
//
// ── Disambiguation conventions for 'occasions' ─────────────
//
//   mantenimiento-hogar      — plomería, gas, electricidad, pintura
//   mantenimiento-vehicular  — service, cambio de aceite, frenos
//   mantenimiento-personal   — corte de pelo, coloración, uñas
//   mantenimiento-deportivo  — rutina de entrenamiento continuo
//   mantenimiento-agricola   — mantenimiento de maquinaria / campos
//   emergencia-hogar         — rotura de caño, gas, cortocircuito
//   emergencia-medica        — dolor, síntoma, urgencia de salud
//   emergencia-vehicular     — rotura, accidente, avería en ruta
//   emergencia-animal        — mascota herida, intoxicación, parto
//   emergencia-farmacia      — medicación urgente, receta inmediata
//   urgencia-medica          — turno urgente, dolor intenso
//   urgencia-animal          — veterinaria de urgencia
//   obra-nueva               — construcción desde cero
//   remodelacion             — refacción, ampliación, reforma
//
// ── Uso del fallback GEN en el builder ─────────────────────
//
//   const profile = RUBRO_PROFILES[rubroTipo] || RUBRO_PROFILES.GEN;
//
// ── Lógica de quickActionsFinal en el builder ──────────────
//
//   const actions = [
//     ...(profile.quickActions                          || []),
//     ...(capabilities.delivery   ? profile.channelActions?.delivery   || [] : []),
//     ...(capabilities.presencial ? profile.channelActions?.presencial || [] : []),
//     ...(capabilities.pickup     ? profile.channelActions?.pickup     || [] : []),
//     ...(capabilities.salon      ? profile.channelActions?.salon      || [] : []),
//     ...(capabilities.takeaway   ? profile.channelActions?.takeaway   || [] : []),
//     ...(capabilities.virtual    ? profile.channelActions?.virtual    || [] : []),
//     ...(data.whatsapp           ? profile.channelActions?.whatsapp   || [] : []),
//   ];
//   const quickActionsFinal = [...new Set(actions)];
//
// ── TODO semantic normalization ────────────────────────────
//
//   consulta vs consultar       (intent 'consulta' vs quickAction 'consultar ...')
//   urgencia vs urgencia-medica (intent vs occasion — distintos pero confusibles)
//   reparacion vs arreglos      (intent en OFI vs HOM — sinónimos parciales)
//   mantenimiento-hogar         (aparece como intent Y como occasion en OFI)
//   inversion                   (ocasión en INM y FIN — contexto diferente)
//   tramites                    (canonical — usar siempre plural como intent)
//   tramite                     (singular solo como occasion, NO como intent)
//   gestion                     (ocasión en PRO e INS)
//   planificacion               (ocasión en PRO y FIN)
//
// ─────────────────────────────────────────────────────────────

export const RUBRO_PROFILES = {

  // ── Fallback genérico ───────────────────────────────────────
  GEN: {
    intents:   ['consulta', 'comprar', 'servicio'],
    moods:     ['general'],
    occasions: ['cotidiano'],
    audiences: ['adultos'],
    urgency:   'low',
    bestFor:   ['consulta-general'],
    peakMoments:  ['horario-comercial'],
    seasonalTags: ['todo-el-ano'],
    quickActions: [
      'consultar informacion',
      'consultar horarios',
      'hablar con asesor'
    ],
    channelActions: {
      delivery:   ['pedir delivery', 'consultar demora'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      pickup:     ['retirar pedido'],
      takeaway:   ['retirar pedido'],
      salon:      ['consultar disponibilidad'],
      whatsapp:   ['hablar por whatsapp'],
      virtual:    ['ver catalogo online', 'comprar online']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Gastronomía / Food & Restaurant ────────────────────────
  FRR: {
    intents: [
      'comer', 'almorzar', 'cenar',
      'delivery-nocturno', 'salir-a-comer',
      'pedido-familiar', 'comida-rapida'
    ],
    moods:     ['informal', 'rapido', 'familiar', 'social'],
    occasions: ['viernes-noche', 'cumpleanos', 'partido', 'salida'],
    audiences: ['parejas', 'familias', 'grupos'],
    urgency:   'medium',
    bestFor:   ['delivery-nocturno', 'comida-rapida', 'pedido-familiar'],
    peakMoments:  ['viernes-noche', 'sabado-noche', 'domingo-mediodia', 'feriado'],
    seasonalTags: ['invierno', 'verano', 'fecha-especial', 'vacaciones', 'fiestas'],
    quickActions: [
      'ver menu',
      'reservar mesa',
      'consultar horarios'
    ],
    channelActions: {
      delivery:   ['pedir delivery', 'consultar demora'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      pickup:     ['retirar pedido'],
      takeaway:   ['retirar pedido'],
      salon:      ['reservar mesa', 'consultar disponibilidad salon'],
      whatsapp:   ['hablar por whatsapp'],
      virtual:    ['ver menu online', 'pedir online']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     false,
      estimatedResponseTime: 'fast',
      estimatedDeliveryTime: '30-45m'
    }
  },

  // ── Alimentos / Almacén / Supermercado ─────────────────────
  ALI: {
    intents:   ['comprar-comida', 'comprar-ahora', 'hacer-las-compras', 'alimentos'],
    moods:     ['practico', 'general'],
    occasions: ['compras-diarias', 'reposicion'],
    audiences: ['familias', 'hogares'],
    urgency:   'low',
    bestFor:   ['compras-diarias', 'alimentos'],
    peakMoments:  ['sabado-manana', 'domingo-manana', 'lunes-manana'],
    seasonalTags: ['todo-el-ano', 'fiestas', 'verano'],
    quickActions: [
      'consultar stock',
      'ver productos',
      'consultar horarios'
    ],
    channelActions: {
      delivery:   ['pedir delivery', 'consultar demora'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      pickup:     ['retirar pedido'],
      takeaway:   ['retirar pedido'],
      whatsapp:   ['hablar por whatsapp'],
      virtual:    ['ver catalogo online', 'comprar online']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     true,
      estimatedResponseTime: 'fast',
      estimatedDeliveryTime: '30-45m'
    }
  },

  // ── Moda / Indumentaria ─────────────────────────────────────
  MOD: {
    intents:   ['comprar-ropa', 'comprar-calzado', 'moda', 'vestirse'],
    moods:     ['estilo', 'personal'],
    occasions: ['evento', 'trabajo', 'salida'],
    audiences: ['adultos', 'jovenes'],
    urgency:   'low',
    bestFor:   ['indumentaria', 'regalos'],
    peakMoments:  ['sabado-manana', 'sabado-tarde', 'pre-fiestas'],
    seasonalTags: ['primavera', 'verano', 'fiestas', 'fecha-especial'],
    quickActions: [
      'ver coleccion',
      'consultar talle',
      'ver novedades'
    ],
    channelActions: {
      delivery:   ['pedir delivery', 'consultar demora'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      pickup:     ['retirar pedido'],
      takeaway:   ['retirar pedido'],
      whatsapp:   ['hablar por whatsapp'],
      virtual:    ['ver catalogo online', 'comprar online']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Salud / Medicina ────────────────────────────────────────
  SAL: {
    intents:   ['consulta', 'turno', 'atencion-medica', 'urgencia'],
    moods:     ['serio', 'cuidado'],
    occasions: ['control', 'dolor', 'emergencia-medica', 'urgencia-medica'],
    audiences: ['adultos', 'ninos', 'familias'],
    urgency:   'high',
    bestFor:   ['atencion-medica', 'urgencia'],
    peakMoments:  ['lunes-manana', 'manana-temprano', 'post-feriado'],
    seasonalTags: ['invierno', 'gripe', 'todo-el-ano'],
    quickActions: [
      'sacar turno',
      'consultar urgencia',
      'ver especialidades',
      'consultar cobertura'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp'],
      virtual:    ['consulta online', 'telemedicina']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     true,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Bienestar / Spa ─────────────────────────────────────────
  BIE: {
    intents:   ['bienestar', 'spa', 'masajes', 'relajacion'],
    moods:     ['calma', 'relax'],
    occasions: ['descanso', 'fin-de-semana', 'mantenimiento-personal'],
    audiences: ['adultos', 'parejas'],
    urgency:   'low',
    bestFor:   ['relajacion', 'cuidado-personal'],
    peakMoments:  ['sabado-tarde', 'domingo-tarde', 'fin-de-semana'],
    seasonalTags: ['fecha-especial', 'invierno', 'verano'],
    quickActions: [
      'reservar turno',
      'ver servicios',
      'consultar precios'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      salon:      ['reservar espacio', 'consultar disponibilidad salon'],
      whatsapp:   ['hablar por whatsapp', 'regalar sesion'],
      virtual:    ['comprar voucher online']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Estética / Peluquería / Barbería ────────────────────────
  EST: {
    intents:   ['peluqueria', 'barberia', 'estetica', 'turno'],
    moods:     ['personal', 'estilo'],
    occasions: ['evento', 'salida', 'mantenimiento-personal'],
    audiences: ['adultos', 'jovenes'],
    urgency:   'low',
    bestFor:   ['cuidado-personal', 'estetica'],
    peakMoments:  ['viernes-tarde', 'sabado-manana', 'sabado-tarde', 'pre-fiestas'],
    seasonalTags: ['verano', 'fiestas', 'fecha-especial', 'primavera'],
    quickActions: [
      'pedir turno',
      'ver servicios',
      'consultar precio'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp', 'sacar turno por whatsapp']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Deportes / Fitness / Gimnasio ───────────────────────────
  DEP: {
    intents:   ['entrenar', 'fitness', 'gimnasio', 'actividad-fisica'],
    moods:     ['activo', 'energia'],
    occasions: ['rutina', 'salud', 'mantenimiento-deportivo'],
    audiences: ['adultos', 'deportistas'],
    urgency:   'low',
    bestFor:   ['actividad-fisica', 'fitness'],
    peakMoments:  ['manana-temprano', 'tarde-noche', 'lunes', 'post-vacaciones'],
    seasonalTags: ['enero', 'pre-verano', 'todo-el-ano'],
    quickActions: [
      'consultar membresia',
      'ver clases',
      'consultar horarios'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp', 'pedir informacion'],
      virtual:    ['ver clases online', 'inscribirse online']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     false,
      estimatedResponseTime: 'fast',
      estimatedDeliveryTime: null
    }
  },

  // ── Farmacia ────────────────────────────────────────────────
  FAR: {
    intents:   ['farmacia', 'medicamentos', 'comprar-remedios', 'urgencia'],
    moods:     ['urgente', 'cuidado'],
    occasions: ['dolor', 'emergencia-farmacia', 'tratamiento'],
    audiences: ['adultos', 'familias'],
    urgency:   'high',
    bestFor:   ['medicamentos', 'urgencia'],
    peakMoments:  ['manana-temprano', 'tarde-noche', 'feriado', 'fin-de-semana'],
    seasonalTags: ['invierno', 'gripe', 'todo-el-ano'],
    quickActions: [
      'consultar stock',
      'pedir remedio',
      'ver servicios'
    ],
    channelActions: {
      delivery:   ['pedir delivery', 'consultar demora'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      pickup:     ['retirar pedido'],
      takeaway:   ['retirar pedido'],
      whatsapp:   ['hablar por whatsapp', 'consultar stock por whatsapp']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     true,
      estimatedResponseTime: 'fast',
      estimatedDeliveryTime: '15-30m'
    }
  },

  // ── Hogar / Construcción / Materiales ───────────────────────
  HOM: {
    intents:   ['arreglos', 'hogar', 'construccion', 'materiales'],
    moods:     ['practico', 'manual'],
    occasions: ['remodelacion', 'reparacion', 'mantenimiento-hogar'],
    audiences: ['hogares', 'profesionales'],
    urgency:   'medium',
    bestFor:   ['reparacion', 'materiales'],
    peakMoments:  ['sabado-manana', 'manana-temprano'],
    seasonalTags: ['primavera', 'verano', 'pre-verano', 'todo-el-ano'],
    quickActions: [
      'pedir presupuesto',
      'consultar stock',
      'ver servicios'
    ],
    channelActions: {
      delivery:   ['pedir delivery', 'consultar demora'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      pickup:     ['retirar pedido'],
      takeaway:   ['retirar pedido'],
      whatsapp:   ['hablar por whatsapp', 'pedir presupuesto por whatsapp']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     true,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Vehículos / Mecánica / Repuestos ────────────────────────
  VEH: {
    intents:   ['mecanica', 'repuestos', 'arreglar-auto', 'vehiculos'],
    moods:     ['urgente', 'tecnico'],
    occasions: ['rotura', 'mantenimiento-vehicular', 'emergencia-vehicular'],
    audiences: ['conductores', 'transportistas'],
    urgency:   'high',
    bestFor:   ['repuestos', 'mecanica'],
    peakMoments:  ['lunes-manana', 'manana-temprano', 'post-feriado'],
    seasonalTags: ['invierno', 'pre-vacaciones', 'todo-el-ano'],
    quickActions: [
      'consultar urgencia',
      'pedir turno',
      'consultar repuesto'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp', 'consultar urgencia por whatsapp']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     true,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Servicios Profesionales ─────────────────────────────────
  PRO: {
    intents:   ['asesoramiento', 'consulta', 'tramites', 'servicios-profesionales'],
    moods:     ['formal', 'tecnico'],
    occasions: ['problema', 'gestion', 'planificacion'],
    audiences: ['empresas', 'adultos'],
    urgency:   'medium',
    bestFor:   ['tramites', 'asesoramiento'],
    peakMoments:  ['lunes-manana', 'inicio-de-mes', 'cierre-de-anio'],
    seasonalTags: ['cierre-fiscal', 'inicio-de-anio', 'todo-el-ano'],
    quickActions: [
      'solicitar consulta',
      'consultar honorarios',
      'enviar documentacion'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp'],
      virtual:    ['consulta online', 'enviar documentacion online']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'slow',
      estimatedDeliveryTime: null
    }
  },

  // ── Educación / Capacitación ────────────────────────────────
  EDU: {
    intents:   ['aprender', 'curso', 'clases', 'educacion'],
    moods:     ['crecimiento', 'aprendizaje'],
    occasions: ['estudio', 'capacitacion'],
    audiences: ['estudiantes', 'adultos'],
    urgency:   'low',
    bestFor:   ['capacitacion', 'aprendizaje'],
    peakMoments:  ['inicio-de-anio', 'post-vacaciones', 'marzo'],
    seasonalTags: ['marzo', 'inicio-de-anio', 'pre-verano', 'todo-el-ano'],
    quickActions: [
      'consultar cursos',
      'pedir informacion',
      'ver horarios'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp', 'pedir informacion por whatsapp'],
      virtual:    ['inscribirse online', 'ver clases online']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Oficios ─────────────────────────────────────────────────
  OFI: {
    intents:   ['reparacion', 'instalacion', 'mantenimiento-hogar', 'presupuesto', 'urgencia-hogar'],
    moods:     ['practico', 'urgente', 'confiable'],
    occasions: ['rotura', 'obra-nueva', 'remodelacion', 'mantenimiento-hogar', 'mudanza', 'emergencia-hogar'],
    audiences: ['propietarios', 'inquilinos', 'familias'],
    urgency:   'high',
    bestFor:   ['reparacion-urgente', 'instalacion', 'mantenimiento-hogar'],
    peakMoments:  ['manana-temprano', 'horario-comercial', 'cualquier-hora'],
    seasonalTags: ['todo-el-ano', 'invierno', 'verano'],
    quickActions: [
      'pedir presupuesto',
      'consultar disponibilidad',
      'consultar zona de cobertura'
    ],
    channelActions: {
      delivery:   ['coordinar visita', 'consultar horario disponible'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp', 'pedir presupuesto por whatsapp'],
      virtual:    ['solicitar cotizacion online']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        false,
      urgencyCompatible:     true,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Mascotas / Veterinaria / Pet Shop ───────────────────────
  MAS: {
    intents:   ['mascotas', 'veterinaria', 'urgencia', 'petshop'],
    moods:     ['cuidado', 'urgente'],
    occasions: ['emergencia-animal', 'vacunacion', 'compra-alimento', 'urgencia-animal'],
    audiences: ['duenos-de-mascotas'],
    urgency:   'high',
    bestFor:   ['atencion-animal', 'emergencia'],
    peakMoments:  ['manana-temprano', 'sabado-manana', 'cualquier-hora'],
    seasonalTags: ['verano', 'todo-el-ano'],
    quickActions: [
      'consultar urgencia',
      'pedir turno',
      'consultar stock alimento'
    ],
    channelActions: {
      delivery:   ['pedir delivery', 'consultar demora'],
      presencial: ['ver ubicacion', 'consultar horarios'],
      pickup:     ['retirar pedido'],
      takeaway:   ['retirar pedido'],
      whatsapp:   ['hablar por whatsapp', 'consultar urgencia por whatsapp']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     true,
      estimatedResponseTime: 'fast',
      estimatedDeliveryTime: null
    }
  },

  // ── Inmobiliaria ────────────────────────────────────────────
  INM: {
    intents:   ['alquilar', 'comprar-propiedad', 'vender-propiedad'],
    moods:     ['importante', 'formal'],
    occasions: ['mudanza', 'inversion'],
    audiences: ['familias', 'inversores'],
    urgency:   'medium',
    bestFor:   ['mudanza', 'compra-propiedad'],
    peakMoments:  ['sabado-manana', 'inicio-de-anio', 'post-vacaciones'],
    seasonalTags: ['inicio-de-anio', 'primavera', 'todo-el-ano'],
    quickActions: [
      'ver propiedades',
      'consultar alquiler',
      'pedir tasacion'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar con asesor por whatsapp'],
      virtual:    ['ver propiedades online', 'solicitar visita virtual']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Eventos / Catering ──────────────────────────────────────
  EVT: {
    intents:   ['evento', 'cumpleanos', 'casamiento', 'catering'],
    moods:     ['celebracion', 'social'],
    occasions: ['cumpleanos', 'boda', 'fiesta'],
    audiences: ['familias', 'grupos', 'empresas'],
    urgency:   'low',
    bestFor:   ['eventos', 'catering'],
    peakMoments:  ['fin-de-semana', 'sabado-noche', 'feriado'],
    seasonalTags: ['fiestas', 'primavera', 'fecha-especial', 'fin-de-semana-largo'],
    quickActions: [
      'pedir presupuesto',
      'consultar disponibilidad',
      'reservar fecha'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      salon:      ['reservar salon', 'consultar disponibilidad salon'],
      whatsapp:   ['hablar por whatsapp', 'pedir presupuesto por whatsapp'],
      virtual:    ['ver catalogo online', 'solicitar cotizacion online']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'slow',
      estimatedDeliveryTime: null
    }
  },

  // ── Turismo / Viajes / Hotelería ────────────────────────────
  TRV: {
    intents:   ['viajar', 'hotel', 'vacaciones', 'turismo'],
    moods:     ['descanso', 'aventura'],
    occasions: ['vacaciones', 'escapada', 'trabajo'],
    audiences: ['familias', 'parejas', 'empresas'],
    urgency:   'low',
    bestFor:   ['vacaciones', 'viajes'],
    peakMoments:  ['pre-vacaciones', 'fin-de-semana-largo', 'julio', 'enero'],
    seasonalTags: ['verano', 'invierno', 'vacaciones', 'fin-de-semana-largo', 'fiestas'],
    quickActions: [
      'consultar paquetes',
      'ver disponibilidad',
      'pedir presupuesto'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['hablar por whatsapp', 'consultar paquetes por whatsapp'],
      virtual:    ['reservar online', 'ver paquetes online']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Agro / Insumos agrícolas ────────────────────────────────
  AGR: {
    intents:   ['insumos-agricolas', 'maquinaria', 'semillas', 'agroquimicos', 'cotizar'],
    moods:     ['practico', 'tecnico'],
    occasions: ['siembra', 'cosecha', 'mantenimiento-agricola', 'compra-insumos'],
    audiences: ['productores', 'agricultores', 'contratistas'],
    urgency:   'medium',
    bestFor:   ['insumos-agricolas', 'maquinaria-agricola'],
    peakMoments:  ['manana-temprano', 'sabado-manana', 'inicio-de-anio'],
    seasonalTags: ['primavera', 'verano', 'pre-verano', 'todo-el-ano'],
    quickActions: [
      'pedir cotizacion',
      'consultar stock',
      'consultar disponibilidad zona'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['consultar por whatsapp', 'pedir cotizacion por whatsapp'],
      virtual:    ['ver catalogo online', 'solicitar cotizacion online']
    },
    operational: {
      bookingRequired:       false,
      walkInFriendly:        true,
      urgencyCompatible:     false,
      estimatedResponseTime: 'medium',
      estimatedDeliveryTime: null
    }
  },

  // ── Finanzas / Bancos / Seguros ─────────────────────────────
  FIN: {
    intents:   ['credito', 'prestamo', 'seguro', 'abrir-cuenta', 'productos-financieros'],
    moods:     ['formal', 'importante'],
    occasions: ['tramite', 'inversion', 'emergencia-financiera', 'planificacion'],
    audiences: ['adultos', 'empresas', 'inversores'],
    urgency:   'medium',
    bestFor:   ['productos-financieros', 'tramites-bancarios'],
    peakMoments:  ['lunes-manana', 'inicio-de-mes', 'cierre-de-anio'],
    seasonalTags: ['cierre-fiscal', 'inicio-de-anio', 'todo-el-ano'],
    quickActions: [
      'consultar productos',
      'consultar requisitos',
      'sacar turno'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['consultar por whatsapp'],
      virtual:    ['ver productos online', 'iniciar tramite online']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'slow',
      estimatedDeliveryTime: null
    }
  },

  // ── Instituciones / Trámites públicos ───────────────────────
  INS: {
    intents:   ['tramites', 'consulta', 'habilitacion', 'certificado', 'informacion-publica'],
    moods:     ['formal', 'necesario'],
    occasions: ['tramite', 'gestion', 'urgencia-administrativa'],
    audiences: ['adultos', 'empresas', 'ciudadanos'],
    urgency:   'medium',
    bestFor:   ['tramites', 'gestion-publica'],
    peakMoments:  ['lunes-manana', 'manana-temprano', 'post-feriado', 'inicio-de-mes'],
    seasonalTags: ['todo-el-ano', 'inicio-de-anio', 'cierre-fiscal'],
    quickActions: [
      'consultar tramite',
      'ver requisitos',
      'sacar turno'
    ],
    channelActions: {
      presencial: ['ver ubicacion', 'consultar horarios'],
      whatsapp:   ['consultar por whatsapp'],
      virtual:    ['iniciar tramite online', 'descargar formulario']
    },
    operational: {
      bookingRequired:       true,
      walkInFriendly:        false,
      urgencyCompatible:     false,
      estimatedResponseTime: 'slow',
      estimatedDeliveryTime: null
    }
  }

};

// ── Flatten para embeddings / vector search / similarity ──────

export function flattenSemanticProfile(profile) {
  return [
    ...(profile.intents   || []),
    ...(profile.moods     || []),
    ...(profile.occasions || []),
    ...(profile.audiences || []),
    ...(profile.bestFor   || []),
  ].join(' ');
}

// ── Validación contra el diccionario de vocabulario ───────────
const tiposValidos = vocab.tipos.map(t => t.codigo);
const tiposFaltantes = tiposValidos.filter(t => !RUBRO_PROFILES[t]);
if (tiposFaltantes.length) {
  console.error(`
[business-semantic-profiles] Tipos sin perfil semántico: ${tiposFaltantes.join(', ')}

  El diccionario tiene tipos que no tienen perfil en business-semantic-profiles.js.
  El grafo usará el perfil GEN — intents, moods y quickActions incorrectos.

  Tipos faltantes: ${tiposFaltantes.join(', ')}
  Diccionario:     lib/entity-factory/base/business-vocabulary.json
  `);
}

// ── Validación semántica automática ───────────────────────────
const semanticErrors = validateSemanticProfiles(RUBRO_PROFILES);
if (semanticErrors.length) {
  console.error('[semantic-profiles] Invalid semantic vocabulary detected:');
  console.table(semanticErrors);
}

// ── Congelar profiles — mutaciones runtime prohibidas ─────────
function deepFreeze(obj) {
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

deepFreeze(RUBRO_PROFILES);

