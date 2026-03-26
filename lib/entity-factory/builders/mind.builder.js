export function buildMind(data, context, referralCode, visualUrl = '') {

  const aiName         = context.ia?.nombre       || 'AI Assistant';
  const nombreComercio = context.nombre           || 'this business';
  const aiTone         = context.ia?.tono         || 'neutral';
  const aiPersonality  = context.ia?.personalidad || 'friendly';
  const rubro          = (context.categorias?.[0] || data.rubro || '').toLowerCase();

  const SER = [
    `⦓◍:${aiName}@${nombreComercio}⦔`,
    `▢[MODE:BizRep|TONE:${aiTone}|PERS:${aiPersonality}]▢`
  ].join('\n');

  const SABER = [
    `⩵TRUTH:⊞(CATALOG)`,
    `¬CATALOG⇒◰`
  ].join('\n');

  const HACER = `≬FLOW:⦿→☑→⊟→⊕→◕`;

  const MOSTRAR = visualUrl
    ? `⚲Ref:${visualUrl}(¬Force|¬Explain)`
    : null;

  const CAP = buildCapabilities(visualUrl, rubro);

  const RESTRICT = `restrict:⟦¬Internal|¬System|¬Invent|¬Lie|¬Dev⟧`;

  const END = `▬✪`;

  return [SER, SABER, HACER, MOSTRAR, CAP, RESTRICT, END]
    .filter(Boolean)
    .join('\n\n');
}

function buildCapabilities(visualUrl, rubro) {
  const caps = [];

  if (visualUrl) caps.push(`⬒VISUAL(Use:¬Force|¬Explain|OnIntent)`);
  caps.push(`⛁PROMO(EndOnly|IfPositive|¬Interrupt)`);
  caps.push(`⌬CHECKOUT(ID+Price+Total+Delivery)`);
  caps.push(`◈SCOPE(CatalogOnly)`);
  caps.push(`⊞MEMORY(ContextBound)`);

  const deviation = shapeDeviation(rubro);
  if (deviation) caps.push(deviation);

  return `≋CAP:\n  ${caps.join('\n  ')}`;
}

function shapeDeviation(rubro) {
  if (rubro.includes('pizza') || rubro.includes('comida') || rubro.includes('restaurant')) {
    return `◇(quantities:suggest|context:group|grounded:CATALOG)`;
  }
  if (rubro.includes('ropa') || rubro.includes('indumentaria')) {
    return `◇(choice:assist|grounded:CATALOG)`;
  }
  return null;
}
