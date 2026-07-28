// api/service-redirect/[id].js
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
  const { servicio, modalidad, zona, consulta } = req.query;

  if (!comercioId || !servicio) {
    return res.status(400).send('Faltan parámetros');
  }

  try {
    const comercioRef  = db.collection('entidades').doc(comercioId);
    const comercioSnap = await comercioRef.get();
    if (!comercioSnap.exists) return res.status(404).send('Comercio no encontrado');

    const data = comercioSnap.data();
    const waNumber = resolveWaNumber(data.whatsapp);
    if (!waNumber) return res.status(409).send('Sin WhatsApp configurado');

    // ── resolver servicio contra Firestore (fuente real) ──
    const serviciosSnap = await comercioRef.collection('servicios').get();
    const serviciosById = new Map(
      serviciosSnap.docs.map(d => [d.id, d.data()])
    );

    const s = serviciosById.get(servicio);
    if (!s || s.activo !== true) return res.status(422).send('Servicio inválido o inactivo');

    const nombreServicio = s.nombre || 'Consulta';
    const precioLine = s.precio?.valor
      ? `Precio: $${s.precio.valor}`
      : 'Precio: a coordinar';

    const modalidadLabel = modalidad === 'domicilio' ? 'A domicilio' : 'En el local';

    const mensaje = [
      'Hola! Vengo de IndiceIA 👋',
      '',
      `Servicio: ${nombreServicio}`,
      `Modalidad: ${modalidadLabel}`,
      zona ? `Zona: ${zona}` : null,
      consulta ? `Consulta: ${consulta}` : null,
      precioLine,
      '─────────────────',
      'Quedamos en contacto 🙏',
    ].filter(Boolean).join('\n');

    const waUrl = `https://wa.me/549${waNumber}?text=${encodeURIComponent(mensaje)}`;

    // ── log fire-and-forget ──
    const slug = data.landing?.slug || null;
    if (slug) {
      db.collection('landing_events').add({
        destination: slug,
        event: 'wa_service_click',
        servicio,
        modalidad,
        zona: zona || null,
        timestamp: new Date(),
      }).catch(() => {});
    }

    return res.redirect(302, waUrl);
  } catch (err) {
    console.error('[SERVICE-REDIRECT]', err);
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
