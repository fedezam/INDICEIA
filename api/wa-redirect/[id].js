// api/wa-redirect/[id].js
//
// 08/09/2026: resolveWaNumber() + la lógica de isDemo/waDestino ya no
// viven acá duplicadas — se movieron a
// lib/redirect/resolveDemoWaNumber.js, compartido con
// service-redirect/[id].js (y cualquier *-redirect futuro: lead,
// contact, o lo que traiga un entityType nuevo). Mismo motivo de
// siempre: un solo punto de verdad para la validación de seguridad,
// en vez de N copias que puedan divergir con el tiempo.
//
// 07/10/2026: el LLM manda texto libre y ids, nunca se confía en
// ellos. Cambios:
//   - Cantidad: antes `parseInt(qty) || 1` dejaba pasar negativos
//     (restaban del subtotal) y cantidades absurdas. Ahora una
//     cantidad menor a 1 o mayor a MAX_QTY invalida ESA línea (se
//     ignora, igual que un id inexistente). Sin cantidad ("id" a
//     secas) sigue valiendo 1.
//   - Precio ausente: un item con precio_final 0, nulo o no numérico
//     antes imprimía $0 o $NaN y subestimaba el total. Ahora se lista
//     como "a consultar", no suma, y los rótulos de subtotal y total
//     aclaran "sin items a consultar".
//   - Topes de largo: máximo de líneas de items (MAX_ITEMS) y de
//     caracteres de direccion (MAX_DIRECCION).
//   - Se agrega "Pedido generado: <hora>" con la hora real del
//     servidor, para que el comercio vea cuándo se armó el pedido
//     (la hora que ve el LLM es una foto del momento en que leyó la
//     URL de la entidad). Si no se quiere, borrar esa línea y el
//     import de getHoraActual.
import admin from 'firebase-admin';
import { resolveDemoAwareNumber } from '../../lib/redirect/resolveDemoWaNumber.js';
import { getHoraActual } from '../../lib/utils/getHoraActual.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

// Topes: el LLM es una fuente no confiable. MAX_QTY es alto a
// propósito para no bloquear pedidos grandes legítimos (eventos).
const MAX_ITEMS     = 50;
const MAX_QTY       = 1000;
const MAX_DIRECCION = 200;

const tienePrecio = (p) => {
  const n = Number(p.precio_final);
  return Number.isFinite(n) && n > 0;
};

export default async function handler(req, res) {
  const { id: comercioId } = req.query;
  const { items, modo, direccion, waDestino } = req.query;

  if (!comercioId || !items) {
    return res.status(400).send('Faltan parámetros');
  }

  try {
    const comercioRef  = db.collection('entidades').doc(comercioId);
    const comercioSnap = await comercioRef.get();
    if (!comercioSnap.exists) return res.status(404).send('Comercio no encontrado');

    const data = comercioSnap.data();

    // ── DEMO: resolver número destino. isDemo se lee de Firestore acá
    // (data.isDemo), NUNCA del query param — si la entidad no es demo,
    // waDestino se ignora en silencio aunque venga en la URL. Ver
    // lib/redirect/resolveDemoWaNumber.js. ──
    const isDemo = data.isDemo === true;
    const waNumber = resolveDemoAwareNumber(data, waDestino);
    if (!waNumber) return res.status(409).send('Comercio sin WhatsApp configurado');

    // ── parsear items: "id:qty,id:qty" ──
    // Sin qty ("id") vale 1. Con qty no numérica también vale 1.
    // La validación de rango se hace más abajo, línea por línea.
    const pairs = String(items)
      .split(',')
      .slice(0, MAX_ITEMS)
      .map(pair => {
        const [itemId, qty] = pair.split(':');
        const n = parseInt(qty, 10);
        return { itemId: (itemId || '').trim(), qty: Number.isFinite(n) ? n : 1 };
      });

    // ── resolver contra Firestore (fuente real, no el blob) ──
    const productosSnap = await comercioRef.collection('productos').get();
    const productosById = new Map(productosSnap.docs.map(d => [d.id, d.data()]));

    const lineas = [];
    let subtotal = 0;
    let hayAConsultar = false;

    for (const { itemId, qty } of pairs) {
      if (qty < 1 || qty > MAX_QTY) continue; // cantidad inválida → se ignora la línea

      const p = productosById.get(itemId);
      if (!p || p.paused) continue; // inexistente o pausado → se ignora, no se inventa

      const tamañoRaw = p.atributos?.tamaño;
      const SKIP_VALUES = ['unidad', 'porción', 'porcion'];
      const tamaño = tamañoRaw && !SKIP_VALUES.includes(tamañoRaw.toLowerCase())
        ? tamañoRaw
        : null;
      const etiqueta = `${qty}x ${p.nombre}${tamaño ? ' ' + tamaño : ''}`;

      if (tienePrecio(p)) {
        const lineTotal = Number(p.precio_final) * qty;
        subtotal += lineTotal;
        lineas.push(`${etiqueta} - $${lineTotal}`);
      } else {
        hayAConsultar = true;
        lineas.push(`${etiqueta} - a consultar`);
      }
    }

    if (!lineas.length) return res.status(422).send('Ningún item válido');

    const hasDelivery = modo === 'delivery' && data.entrega?.delivery;
    const deliveryCost = hasDelivery ? (data.entrega.delivery.costo?.valor ?? 0) : 0;
    const total = subtotal + deliveryCost;

    const modoLabel = modo === 'delivery' ? 'Delivery' : 'Retiro por el local';
    const direccionTxt = direccion ? String(direccion).slice(0, MAX_DIRECCION) : null;
    const sufijoTotal = hayAConsultar ? ' (sin items a consultar)' : '';

    const mensaje = [
      isDemo
        ? 'Hola! Este es un pedido de PRUEBA generado desde el demostrador de IndiceIA 🧪'
        : 'Hola! Vengo de IndiceIA, este es mi pedido 🛒',
      '',
      ...lineas,
      '─────────────────',
      `Subtotal${sufijoTotal}: $${subtotal}`,
      hasDelivery ? `Delivery (${data.entrega.delivery.zona ?? ''}): $${deliveryCost}` : null,
      `Modo: ${modoLabel}`,
      direccionTxt ? `Direccion: ${direccionTxt}` : null,
      `Total${sufijoTotal}: $${total}`,
      `Pedido generado: ${getHoraActual()}`,
      '─────────────────',
      'Gracias, espero tu confirmacion 🙏',
    ].filter(Boolean).join('\n');

    const waUrl = `https://wa.me/549${waNumber}?text=${encodeURIComponent(mensaje)}`;

    // ── log: debe ir a landing_events (destination=slug), que es lo
    // único que lee stats.js — y debe esperarse (await) antes del
    // redirect, porque en serverless una escritura fire-and-forget
    // puede no completarse si el proceso se congela tras responder ──
    const slug = data.landing?.slug || null;
    if (slug) {
      try {
        await db.collection('landing_events').add({
          destination: slug,
          event: isDemo ? 'wa_order_click_demo' : 'wa_order_click',
          items: pairs,
          subtotal,
          total,
          modo,
          timestamp: new Date(),
        });
      } catch (e) {
        console.error('[WA-REDIRECT] log falló:', e);
        // no bloquea el redirect igual — el usuario no debe notar el fallo de logging
      }
    }

    return res.redirect(302, waUrl);
  } catch (err) {
    console.error('[WA-REDIRECT]', err);
    return res.status(500).send('Error interno');
  }
}
