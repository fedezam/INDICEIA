import { hasData } from '../utils/hasData.js';

/**
 * Lee aiConfig soportando estructura nueva (anidada) y legacy (plana).
 */
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

/**
 * Construye el bloque context según context.schema.json.
 * Toma datos planos de Firestore y los estructura.
 */
export function buildContext(data, comercioId, referralCode) {
  const context = { id: comercioId };

  // Identidad
  if (hasData(data.nombreComercio)) context.nombre = data.nombreComercio;
  if (hasData(data.descripcion))    context.descripcion = data.descripcion;
  if (hasData(data.categories))     context.categorias = data.categories;

  // Ubicacion
  const ubicacion = {};
  ['direccion', 'ciudad', 'provincia', 'pais'].forEach(k => {
    if (hasData(data[k])) ubicacion[k] = data[k];
  });
  if (hasData(ubicacion)) context.ubicacion = ubicacion;

  // Contacto
  const contacto = {};
  ['telefono', 'whatsapp', 'email', 'website', 'instagram', 'facebook', 'tiktok'].forEach(k => {
    if (hasData(data[k])) contacto[k] = data[k];
  });
  if (hasData(contacto)) context.contacto = contacto;

  // Horarios
  if (hasData(data.horarios)) context.horarios = data.horarios;

  // Entrega
  if (hasData(data.entrega)) context.entrega = data.entrega;

  // Pagos
  if (hasData(data.paymentMethods)) {
    context.pagos = { metodosDisponibles: data.paymentMethods };
  }

  // Plan
  if (hasData(data.plan)) {
    context.plan = typeof data.plan === 'object' ? data.plan?.type : data.plan;
  }

  // Template visual — visualTemplateId tiene prioridad sobre templateId (legacy)
  if (hasData(data.visualTemplateId))  context.templateId = data.visualTemplateId;
  else if (hasData(data.templateId))   context.templateId = data.templateId;
  if (hasData(data.templateUpdatedAt)) context.templateUpdatedAt = data.templateUpdatedAt;

  // IA config
  if (hasData(data.aiConfig)) {
    const ai = readAiConfig(data.aiConfig);
    const ia = {};

    if (hasData(ai.nombre))       ia.nombre = ai.nombre;
    if (hasData(ai.saludo))       ia.saludo = ai.saludo;
    if (hasData(ai.idioma))       ia.idioma = ai.idioma;
    if (hasData(ai.personalidad)) ia.personalidad = ai.personalidad;
    if (hasData(ai.tono))         ia.tono = ai.tono;

    if (hasData(ai.comportamiento.proactividad) || hasData(ai.comportamiento.formatoRespuestas)) {
      ia.comportamiento = {};
      if (hasData(ai.comportamiento.proactividad))      ia.comportamiento.proactividad = ai.comportamiento.proactividad;
      if (hasData(ai.comportamiento.formatoRespuestas)) ia.comportamiento.formatoRespuestas = ai.comportamiento.formatoRespuestas;
    }

    if (hasData(ai.contingencias.sinPrecio) || hasData(ai.contingencias.sinStock) || hasData(ai.contingencias.localCerrado)) {
      ia.contingencias = {};
      if (hasData(ai.contingencias.sinPrecio))    ia.contingencias.sinPrecio = ai.contingencias.sinPrecio;
      if (hasData(ai.contingencias.sinStock))     ia.contingencias.sinStock = ai.contingencias.sinStock;
      if (hasData(ai.contingencias.localCerrado)) ia.contingencias.localCerrado = ai.contingencias.localCerrado;
    }

    if (hasData(ia)) context.ia = ia;
  }

  // Referral
  context.referral = {
    code: referralCode,
    shareMessage: `¿Querés tu IA? Visitá https://indiceia.app/r/${referralCode}`
  };

  context.updatedAt = new Date().toISOString();

  return context;
}
