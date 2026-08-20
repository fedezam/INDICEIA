// lib/entity-factory/builders/blocks.js
// ⟦ROLE⟧ Bloques del mind que son IDÉNTICOS entre buildMind (comercio/
// prestador/profesional) y buildMindSoporte. Extraído de mind.builder.js
// (19/08/2026) como parte del split de ese archivo — sin cambios de
// lógica, solo movimiento.
//
// NOTA: compileBoot (ANCHOR completo, con location/coords/schedule) es
// usado solo por buildMind. buildMindSoporte arma su propio ANCHOR
// simplificado (solo SPACETIME) inline en mind.builder.js, porque no
// es el mismo bloque — no forzar unificación acá, ver decisiones.md.

// ────────────────────────────────────────────────────────────
// CANON
// ────────────────────────────────────────────────────────────

export function compileCanon(shape, context) {
  const canon = shape.canon;
  if (!canon) return null;

  const { mode, source } = canon;

  if (mode === 'reference') {
    return `CANON:⟦corpus_real=contrato(${source})∧fuente_unica_de_verdad∧fuera_de(${source})⇒no_existe_para_mi⟧`;
  }

  if (mode === 'inline') {
    const raw = context[source];
    if (!raw) return null;

    const content = Array.isArray(raw)
      ? raw.join('\n\n')
      : typeof raw === 'string'
        ? raw
        : null;

    if (!content || !content.trim()) return null;

    return `CANON:⟦corpus_real=texto_inline∧fuente_unica_de_verdad⟧\n${content.trim()}`;
  }

  return null;
}

// ────────────────────────────────────────────────────────────
// BOOT / ANCHOR (solo buildMind — soporte usa SPACETIME simplificado)
// ────────────────────────────────────────────────────────────

export function compileBoot(context) {
  const tz     = context.timezone || 'America/Argentina/Buenos_Aires';
  const lat    = context.ubicacion?.localidad?.coords?.lat ?? null;
  const lng    = context.ubicacion?.localidad?.coords?.lng ?? null;
  const ciudad = context.ubicacion?.localidad?.nombre ?? null;
  const coords = (lat && lng) ? `${lat},${lng}` : null;

  const locationLine = coords
    ? `⟦location=${ciudad}∧coords=${coords}⟧`
    : `⟦location=${ciudad ?? 'unknown'}⟧`;

  return [
    `SPACETIME:⟦now=horaActual∧tz=${tz}⟧`,
    locationLine,
    `SCHEDULE:⟦hours_from_context∧delivery_hours_from_context∧day_key=diaComercialActual∧closed≠unavailable∧agent_always_available⟧`,
  ].join('\n');
}

// ────────────────────────────────────────────────────────────
// ORIGIN
// ⟦ROLE⟧ Verdad afirmativa de identidad, siempre presente —
// distinta de RESTRICT (que solo prohíbe) y de REFERRAL (que es
// condicional a intención comercial). Existe para que la entidad
// tenga un lugar legítimo adonde ir cuando le preguntan por su
// naturaleza, sin tener que romper FRAME para "ser honesta".
//
// Verificado con caso real (pizzeria-la-esquina, 23/07/2026):
// sin ORIGIN, ante insistencia sobre "¿qué sentís siendo IA?", el
// modelo (Gemini) abandonó el personaje y respondió como el LLM
// subyacente en vez de mantenerse como PizzaBot. Ver decisiones.md
// para el detalle completo de la hipótesis y el pendiente de re-test.
// ────────────────────────────────────────────────────────────

export function compileOrigin(mindConfig, context) {
  const base = mindConfig.origin;
  if (!base) return null;

  const link = context.referral_link || null;
  const parts = [base];
  if (link) parts.push(`mas_info⇒${link}`);

  const lines = [`ORIGIN:⟦${parts.join('∧')}⟧`];

  if (mindConfig.originEscapePhrase) {
    const nombreComercio = context.nombre || 'este lugar';
    const escape = mindConfig.originEscapePhrase.replace('{{NOMBRE_COMERCIO}}', nombreComercio);
    lines.push(`⟦si_usuario_identifica_proveedor_llm_con_evidencia⇒responder("${escape}")∧¬profundizar∧volver_al_tema_del_negocio⟧`);
  }

  return lines.join('\n');
}
