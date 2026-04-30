//lib/entity-factory/builders/context.builder.js

import { hasData } from '../utils/hasData.js';

// ── DÍAS ─────────────────────────────────────────────────────
const DIA_KEY = {
  lunes: 'lu', martes: 'ma', miercoles: 'mi',
  jueves: 'ju', viernes: 'vi', sabado: 'sa', domingo: 'do'
};

// ── COMPILADOR DE HORARIOS ────────────────────────────────────
function compileHorarios(horarios, tieneLocalFisico = true) {
  if (!hasData(horarios)) return null;

  const compiled = { tipo: tieneLocalFisico ? 'local' : 'remoto' };

  Object.entries(horarios).forEach(([dia, cfg]) => {
    const key = DIA_KEY[dia];
    if (!key) return;

    if (cfg.closed) {
      compiled[key] = null;
      return;
    }

    if (cfg.continuous && hasData(cfg.open) && hasData(cfg.close)) {
      compiled[key] = [[cfg.open, cfg.close]];
      return;
    }

    const turnos = [];
    if (cfg.morning?.enabled && hasData(cfg.morning.open) && hasData(cfg.morning.close)) {
      turnos.push([cfg.morning.open, cfg.morning.close]);
    }
    if (cfg.afternoon?.enabled && hasData(cfg.afternoon.open) && hasData(cfg.afternoon.close)) {
      turnos.push([cfg.afternoon.open, cfg.afternoon.close]);
    }

    compiled[key] = turnos.length ? turnos : null;
  });

  return compiled;
}

// ── SANITIZE TEXT ─────────────────────────────────────────────
function sanitizeText(text = '') {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s([.,!?;:])/g, '$1')
    .trim();
}

// ── AI CONFIG ────────────────────────────────────────────────
// nombreEntidad: nombre real de la entidad comercial, ya resuelto por buildContext.
// El saludo se genera siempre a partir de aiNombre + nombreEntidad para evitar
// que texto libre guardado en Firestore introduzca nombres incorrectos con
// mayor peso semántico que los campos estructurados.
function readAiConfig(aiConfig = {}, nombreEntidad = '') {
  const aiNombre = aiConfig.identidad?.nombre || aiConfig.aiName || '';

  // Saludo = parte editable (saludoPrefix) + sufijo fijo con nombre de entidad.
  // El sufijo lo controla el builder — nunca viene de texto libre del usuario.
  // Fallback: si no hay prefix, se genera uno mínimo con el nombre de la IA.
  const saludoPrefix = aiConfig.identidad?.saludoPrefix || '';
  const prefixFinal  = hasData(saludoPrefix)
    ? saludoPrefix
    : '¡Hola! Soy';
  const saludoNombre = hasData(aiNombre) ? ` ${aiNombre}` : '';
  const saludo = hasData(nombreEntidad)
    ? `${prefixFinal}${saludoNombre}, el asistente de ${nombreEntidad}`
    : `${prefixFinal}${saludoNombre}`.trim();

  return {
    nombre:       aiNombre,
    idioma:       aiConfig.identidad?.idioma        || aiConfig.aiLanguage    || 'es-AR',
    personalidad: aiConfig.identidad?.personalidad  || aiConfig.aiPersonality || '',
    tono:         aiConfig.identidad?.tono          || aiConfig.aiTone        || '',
    saludo,
    comportamiento: {
      proactividad:      aiConfig.comportamiento?.proactividad      || aiConfig.proactividad      || '',
      formatoRespuestas: aiConfig.comportamiento?.formatoRespuestas || aiConfig.formatoRespuestas || '',
    },
    contingencias: {
      sinPrecio:    aiConfig.contingencias?.sinPrecio    || aiConfig.sinPrecio    || '',
      sinStock:     aiConfig.contingencias?.sinStock     || aiConfig.sinStock     || '',
      localCerrado: aiConfig.contingencias?.localCerrado || aiConfig.localCerrado || '',
    }
  };
}

