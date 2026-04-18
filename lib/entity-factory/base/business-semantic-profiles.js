
export const RUBRO_PROFILES = {
  FRR: {
    intents: [
      'comer',
      'almorzar',
      'cenar',
      'delivery-nocturno',
      'salir-a-comer',
      'pedido-familiar',
      'comida-rapida'
    ],
    moods: [
      'informal',
      'rapido',
      'familiar',
      'social'
    ],
    occasions: [
      'viernes-noche',
      'cumpleanos',
      'partido',
      'salida'
    ],
    audiences: [
      'parejas',
      'familias',
      'grupos'
    ],
    urgency: 'medium',
    bestFor: [
      'delivery-nocturno',
      'comida-rapida',
      'pedido-familiar'
    ]
  },

  ALI: {
    intents: [
      'comprar-comida',
      'comprar-ahora',
      'hacer-las-compras',
      'alimentos'
    ],
    moods: [
      'cotidiano',
      'practico'
    ],
    occasions: [
      'compras-diarias',
      'reposicion'
    ],
    audiences: [
      'familias',
      'hogares'
    ],
    urgency: 'low',
    bestFor: [
      'compras-diarias',
      'alimentos'
    ]
  },

  MOD: {
    intents: [
      'comprar-ropa',
      'comprar-calzado',
      'moda',
      'vestirse'
    ],
    moods: [
      'estilo',
      'personal'
    ],
    occasions: [
      'evento',
      'trabajo',
      'salida'
    ],
    audiences: [
      'adultos',
      'jovenes'
    ],
    urgency: 'low',
    bestFor: [
      'indumentaria',
      'regalos'
    ]
  },

  SAL: {
    intents: [
      'consulta',
      'turno',
      'atencion-medica',
      'urgencia'
    ],
    moods: [
      'serio',
      'cuidado'
    ],
    occasions: [
      'control',
      'dolor',
      'emergencia'
    ],
    audiences: [
      'adultos',
      'ninos',
      'familias'
    ],
    urgency: 'high',
    bestFor: [
      'atencion-medica',
      'urgencia'
    ]
  },

  BIE: {
    intents: [
      'bienestar',
      'spa',
      'masajes',
      'relajacion'
    ],
    moods: [
      'calma',
      'relax'
    ],
    occasions: [
      'descanso',
      'fin-de-semana'
    ],
    audiences: [
      'adultos',
      'parejas'
    ],
    urgency: 'low',
    bestFor: [
      'relajacion',
      'cuidado-personal'
    ]
  },

  EST: {
    intents: [
      'peluqueria',
      'barberia',
      'estetica',
      'turno'
    ],
    moods: [
      'personal',
      'estilo'
    ],
    occasions: [
      'evento',
      'salida',
      'mantenimiento'
    ],
    audiences: [
      'adultos',
      'jovenes'
    ],
    urgency: 'low',
    bestFor: [
      'cuidado-personal',
      'estetica'
    ]
  },

  DEP: {
    intents: [
      'entrenar',
      'fitness',
      'gimnasio',
      'actividad-fisica'
    ],
    moods: [
      'activo',
      'energia'
    ],
    occasions: [
      'rutina',
      'salud',
      'entrenamiento'
    ],
    audiences: [
      'adultos',
      'deportistas'
    ],
    urgency: 'low',
    bestFor: [
      'actividad-fisica',
      'fitness'
    ]
  },

  FAR: {
    intents: [
      'farmacia',
      'medicamentos',
      'comprar-remedios',
      'urgencia'
    ],
    moods: [
      'urgente',
      'cuidado'
    ],
    occasions: [
      'dolor',
      'emergencia',
      'tratamiento'
    ],
    audiences: [
      'adultos',
      'familias'
    ],
    urgency: 'high',
    bestFor: [
      'medicamentos',
      'urgencia'
    ]
  },

  HOM: {
    intents: [
      'arreglos',
      'hogar',
      'construccion',
      'materiales'
    ],
    moods: [
      'practico',
      'manual'
    ],
    occasions: [
      'obra',
      'reparacion',
      'mantenimiento'
    ],
    audiences: [
      'hogares',
      'profesionales'
    ],
    urgency: 'medium',
    bestFor: [
      'reparacion',
      'materiales'
    ]
  },

  VEH: {
    intents: [
      'mecanica',
      'repuestos',
      'arreglar-auto',
      'vehiculos'
    ],
    moods: [
      'urgente',
      'tecnico'
    ],
    occasions: [
      'rotura',
      'mantenimiento',
      'emergencia'
    ],
    audiences: [
      'conductores',
      'transportistas'
    ],
    urgency: 'high',
    bestFor: [
      'repuestos',
      'mecanica'
    ]
  },

  PRO: {
    intents: [
      'asesoramiento',
      'consulta',
      'tramites',
      'servicios-profesionales'
    ],
    moods: [
      'formal',
      'tecnico'
    ],
    occasions: [
      'problema',
      'gestion',
      'planificacion'
    ],
    audiences: [
      'empresas',
      'adultos'
    ],
    urgency: 'medium',
    bestFor: [
      'tramites',
      'asesoramiento'
    ]
  },

  EDU: {
    intents: [
      'aprender',
      'curso',
      'clases',
      'educacion'
    ],
    moods: [
      'crecimiento',
      'aprendizaje'
    ],
    occasions: [
      'estudio',
      'capacitacion'
    ],
    audiences: [
      'estudiantes',
      'adultos'
    ],
    urgency: 'low',
    bestFor: [
      'capacitacion',
      'aprendizaje'
    ]
  },

  MAS: {
    intents: [
      'mascotas',
      'veterinaria',
      'urgencia',
      'petshop'
    ],
    moods: [
      'cuidado',
      'urgente'
    ],
    occasions: [
      'emergencia',
      'vacunacion',
      'compra-alimento'
    ],
    audiences: [
      'duenos-de-mascotas'
    ],
    urgency: 'high',
    bestFor: [
      'atencion-animal',
      'emergencia'
    ]
  },

  INM: {
    intents: [
      'alquilar',
      'comprar-propiedad',
      'vender-propiedad'
    ],
    moods: [
      'importante',
      'formal'
    ],
    occasions: [
      'mudanza',
      'inversion'
    ],
    audiences: [
      'familias',
      'inversores'
    ],
    urgency: 'medium',
    bestFor: [
      'mudanza',
      'compra-propiedad'
    ]
  },

  EVT: {
    intents: [
      'evento',
      'cumpleanos',
      'casamiento',
      'catering'
    ],
    moods: [
      'celebracion',
      'social'
    ],
    occasions: [
      'cumpleanos',
      'boda',
      'fiesta'
    ],
    audiences: [
      'familias',
      'grupos',
      'empresas'
    ],
    urgency: 'low',
    bestFor: [
      'eventos',
      'catering'
    ]
  },

  TRV: {
    intents: [
      'viajar',
      'hotel',
      'vacaciones',
      'turismo'
    ],
    moods: [
      'descanso',
      'aventura'
    ],
    occasions: [
      'vacaciones',
      'escapada',
      'trabajo'
    ],
    audiences: [
      'familias',
      'parejas',
      'empresas'
    ],
    urgency: 'low',
    bestFor: [
      'vacaciones',
      'viajes'
    ]
  }
};



