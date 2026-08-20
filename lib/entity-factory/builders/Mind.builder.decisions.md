# mind.builder.js — historial de decisiones

Este archivo conserva el razonamiento detrás de cambios en `mind.builder.js`
y `closers/*`. Se separó del comentario de cabecera del código (19/08/2026)
porque el archivo estaba creciendo por acumulación de comentarios, no de
lógica — ver conversación de esa fecha. El código en sí queda auto-contenido
y liviano; este doc es la memoria de "por qué", útil para no repetir
experimentos ya descartados.

## Fix wa_url (27/07/2026)

Se elimina `wa_template` + `item_format` + `wa_url:wa.me` directo con
`{{wa_template_encoded}}`. El LLM ya no arma el texto del mensaje de
WhatsApp ni hace percent-encoding a mano — esa tarea determinística
causaba links rotos (el LLM no encodea de forma confiable, y algunos
clientes envuelven links "no verificados" armados a mano en un redirect
de Google Search). Ahora el mind solo instruye al LLM a concatenar pares
`{{ID}}:{{QTY}}` de los productos reales (ids que ya vienen en goods,
ASCII simple, sin encoding posible) y arma un link a un endpoint propio
(`api/wa-redirect/[id].js`) que resuelve contra Firestore, calcula
precios reales, arma el mensaje y hace el encoding de verdad, server-side,
antes de redirigir a wa.me.

Diagnóstico completo: bisect del commit "V2.0, hasta antes de esto
funcionaba" que descartó regresión — el diseño de delegar encoding al
LLM fue frágil desde siempre, no una regresión.

## Fix 28/07/2026

Mismo patrón aplicado a service/contact, que tenían el bug idéntico
(`wa_template` + `{{wa_template_encoded}}`) sin arreglar todavía. Ahora
los tres closers (order, service, contact) apuntan a un endpoint propio
por tipo — el LLM nunca arma texto libre con encoding, solo concatena
ids/campos ASCII simples en query params.

Email (mailto) queda deliberadamente AFUERA de este patrón: no se
construye un endpoint de redirect para mailto: por confiabilidad incierta
entre navegadores/SO, y porque email es canal secundario
(whatsapp:primary). Se maneja como copy_paste — mismo tratamiento que
redes sociales — en vez de armar un link.

## Fix 29/07/2026 — eliminación de SUBSCRIPTION

Se elimina `compileSubscription()`/`SUBSCRIPTION` del output. Ese
mecanismo horneaba el estado de plan (`active=false`) en tiempo de
generación (`buildEntity()`), leyendo `data.plan.active` en ese momento
— mismo problema de fondo que tenía el cron de vencimiento: si el plan
cambiaba de estado DESPUÉS de generarse el Blob, este bloque quedaba
desactualizado hasta la próxima regeneración.

Además, solo agregaba una instrucción (`¬operate`) sin remover
goods/services/visual/MINIAPP/ORDER_CLOSE del propio mind, dependiendo
de que el LLM "obedeciera" en vez de ocultar la información
estructuralmente.

El enforcement de plan ahora vive enteramente en el proxy
(`api/entity/[id].js`), que lo calcula en tiempo real por request vía
`resolvePlanStatus()` + recorta los bloques operativos vía
`stripOperationalBlocks()` + agrega el bloque `⟦INACTIVE⟧` con el
mensaje de huelga definido en `mind.config.js` (`inactiveConfig`).
`buildMind()`/`buildEntity()` ya no necesitan saber nada sobre el estado
del plan — el mind que sale de acá está siempre "sano".

## Fix 19/08/2026 — LEAD_CLOSE

Se agrega `compileLeadClose()` + closer `lead`. Detectamos que
ORDER_CLOSE fuerza el mismo esqueleto transaccional
(qty+pickup+delivery+direccion) a comercios donde ese modelo no existe
(autos, maquinaria, industria — el cliente va a ver/probar en persona,
no hay entrega ni "cantidad" de auto).

No se creó un entityType nuevo: la entidad sigue siendo `comercio` con
`goods` real (mismo catálogo/precio/schema) — lo único que cambia es el
modelo de cierre. Por eso la bifurcación NO vive en `shape.compiler`
(fijo por entityType) sino en runtime, leyendo
`context.modeloCierre === 'showroom_lead'` (seteado en el nuevo step de
onboarding `modelo-cierre.js`).

`compileLeadClose` reusa el endpoint `contact-redirect` (generalizado el
mismo día para aceptar `item` además de `motivo`) en vez de
`wa-redirect` — mismo shape de "conectar con una persona", sin lógica de
pedido/subtotal.

## Split del archivo en módulos (19/08/2026)

`mind.builder.js` venía creciendo por acumulación lineal: cada closer
nuevo repetía ~60% de estructura con los anteriores, y `buildMind`/
`buildMindSoporte` duplicaban casi enteros los bloques FRAME→REASONING.
Se separó en:

- `closers/*.js` — un archivo por closer + `closers/index.js` como
  registry. Agregar un closer nuevo ya no toca `mind.builder.js`.
- `blocks.js` — `compileOrigin`, `compileCanon`, `compileBoot`: bloques
  idénticos byte-a-byte entre `buildMind` y `buildMindSoporte`.
- `utils.js` — `sanitize`, `resolveWaNumber`.
- Este archivo — todo el historial que antes vivía como comentario de
  cabecera.

Se decidió explícitamente NO unificar `buildMind` y `buildMindSoporte`
en una función común: soporte tiene diferencias reales (ANCHOR
simplificado sin location/coords/schedule, GREET distinto, sin
VISUAL_MODE/ORDER_CLOSE), y forzar una función compartida hubiera
metido flags `if entityType === 'soporte'` adentro del bloque común —
justo el acoplamiento que `CLOSING_COMPILERS` evita para los closers.

## Estado de la revisión anterior (previa al split, conservado por
contexto)

Sobre la base de una etapa anterior, esa revisión:

- Elimina `CAP`/`compileCoreCaps()`. Grep confirmó cero consumidores
  fuera de ese archivo. `checkout(fields)` era redundante con
  `*_CLOSE`, `scope` duplicaba `canon.source`, `memory(ctx)` no
  describía nada distinto del comportamiento default de cualquier LLM
  sin persistencia entre sesiones.

- NO adopta `shape.domain` ni `GOALS`, propuestos en una sesión
  paralela sin verificación contra el pipeline real. `DOMAIN` sigue
  viniendo de `context.domain_tag` (resuelto por `domain-resolver.js` a
  partir de `tipo`/rubro — 21 valores, fuente única compartida con
  `card.compiler.js`). Adoptar `shape.domain` indexado por entityType
  (4 valores) hubiera perdido granularidad y desincronizado mind vs
  card para la misma entidad — verificado leyendo `domain-resolver.js`
  y `card.compiler.js` antes de descartarlo.

- `GOALS` se descarta explícitamente: un objetivo de negocio declarado
  (`maximize_conversion`) le da al modelo una razón para priorizar
  venta sobre necesidad real del usuario. El límite correcto vive en
  GOBERNANZA (truths/constraints), no en una dimensión de propósito.
  Ver `CANTIDAD_SUGERIDA=necesidad_real∧¬sobreventa` en shapes.

- `shape.tasks` se mantiene pero queda marcado como PENDIENTE: no tiene
  consumidor propio verificado más allá de imprimir TASKS como texto
  declarativo — mismo estado que CAP antes de auditarlo. No se le
  agregó un `compileTasks()` todavía porque no pasó el mismo escrutinio
  (¿introduce información irreducible, o el LLM ya lo infiere de
  TRUTH + `compiler.closing`?). Queda fuera del output hasta decidir.

- `filosofo` se mantiene en `shapes.js` como caso de test mínimo
  (`closing:null`, sin mecánica comercial) — no se agregó lógica nueva
  al builder para soportarlo: si compila sin tocar este archivo,
  confirma la genericidad real.

## Principio del orden narrativo (histórico, sigue vigente)

El orden del mind NO sigue el orden del código, ni el histórico, ni el
de las funciones JS. Sigue el orden en que una inteligencia (humana o
artificial) construye la comprensión de una entidad.

| Pregunta                  | Bloques |
|---------------------------|---------|
| ¿Quién sos?                | FRAME, IDENTITY |
| ¿Qué sos?                  | PROFILE, CORE, DOMAIN |
| ¿Cómo funciona tu mundo?   | TRUTH, FLOW |
| ¿Cómo está el mundo hoy?   | ANCHOR/SPACETIME, GLOBAL_CONTEXT |
| ¿Qué acciones tomás?       | GREET, VISUAL_MODE (reflejos, sin estado) / ORDER_CLOSE (workflow, con estado y secuencia de pasos) |
| Políticas globales         | RESTRICT, META, LIMIT, BOUNDARY, PRIVACY, REASONING |
| Auxiliares                 | REFERRAL |

(El gate "¿Puede operar?" — antes SUBSCRIPTION, primero en la lista —
ya no vive acá; ver Fix 29/07/2026 arriba.)

La distinción reflejo/workflow dentro de OPERACIÓN es objetiva, no
estética: un reflejo es `condición⇒acción`, una sola flecha, sin estado
intermedio (GREET, VISUAL_MODE). Un workflow tiene secuencia con estado
(`resolve_availability→collect_items→ask_delivery→...→confirm→
wa_message`) y trae su propia gobernanza local inline (`¬invent`,
`only_after_explicit_ask`) — gobernanza aplicada en el scope del
proceso, no una tercera categoría nueva.
