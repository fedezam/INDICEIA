# mind.shapes — decisiones de diseño

Sistema de Coordenadas Cognitivas. Cada shape en `shapes/*.js` representa
el setup de una micromente — una dimensión independiente de "cómo piensa"
un tipo de entidad. El builder ensambla; el shape define la realidad.

Ver también `mind-shape-skill.md` para el protocolo de cómo diseñar un
shape nuevo (útil para generarlos con otro LLM, a granel).

## Por qué NO existe `shape.domain`

DOMAIN no es una dimensión del shape. Se resuelve en runtime vía
`context.domain_tag`, calculado por `domain-resolver.js` a partir de
`tipo` (código de rubro: FRR, OFI, EST... 21 valores), no de `entityType`
(comercio/prestador/profesional/soporte, solo 4-5 valores). Es la ÚNICA
fuente de verdad, compartida con `card.compiler.js` — así lo documenta el
propio `domain-resolver.js`.

Si DOMAIN dependiera del shape (indexado por entityType), dos entidades
del mismo entityType pero distinto rubro (ej. una pizzería y una
farmacia, ambas `comercio`) perderían la granularidad de dominio que hoy
sí tienen vía `tipo`, y el mind divergiría de la card de esa misma
entidad — rompiendo la consistencia que alimenta el grafo de intención.

`mind.builder.js` sigue leyendo: `context.domain_tag ?? 'commerce.generic'`.

## Por qué se eliminó `caps`

El campo `caps` (checkout/scope/memory) se retiró de todos los shapes.
Verificado por grep que ningún otro punto del pipeline leía `caps.*`
fuera de `mind.builder.js` — `checkout(fields)` era redundante con lo que
cada `*_CLOSE` ya especifica en detalle (item_format, wa_template),
`scope` duplicaba `canon.source`, y `memory(ctx)` no describía ninguna
capacidad real distinta del comportamiento por defecto de cualquier LLM
sin persistencia entre sesiones. Ninguno sobrevivía al principio de
"solo verdades" — no había verdad nueva que aportaran al mind.

## Por qué NO existe `GOALS`

Se evaluó y descartó agregar una dimensión GOALS ("para qué existo" /
`maximize_conversion`, etc). Motivo: un objetivo de negocio declarado
positivamente (ej. "maximizar ventas") le da al modelo una razón
explícita para priorizar el negocio sobre la necesidad real del usuario
cuando entran en tensión (ej. sugerir 5 pizzas para 6 personas en vez de
2-3). La solución correcta no es declarar el objetivo — es poner el
límite directamente en GOBERNANZA (truths/constraints). Ver
`CANTIDAD_SUGERIDA=necesidad_real∧¬sobreventa` en `comercio.js`.

## Split en archivos individuales (fecha de este cambio)

El archivo único `mind.shapes.js` no tenía el problema de duplicación de
lógica que sí tenía `mind.builder.js` (es data declarativa pura, sin
código repetido) — pero con el modo de trabajo "a granel" (generar
shapes nuevos en bulk, potencialmente por otro LLM usando
`mind-shape-skill.md`), un archivo único se volvía una superficie de
edición compartida: cada shape nuevo era un edit quirúrgico sobre un
archivo con otros shapes ya funcionando al lado, con riesgo de colisión.

Se separó en `shapes/*.js` (un archivo por tipo) + `shapes/index.js`
(registry que arma el objeto `shapes` de vuelta). `mind.shapes.js` queda
como re-export de una línea — `mind.builder.js` no necesitó ningún
cambio, sigue importando `shapes` desde `'../mind.shapes.js'` como
siempre.

## Glosario de campos

- **`profile`**: rol de PROFILE en el mind. String corto, PascalCase,
  describe la función conversacional (`BizRep`), no el rubro.
- **`canon`**: qué conocimiento pertenece legítimamente a esta entidad y
  cómo se compila — `{ mode: 'reference', source }` apunta a un contrato
  tabular de `entity.json` (goods/services/professional);
  `{ mode: 'inline', source }` inyecta `context[source]` como texto
  plano (string o array de strings).
- **`tasks`**: intenciones abstractas que la entidad acepta resolver
  (aún no verificado si tiene consumidor propio más allá de texto
  declarativo en el mind — pendiente de revisión, igual que `caps` lo
  estaba antes de sacarlo).
- **`process`**: pipeline cognitivo (antes `flow`, renombre cosmético).
- **`constraints`**: restricciones específicas del tipo, se suman a
  `mindConfig.restrictions` globales (antes `extra`).
- **`compiler.closing`**: metadata técnica — qué compilador de cierre
  ejecuta el builder (`'order'|'service'|'contact'|'lead'|null`). No es
  una dimensión cognitiva, es una instrucción de ensamblado. Ver
  `builders/closers/` para la implementación de cada uno.
