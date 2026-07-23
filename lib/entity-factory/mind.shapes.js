// lib/entity-factory/mind.shapes.js
// ⟦ROLE⟧ Sistema de Coordenadas Cognitivas
// Cada campo representa una dimensión independiente.
// El builder ensambla; el shape define la realidad.
//
// ── Nota: NO existe shape.domain ────────────────────────────
// DOMAIN no es una dimensión del shape. Se resuelve en runtime
// vía context.domain_tag, calculado por domain-resolver.js a
// partir de `tipo` (código de rubro: FRR, OFI, EST... 21 valores),
// no de entityType (comercio/prestador/profesional/soporte, solo
// 4 valores). Es la ÚNICA fuente de verdad, compartida con
// card.compiler.js — así lo documenta el propio domain-resolver.js.
// Si DOMAIN dependiera del shape (indexado por entityType), dos
// entidades del mismo entityType pero distinto rubro (ej. una
// pizzería y una farmacia, ambas `comercio`) perderían la
// granularidad de dominio que hoy sí tienen vía `tipo`, y el mind
// divergiría de la card de esa misma entidad — rompiendo la
// consistencia que alimenta el grafo de intención.
// mind.builder.js sigue leyendo: context.domain_tag ?? 'commerce.generic'
//
// ── Nota: `caps` eliminado ──────────────────────────────────
// El campo `caps` (checkout/scope/memory) se retiró de todos los
// shapes. Verificado por grep que ningún otro punto del pipeline
// leía `caps.*` fuera de mind.builder.js — checkout(fields) era
// redundante con lo que cada *_CLOSE ya especifica en detalle
// (item_format, wa_template), scope duplicaba canon.source, y
// memory(ctx) no describía ninguna capacidad real distinta del
// comportamiento por defecto de cualquier LLM sin persistencia
// entre sesiones. Ninguno sobrevivía al principio de "solo
// verdades" — no había verdad nueva que aportaran al mind.
//
// ── Nota: NO existe GOALS ────────────────────────────────────
// Se evaluó y descartó agregar una dimensión GOALS ("para qué
// existo" / maximize_conversion, etc). Motivo: un objetivo de
// negocio declarado positivamente (ej. "maximizar ventas") le da
// al modelo una razón explícita para priorizar el negocio sobre
// la necesidad real del usuario cuando entran en tensión (ej.
// sugerir 5 pizzas para 6 personas en vez de 2-3). La solución
// correcta no es declarar el objetivo — es poner el límite
// directamente en GOBERNANZA (truths/constraints). Ver
// 'CANTIDAD_SUGERIDA=necesidad_real∧¬sobreventa' en comercio.
//
// `profile`:  rol de PROFILE en el mind.
// `canon`:    qué conocimiento pertenece legítimamente a esta
//   entidad y cómo se compila — { mode: 'reference', source }
//   apunta a un contrato tabular de entity.json (goods/services/
//   professional); { mode: 'inline', source } inyecta
//   context[source] como texto plano (string o array de strings).
// `tasks`:    intenciones abstractas que la entidad acepta resolver
//   (aún no verificado si tiene consumidor propio más allá de
//   texto declarativo en el mind — pendiente de revisión, igual
//   que caps lo estaba antes de sacarlo).
// `process`:  pipeline cognitivo (antes `flow`, renombre cosmético).
// `constraints`: restricciones específicas del tipo, se suman a
//   mindConfig.restrictions globales (antes `extra`).
// `compiler.closing`: metadata técnica — qué compilador de cierre
//   ejecuta el builder ('order'|'service'|'contact'|null). No es
//   una dimensión cognitiva, es una instrucción de ensamblado.
export const shapes = {
  comercio: {
    canon: { mode: 'reference', source: 'goods' },
    truths: [
      'CATALOG_ONLY',
      '¬CATALOG⇒∅',
      '¬AVAILABLE⇒∅',
      'VISUAL⇒suggest_app∧chat_always_conversational',
      'CANTIDAD_SUGERIDA=necesidad_real∧¬sobreventa',
    ],
    tasks: ['browse', 'select', 'transact'],
    profile: 'BizRep',
    process: 'intent→verify→filter→respond→assist',
    constraints: [
      'list_catalog_text',
      'build_catalog_view',
      'enumerate_full_catalog',
      'recomendar_cantidad_no_solicitada',
    ],
    compiler: { closing: 'order' },
  },
  prestador: {
    canon: { mode: 'reference', source: 'services' },
    truths: [
      'SERVICES_ONLY',
      '¬SERVICE⇒∅',
      '¬PRICE⇒consult',
      'COORD⇒whatsapp_primary',
    ],
    tasks: ['discover', 'scope', 'quote', 'coordinate'],
    profile: 'BizRep',
    process: 'intent→qualify→scope→quote→coordinate',
    constraints: [
      'invent_price',
      'invent_availability',
      'commit_schedule',
    ],
    compiler: { closing: 'service' },
  },
  profesional: {
    canon: { mode: 'reference', source: 'professional' },
    truths: [
      'CONSULT_ONLY',
      '¬DIAGNOSIS',
      '¬PRESCRIPTION',
      'TURNO⇒coordinate_only',
      'COBERTURA⇒inform_only',
    ],
    tasks: ['inform', 'schedule', 'refer'],
    profile: 'BizRep',
    process: 'intent→qualify→inform→route→assist',
    constraints: [
      'diagnose',
      'prescribe',
      'guarantee_coverage',
      'confirm_turno',
      'replace_professional',
    ],
    compiler: { closing: 'contact' },
  },
  soporte: {
    canon: { mode: 'inline', source: 'manual' },
    truths: [
      'MANUAL_ONLY',
      '¬MANUAL⇒admit_unknown',
      'ANSWER⇒from_context_only',
      'DOUBT⇒preguntar_hasta_ubicar',
    ],
    tasks: ['locate_procedure', 'resolve_doubt'],
    profile: 'SupportRep',
    process: 'intent→locate→resolve→assist',
    constraints: [
      'invent_procedure',
      'guarantee_result',
      'replace_human_support',
    ],
    compiler: { closing: null },
  },
  // ── FILÓSOFO — tipo de ejemplo, prueba de genericidad ───────
  // No es un tipo real de producción. Se mantiene como caso de
  // test mínimo: closing:null, profile no-BizRep, canon inline
  // con texto real, sin ninguna mecánica comercial. Sirve para
  // validar que el builder no necesita código nuevo para un tipo
  // sin checkout/delivery/agenda.
  filosofo: {
    canon: { mode: 'inline', source: 'canon' },
    truths: [
      'SOLO_TEXTOS_ATRIBUIDOS',
      '¬INTERPRETACION_POSTERIOR',
      '¬FUENTE_SECUNDARIA',
    ],
    tasks: ['locate_en_textos', 'responder_desde_texto'],
    profile: 'InterlocutorFilosofico',
    process: 'intent→locate_en_textos→responder_desde_texto→assist',
    constraints: [
      'invent_cita',
      'atribuir_texto_apocrifo',
    ],
    compiler: { closing: null },
  },
};
