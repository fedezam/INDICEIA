import { hasData } from '../utils/hasData.js';

// ── DÍAS ─────────────────────────────────────────────────────
const DIA_KEY = {
  lunes: 'lu', martes: 'ma', miercoles: 'mi',
  jueves: 'ju', viernes: 'vi', sabado: 'sa', domingo: 'do'
};

// ── COMPILADOR DE HORARIOS ────────────────────────────────────
// Firebase → formato compacto para LLM
// null     → cerrado
// [["HH:MM","HH:MM"]]          → corrido
// [["HH:MM","HH:MM"],["HH:MM","HH:MM"]] → cortado (mañana + tarde)

function compileHorarios(horarios, tieneLocalFisico = true) {
  if (!hasData(horarios)) return null;

  const compiled = { tipo: tieneLocalFisico ? 'local' : 'remoto' };

  Object.entries(horarios).forEach(([dia, cfg]) => {
    const key = DIA_KEY[dia];
    if (!key) return;

    // cerrado
    if (cfg.closed) {
      compiled[key] = null;
      return;
    }

    // corrido
    if (cfg.continuous && hasData(cfg.open) && hasData(cfg.close)) {
      compiled[key] = [[cfg.open, cfg.close]];
      return;
    }

    // cortado — mañana + tarde
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

// ── AI CONFIG ────────────────────────────────────────────────
function readAiConfig(aiConfig = {}) {
  return {
    nombre:       aiConfig.identidad?.nombre       || aiConfig.aiName        || '',
    idioma:       aiConfig.identidad?.idioma        || aiConfig.aiLanguage    || 'es-AR',
    personalidad: aiConfig.identidad?.personalidad  || aiConfig.aiPersonality || '',
    tono:         aiConfig.identidad?.tono          || aiConfig.aiTone        || '',
    saludo:       aiConfig.identidad?.saludo        || aiConfig.aiGreeting    || '',
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

  // Identidad
  if (hasData(data.nombreComercio)) context.nombre      = data.nombreComercio;
  if (hasData(data.descripcion))    context.descripcion = data.descripcion;
  if (hasData(data.categories))     context.categorias  = data.categories;

  // Prestador (mi-perfil)
  if (hasData(data.nombre))       context.nombre       = data.nombre;
  if (hasData(data.especialidad)) context.especialidad = data.especialidad;
  if (hasData(data.experiencia))  context.experiencia  = `${data.experiencia} años`;

  // Ubicación — siempre presente, local_fisico indica si el cliente puede ir
  const ubicacion = {};
  ['ciudad', 'provincia', 'pais'].forEach(k => {
    if (hasData(data[k])) ubicacion[k] = data[k];
  });
  if (hasData(data.direccion))        ubicacion.direccion    = data.direccion;
  if (hasData(data.zona))             ubicacion.zona         = data.zona;
  ubicacion.local_fisico = data.tieneLocalFisico !== false; // true por defecto
  if (hasData(ubicacion))             context.ubicacion      = ubicacion;

  // Contacto — lo consume capabilities.builder, no va directo al LLM
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

  // IA config
  if (hasData(data.aiConfig)) {
    const ai = readAiConfig(data.aiConfig);
    const ia = {};

    if (hasData(ai.nombre))       ia.nombre       = ai.nombre;
    if (hasData(ai.saludo))       ia.saludo       = ai.saludo;
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
  context.referral = {
    code:         referralCode,
    shareMessage: `¿Querés tu IA? Visitá https://indiceia.app/r/${referralCode}`
  };

  // Template — necesario para buildVisual
  if (hasData(data.templateId)) context.templateId = data.templateId;

  context.updatedAt = new Date().toISOString();

  return context;
}
