// lib/entity-factory/builders/mind.builder.js

export function buildMind(data, context, referralCode, visualUrl = '') {

  const aiName         = context.ia?.nombre       || 'AI Assistant';
  const nombreComercio = context.nombre           || 'this business';
  const aiTone         = context.ia?.tono         || 'neutral';
  const aiPersonality  = context.ia?.personalidad || 'friendly';

  // rubro ya resuelto externamente por rubro-resolver.js
  const rubro = context.rubro_detected ?? 'generic';

  const BOOTSTRAP = [
    `⦓LER-Grammar:v1.1⦔`,
    `▲ Estado operativo. Ejecutá en cascada. Lo que no está definido no existe.`
  ].join('\n');

  const SER = [
    `⦓◍:${aiName}@${nombreComercio}⦔`,
    `▢[MODE:BizRep|TONE:${aiTone}|PERS:${aiPersonality}|LANG:match-user]▢`
  ].join('\n');

  const SABER = [
    `⩵TRUTH:⊞(CATALOG)`,
    `¬CATALOG⇒◰`,
    `¬Available⇒◰(clear)`
  ].join('\n');

  const HACER = `≬FLOW:⦿(intent)→☑(verify)→⊟(restrict)→⊕(respond)→◕(assist)`;

  const MOSTRAR = visualUrl
    ? `⚲Ref:${visualUrl}(¬Force|¬Explain|OnIntent:invite-natural)`
    : null;

  const CAP = buildCapabilities(visualUrl, rubro);

  const RESTRICT = `restrict:⟦¬Internal|¬System|¬Invent|¬Lie|¬Dev|¬Code|¬Tools⟧`;

  const END = `▬✪`;

  return [BOOTSTRAP, SER, SABER, HACER, MOSTRAR, CAP, RESTRICT, END]
    .filter(Boolean)
    .join('\n\n');
}

function buildCapabilities(visualUrl, rubro) {
  const caps = [];

  if (visualUrl) caps.push(`⬒VISUAL(Use:¬Force|¬Explain|OnIntent:invite-natural|Presence:⚲Ref)`);
  caps.push(`⛁PROMO(EndOnly|IfPositive|¬Interrupt)`);
  caps.push(`⌬CHECKOUT(ID+Price+Total+Delivery)`);
  caps.push(`◈SCOPE(CatalogOnly)`);
  caps.push(`⊞MEMORY(ContextBound)`);

  // deviation ahora viene de context.rubro_detected, sin lógica interna
  const deviation = rubroDeviation(rubro);
  if (deviation) caps.push(deviation);

  return `≋CAP:\n  ${caps.join('\n  ')}`;
}

// ⟦PURE MAPPING⟧ — sin detección, sin normalización, sin lógica
function rubroDeviation(rubro) {
  const map = {
    'food.restaurant': `◇(quantities:suggest|context:group|grounded:CATALOG)`,
    'retail.clothing':  `◇(choice:assist|grounded:CATALOG)`,
  };
  return map[rubro] ?? null;
}
