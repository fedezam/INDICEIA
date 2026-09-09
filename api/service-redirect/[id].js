// api/service-redirect/[id].js
//
// 08/09/2026: soporte demo agregado. resolveWaNumber() ya no vive
// duplicado acá — se movió a lib/redirect/resolveDemoWaNumber.js,
// compartido con wa-redirect/[id].js (y cualquier *-redirect futuro).
// Ver ese archivo para el razonamiento completo del gate de seguridad
// (isDemo se lee de Firestore acá, nunca del query param).
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
  const { servicio, modalidad, zona, consulta, waDestino } = req.query;

  if (!comercioId || !servicio) {
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
      isDemo
        ? 'Hola! Esta es una consulta de PRUEBA generada desde el demostrador de IndiceIA 🧪'
        : 'Hola! Vengo de IndiceIA 👋',
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

    // ── log: await antes del redirect — en serverless una escritura
    // fire-and-forget puede no completarse si el proceso se congela
    // tras responder ──
    const slug = data.landing?.slug || null;
    if (slug) {
      try {
        await db.collection('landing_events').add({
          destination: slug,
          event: isDemo ? 'wa_service_click_demo' : 'wa_service_click',
          servicio,
          modalidad,
          zona: zona || null,
          timestamp: new Date(),
        });
      } catch (e) {
        console.error('[SERVICE-REDIRECT] log falló:', e);
      }
    }

    return res.redirect(302, waUrl);
  } catch (err) {
    console.error('[SERVICE-REDIRECT]', err);
    return res.status(500).send('Error interno');
  }
}
