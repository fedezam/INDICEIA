// api/wa-redirect/[id].js
//
// 08/09/2026: resolveWaNumber() + la lógica de isDemo/waDestino ya no
// viven acá duplicadas — se movieron a
// lib/redirect/resolveDemoWaNumber.js, compartido con
// service-redirect/[id].js (y cualquier *-redirect futuro: lead,
// contact, o lo que traiga un entityType nuevo). Mismo motivo de
// siempre: un solo punto de verdad para la validación de seguridad,
// en vez de N copias que puedan divergir con el tiempo.
import admin from 'firebase-admin';
import { resolveDemoAwareNumber } from '../../lib/redirect/resolveDemoWaNumber.js';

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
    const pairs = items.split(',').map(pair => {
      const [itemId, qty] = pair.split(':');
      return { itemId, qty: parseInt(qty, 10) || 1 };
    });

    // ── resolver contra Firestore (fuente real, no el blob) ──
    const productosSnap = await comercioRef.collection('productos').get();
    const productosById = new Map(productosSnap.docs.map(d => [d.id, d.data()]));

    const lineas = [];
    let subtotal = 0;

    for (const { itemId, qty } of pairs) {
      const p = productosById.get(itemId);
      if (!p || p.paused) continue; // inexistente o pausado → se ignora, no se inventa

      const tamañoRaw = p.atributos?.tamaño;
      const SKIP_VALUES = ['unidad', 'porción', 'porcion'];
      const tamaño = tamañoRaw && !SKIP_VALUES.includes(tamañoRaw.toLowerCase())
        ? tamañoRaw
        : null;
      const lineTotal = p.precio_final * qty;
      subtotal += lineTotal;
      lineas.push(`${qty}x ${p.nombre}${tamaño ? ' ' + tamaño : ''} - $${lineTotal}`);
    }

    if (!lineas.length) return res.status(422).send('Ningún item válido');

    const hasDelivery = modo === 'delivery' && data.entrega?.delivery;
    const deliveryCost = hasDelivery ? (data.entrega.delivery.costo?.valor ?? 0) : 0;
    const total = subtotal + deliveryCost;

    const modoLabel = modo === 'delivery' ? 'Delivery' : 'Retiro por el local';

    const mensaje = [
      isDemo
        ? 'Hola! Este es un pedido de PRUEBA generado desde el demostrador de IndiceIA 🧪'
        : 'Hola! Vengo de IndiceIA, este es mi pedido 🛒',
      '',
      ...lineas,
      '─────────────────',
      `Subtotal: $${subtotal}`,
      hasDelivery ? `Delivery (${data.entrega.delivery.zona ?? ''}): $${deliveryCost}` : null,
      `Modo: ${modoLabel}`,
      direccion ? `Direccion: ${direccion}` : null,
      `Total: $${total}`,
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
