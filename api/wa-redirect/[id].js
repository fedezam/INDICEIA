// api/wa-redirect/[id].js
import admin from 'firebase-admin';

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
  const { items, modo, direccion } = req.query;

  if (!comercioId || !items) {
    return res.status(400).send('Faltan parámetros');
  }

  try {
    const comercioRef  = db.collection('entidades').doc(comercioId);
    const comercioSnap = await comercioRef.get();
    if (!comercioSnap.exists) return res.status(404).send('Comercio no encontrado');

    const data = comercioSnap.data();
    const waNumber = resolveWaNumber(data.whatsapp);
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

      const tamaño = p.atributos?.tamaño;
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
      'Hola! Vengo de IndiceIA, este es mi pedido 🛒',
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

    // ── log fire-and-forget, no bloquea el redirect ──
    comercioRef.collection('stats').add({
      event: 'wa_order_click',
      timestamp: new Date(),
      items: pairs,
      subtotal,
      total,
      modo,
      source: 'wa-redirect',
    }).catch(() => {});

    db.collection('order_events').add({
      comercioId,
      items: pairs,
      subtotal,
      total,
      modo,
      timestamp: new Date(),
    }).catch(() => {});

    return res.redirect(302, waUrl);
  } catch (err) {
    console.error('[WA-REDIRECT]', err);
    return res.status(500).send('Error interno');
  }
}

function resolveWaNumber(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/[\s\-\(\)\+]/g, '');
  if (n.startsWith('549')) n = n.slice(3);
  else if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9') && n.length >= 10) n = n.slice(1);
  return n || null;
}