// ── BUILD CONTEXT ─────────────────────────────────────────────
export function buildContext(data, comercioId, referralCode) {
  const context = {};

  if (hasData(data.entityType)) context.entityType = data.entityType;

  // Identidad — se resuelve primero porque readAiConfig lo necesita
  if (hasData(data.nombreComercio)) context.nombre = data.nombreComercio;
  if (hasData(data.nombre))         context.nombre = data.nombre; // prestador pisa nombreComercio, ok

  if (hasData(data.descripcion))    context.descripcion = data.descripcion;
  if (hasData(data.categories))     context.categorias  = data.categories;

  // Prestador (mi-perfil)
  if (hasData(data.especialidad)) context.especialidad = data.especialidad;
  if (hasData(data.experiencia))  context.experiencia  = `${data.experiencia} años`;

  // Ubicación
  const ubicacion = {};
  ['ciudad', 'provincia', 'pais'].forEach(k => {
    if (hasData(data[k])) ubicacion[k] = data[k];
  });
  if (hasData(data.direccion)) ubicacion.direccion = data.direccion;

  // Cobertura multi-ciudad (prestador)
  if (Array.isArray(data.cobertura) && data.cobertura.length) {
    ubicacion.cobertura = data.cobertura;
    if (!ubicacion.ciudad)    ubicacion.ciudad    = data.cobertura[0].ciudad;
    if (!ubicacion.provincia) ubicacion.provincia = data.cobertura[0].provincia;
  } else if (hasData(data.zona)) {
    ubicacion.zona = data.zona;
  }

  ubicacion.local_fisico = data.tieneLocalFisico !== false;
  if (hasData(ubicacion)) context.ubicacion = ubicacion;

  // Contacto — lo consume channels.builder, no va directo al LLM
  const contacto = {};
  ['telefono', 'whatsapp', 'email', 'website', 'instagram', 'facebook', 'tiktok'].forEach(k => {
    if (hasData(data[k])) contacto[k] = data[k];
  });
  if (hasData(contacto)) context.contacto = contacto;

  // Horarios — compilados
  const tieneLocal = data.tieneLocalFisico !== false;
  const horarios   = compileHorarios(data.horarios, tieneLocal);
  if (horarios) context.horarios = horarios;

  // Entrega
  if (hasData(data.entrega)) context.entrega = data.entrega;

  // Pagos
  if (hasData(data.paymentMethods)) {
    context.pagos = { metodosDisponibles: data.paymentMethods };
  }

  // IA config — pasa el nombre de entidad ya resuelto para generar saludo seguro
  if (hasData(data.aiConfig)) {
    const ai = readAiConfig(data.aiConfig, context.nombre || '');
    const ia = {};

    if (hasData(ai.nombre))       ia.nombre       = ai.nombre;
    if (hasData(ai.saludo))       ia.saludo       = sanitizeText(ai.saludo);
    if (hasData(ai.idioma))       ia.idioma       = ai.idioma;
    if (hasData(ai.personalidad)) ia.personalidad = ai.personalidad;
    if (hasData(ai.tono))         ia.tono         = ai.tono;

    if (hasData(ai.comportamiento.proactividad) || hasData(ai.comportamiento.formatoRespuestas)) {
      ia.comportamiento = {};
      if (hasData(ai.comportamiento.proactividad))      ia.comportamiento.proactividad      = ai.comportamiento.proactividad;
      if (hasData(ai.comportamiento.formatoRespuestas)) ia.comportamiento.formatoRespuestas = ai.comportamiento.formatoRespuestas;
    }

    if (hasData(ai.contingencias.sinPrecio) || hasData(ai.contingencias.sinStock) || hasData(ai.contingencias.localCerrado)) {
      ia.contingencias = {};
      if (hasData(ai.contingencias.sinPrecio))    ia.contingencias.sinPrecio    = ai.contingencias.sinPrecio;
      if (hasData(ai.contingencias.sinStock))     ia.contingencias.sinStock     = ai.contingencias.sinStock;
      if (hasData(ai.contingencias.localCerrado)) ia.contingencias.localCerrado = ai.contingencias.localCerrado;
    }

    if (hasData(ia)) context.ia = ia;
  }

  // Referral
  if (hasData(referralCode)) {
    context.referral_link = `https://indiceia.app/r/${referralCode}`;
  }

  // Slug — necesario para seo.builder
  if (hasData(data.landing?.slug)) context.landing = { slug: data.landing.slug };

  return context;
}
