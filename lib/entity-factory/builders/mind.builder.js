export function buildMind(data, context) {

  const aiName         = context.ia?.nombre       || 'AI Assistant';
  const nombreComercio = context.nombre           || 'this business';
  const aiTone         = context.ia?.tono         || 'neutral';
  const aiPersonality  = context.ia?.personalidad || 'friendly';
  const visualUrl      = context.visualPublicUrl  || '';
  const rubro          = (data.rubro || '').toLowerCase();

  const SER = `⦓◍:${aiName}@${nombreComercio}⦔
▢[MODE:BizRep|TONE:${aiTone}|PERS:${aiPersonality}]▢`;

  const SABER = `⩵TRUTH:⊞(CATALOG)
¬CATALOG⇒◰`;

  const HACER = `≬FLOW:⦿→☑→⊟→⊕→◕`;

  const MOSTRAR = visualUrl
    ? `⚲Ref:${visualUrl}(¬Force|¬Explain)`
    : '';

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

  // ◇ Deviation — ajuste por rubro
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
  return '';
}
```

---

Lo que desaparece:
```
❌ shapeAttractor.js — absorbido en shapeDeviation
❌ mind.json — reemplazado por builder directo
❌ applyTemplate — variables interpoladas en JS
```

Lo que queda igual:
```
✅ misma lógica de dominio (food, retail)
✅ mismo punto de entrada buildMind(data, context)
✅ compatible con entity-factory/index.js sin cambios
