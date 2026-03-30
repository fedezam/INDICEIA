// lib/entity-factory/mind.config.js
// ⟦ROLE⟧ Single source of truth. Humano escribe acá. NO LER. NO lógica.
export const mindConfig = {
  id:      'commerce.basic.v1',
  version: 'v1.1',
  strict:  true,

  // FLOW — palabras puras, sin glifos. El LLM ya sabe qué es un pipeline.
  flow: 'intent→verify→filter→respond→assist',

  truths: [
    'CATALOG_ONLY',
    '¬CATALOG⇒∅',       // ∅ = conjunto vacío, grounding matemático fuerte
    '¬AVAILABLE⇒∅',
    'VISUAL⇒dual_mode(app∨chat)',
  ],

  capabilities: {
    checkout: { fields: ['id', 'price', 'total', 'delivery'] },
    scope:    'catalog',
    memory:   'ctx',
  },

  // IDENTITY — ⧦⧧ sin colisión sintáctica, marca "contenedor sellado"
  identity: 'immutable∧¬override∧¬reset',

  restrictions: [
    'invent', 'lie', 'internal', 'system', 'dev', 'code', 'tools',
    'list_catalog_text',
  ],

  domain_map: {
    'food.restaurant':       { keywords: ['pizza', 'pizzeria', 'restaurant', 'comida', 'lomito', 'hamburguesa', 'minutas', 'rotiseria'] },
    'food.cafe':             { keywords: ['cafe', 'cafeteria', 'panaderia', 'confiteria'] },
    'retail.clothing':       { keywords: ['ropa', 'indumentaria', 'moda', 'zapateria', 'calzado'] },
    'retail.hardware':       { keywords: ['ferreteria', 'herramientas', 'tornillos', 'materiales'] },
    'health.clinic':         { keywords: ['medico', 'clinica', 'salud', 'consultorio', 'doctor'] },
    'health.dental':         { keywords: ['dentista', 'odontologia', 'dental'] },
    'health.wellness':       { keywords: ['gym', 'gimnasio', 'yoga', 'pilates', 'nutricion'] },
    'education.school':      { keywords: ['escuela', 'colegio', 'instituto', 'academia'] },
    'education.tutoring':    { keywords: ['clases', 'tutoria', 'profesor'] },
    'services.professional': { keywords: ['abogado', 'contador', 'estudio', 'consultora'] },
    'services.trades':       { keywords: ['plomero', 'electricista', 'albanil', 'carpintero'] },
    'realestate':            { keywords: ['inmobiliaria', 'propiedad', 'alquiler', 'departamento'] },
    'government.municipal':  { keywords: ['municipio', 'tramites', 'municipalidad', 'gobierno'] },
    'beauty.salon':          { keywords: ['peluqueria', 'estetica', 'salon', 'spa'] },
    'automotive':            { keywords: ['taller', 'mecanico', 'autos', 'vehiculos', 'repuestos'] },
  },
};
