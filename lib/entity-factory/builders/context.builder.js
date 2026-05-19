// lib/entity-factory/builders/context.builder.js

import { hasData } from '../utils/hasData.js';

// ── DÍAS ─────────────────────────────────────────────────────

const DIA_KEY = {
  lunes: 'lu',
  martes: 'ma',
  miercoles: 'mi',
  jueves: 'ju',
  viernes: 'vi',
  sabado: 'sa',
  domingo: 'do'
};

// ── COMPILADOR DE HORARIOS ───────────────────────────────────

function compileHorarios(horarios, tieneLocalFisico = true) {
  if (!hasData(horarios)) return null;

  const compiled = {
    tipo: tieneLocalFisico ? 'local' : 'remoto'
  };

  Object.entries(horarios).forEach(([dia, cfg]) => {
    const key = DIA_KEY[dia];
    if (!key) return;

    // Día cerrado
    if (!cfg.open) {
      compiled[key] = null;
      return;
    }

    // Día abierto pero sin turnos (no debería pasar, pero defensivo)
    if (!Array.isArray(cfg.turnos) || cfg.turnos.length === 0) {
      compiled[key] = null;
      return;
    }

    // Mapear turnos — cada turno es [open, close]
    // close puede ser hora extendida (ej: "25:00") para indicar cruce de medianoche
    const turnos = cfg.turnos
      .filter(t => hasData(t.open) && hasData(t.close))
      .map(t => [t.open, t.close]);

    compiled[key] = turnos.length ? turnos : null;
  });

  return compiled;
}

// ── SANITIZE TEXT ────────────────────────────────────────────

function sanitizeText(text = '') {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s([.,!?;:])/g, '$1')
    .trim();
}

// ── AI CONFIG ────────────────────────────────────────────────

function readAiConfig(aiConfig = {}, nombreEntidad = '') {
  const aiNombre =
    aiConfig.identidad?.nombre ||
    aiConfig.aiName ||
    '';

  const saludoPrefix =
    aiConfig.identidad?.saludoPrefix ||
    '';

  const prefixFinal = hasData(saludoPrefix)
    ? saludoPrefix
    : '¡Hola! Soy';

  const saludoNombre = hasData(aiNombre)
    ? ` ${aiNombre}`
    : '';

  const saludo = hasData(nombreEntidad)
    ? `${prefixFinal}${saludoNombre}, el asistente de ${nombreEntidad}`
    : `${prefixFinal}${saludoNombre}`.trim();

  // ← NEW: leer contexto global (solo si existe)
  const globalContext =
    aiConfig.contexto?.global_ai_context ||
    (Array.isArray(aiConfig.global_ai_context) ? aiConfig.global_ai_context : []);

  return {
    nombre: aiNombre,

    idioma:
      aiConfig.identidad?.idioma ||
      aiConfig.aiLanguage ||
      'es-AR',

    personalidad:
      aiConfig.identidad?.personalidad ||
      aiConfig.aiPersonality ||
      '',

    tono:
      aiConfig.identidad?.tono ||
      aiConfig.aiTone ||
      '',

    saludo,

    // ← NEW: incluir contexto global solo si tiene datos
    ...(globalContext.length > 0 && { contexto: { global_ai_context: globalContext } }),

    comportamiento: {
      proactividad:
        aiConfig.comportamiento?.proactividad ||
        aiConfig.proactividad ||
        '',

      formatoRespuestas:
        aiConfig.comportamiento?.formatoRespuestas ||
        aiConfig.formatoRespuestas ||
        '',
    },

    contingencias: {
      sinPrecio:
        aiConfig.contingencias?.sinPrecio ||
        aiConfig.sinPrecio ||
        '',

      sinStock:
        aiConfig.contingencias?.sinStock ||
        aiConfig.sinStock ||
        '',

      localCerrado:
        aiConfig.contingencias?.localCerrado ||
        aiConfig.localCerrado ||
        '',
    }
  };
}

// ── BUILD CONTEXT ────────────────────────────────────────────

export function buildContext(data, comercioId, referralCode) {
  const context = {};

  // ── ENTITY TYPE ───────────────────────────────────────────

  if (hasData(data.entityType)) {
    context.entityType = data.entityType;
  }

  // ── IDENTIDAD ─────────────────────────────────────────────

  if (hasData(data.nombreComercio)) {
    context.nombre = data.nombreComercio;
  }

  if (hasData(data.nombre)) {
    context.nombre = data.nombre;
  }

  if (hasData(data.descripcion)) {
    context.descripcion = data.descripcion;
  }

  if (hasData(data.categories)) {
    context.categorias = data.categories;
  }

  // ── PRESTADOR ─────────────────────────────────────────────

  if (hasData(data.especialidad)) {
    context.especialidad = data.especialidad;
  } else if (hasData(data.services?.perfil?.especialidad)) {
    context.especialidad = data.services.perfil.especialidad;
  }

  if (hasData(data.experiencia)) {
    context.experiencia = `${data.experiencia} años`;
  }

  if (data.atiende_urgencias === true) {
    context.atiende_urgencias = true;
  }

  // ── PROFESIONAL ───────────────────────────────────────────

  if (data.entityType === 'profesional') {

    if (hasData(data.titulo)) {
      context.titulo = data.titulo;
    }

    if (hasData(data.institucionFormadora)) {
      context.institucionFormadora = data.institucionFormadora;
    }

    if (hasData(data.matricula?.numero)) {
      context.matricula = {
        numero:    data.matricula.numero,
        organismo: data.matricula.organismo || null,
      };
    }

    if (Array.isArray(data.lugares) && data.lugares.length) {
      context.lugares = data.lugares.map(l => ({
        nombre:    l.nombre,
        provincia: l.provincia,
        ciudad:    l.ciudad,
        direccion: l.direccion,
        dias:      l.dias || [],
        horario:   l.horario || null,
      }));
    }

    if (hasData(data.cobertura)) {
      const cob = {};
      if (Array.isArray(data.cobertura.modalidades) && data.cobertura.modalidades.length)
        cob.modalidades = data.cobertura.modalidades;
      if (Array.isArray(data.cobertura.mutuales) && data.cobertura.mutuales.length)
        cob.mutuales = data.cobertura.mutuales;
      if (data.cobertura.particular !== undefined)
        cob.particular = data.cobertura.particular;
      if (hasData(data.cobertura.honorarios))
        cob.honorarios = data.cobertura.honorarios;
      if (hasData(cob)) context.cobertura = cob;
    }

    if (Array.isArray(data.consultas) && data.consultas.length) {
      context.consultas = data.consultas;
    }
  }

  // ── UBICACIÓN ─────────────────────────────────────────────

  const ubicacion = {};

  ['ciudad', 'provincia', 'pais'].forEach(k => {
    if (hasData(data[k])) {
      ubicacion[k] = data[k];
    }
  });

  if (hasData(data.direccion)) {
    ubicacion.direccion = data.direccion;
  }

  if (data.entityType !== 'profesional') {
    if (Array.isArray(data.zona_cobertura) && data.zona_cobertura.length) {
      ubicacion.zona_cobertura = data.zona_cobertura;
    }
  }

  if (data.entityType === 'prestador') {
    if (data.modalidad_trabajo === 'local') ubicacion.local_fisico = true;
  } else {
    if (data.tieneLocalFisico !== false) ubicacion.local_fisico = true;
  }

  if (hasData(data.ubicacion?.localidad)) {
    ubicacion.localidad = {
      id:     data.ubicacion.localidad.id,
      nombre: data.ubicacion.localidad.nombre,
      coords: {
        lat: data.ubicacion.localidad.lat,
        lng: data.ubicacion.localidad.lng,
      },
    };
  }

  if (hasData(ubicacion)) {
    context.ubicacion = ubicacion;
  }

  // ── CONTACTO ──────────────────────────────────────────────

  const contacto = {};

  [
    'telefono',
    'whatsapp',
    'email',
    'website',
    'instagram',
    'facebook',
    'tiktok'
  ].forEach(k => {
    if (hasData(data[k])) {
      contacto[k] = data[k];
    }
  });

  if (hasData(contacto)) {
    context.contacto = contacto;
  }

  // ── HORARIOS ──────────────────────────────────────────────

  const tieneLocal = data.entityType === 'prestador'
    ? data.modalidad_trabajo === 'local'
    : data.tieneLocalFisico !== false;

  const horarios = compileHorarios(data.horarios, tieneLocal);
  if (horarios) context.horarios = horarios;

  // ── HORARIOS DELIVERY ─────────────────────────────────────

  const horariosDelivery = compileHorarios(data.horariosDelivery, true);
  if (horariosDelivery) context.horariosDelivery = horariosDelivery;

  // ── ENTREGA ───────────────────────────────────────────────

  if (hasData(data.entrega)) {
    context.entrega = data.entrega;
  }

  // ── PAGOS ─────────────────────────────────────────────────

  if (hasData(data.paymentMethods)) {
    context.pagos = {
      metodosDisponibles: data.paymentMethods
    };
  }

  // ── IA CONFIG ─────────────────────────────────────────────

  if (hasData(data.aiConfig)) {
    const ai = readAiConfig(data.aiConfig, context.nombre || '');
    const ia = {};

    if (hasData(ai.nombre))       ia.nombre      = ai.nombre;
    if (hasData(ai.saludo))       ia.saludo      = sanitizeText(ai.saludo);
    if (hasData(ai.idioma))       ia.idioma      = ai.idioma;
    if (hasData(ai.personalidad)) ia.personalidad = ai.personalidad;
    if (hasData(ai.tono))         ia.tono         = ai.tono;

    // ← NEW: propagar contexto global al output final
    if (hasData(ai.contexto?.global_ai_context)) {
      ia.contexto = { global_ai_context: ai.contexto.global_ai_context };
    }

    if (
      hasData(ai.comportamiento.proactividad) ||
      hasData(ai.comportamiento.formatoRespuestas)
    ) {
      ia.comportamiento = {};
      if (hasData(ai.comportamiento.proactividad))
        ia.comportamiento.proactividad = ai.comportamiento.proactividad;
      if (hasData(ai.comportamiento.formatoRespuestas))
        ia.comportamiento.formatoRespuestas = ai.comportamiento.formatoRespuestas;
    }

    if (
      hasData(ai.contingencias.sinPrecio) ||
      hasData(ai.contingencias.sinStock) ||
      hasData(ai.contingencias.localCerrado)
    ) {
      ia.contingencias = {};
      if (hasData(ai.contingencias.sinPrecio))
        ia.contingencias.sinPrecio = ai.contingencias.sinPrecio;
      if (hasData(ai.contingencias.sinStock))
        ia.contingencias.sinStock = ai.contingencias.sinStock;
      if (hasData(ai.contingencias.localCerrado))
        ia.contingencias.localCerrado = ai.contingencias.localCerrado;
    }

    if (hasData(ia)) context.ia = ia;
  }

  // ── REFERRAL ──────────────────────────────────────────────

  if (hasData(referralCode)) {
    context.referral_link = `https://indiceia.app/r/${referralCode}`;
  }

  // ── LANDING ───────────────────────────────────────────────

  if (hasData(data.landing?.slug)) {
    context.landing = { slug: data.landing.slug };
  }

  return context;
}
