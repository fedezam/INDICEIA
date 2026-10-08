// api/service-redirect/[id].js
//
// 08/09/2026: soporte demo agregado. resolveWaNumber() ya no vive
// duplicado acá — se movió a lib/redirect/resolveDemoWaNumber.js,
// compartido con wa-redirect/[id].js (y cualquier *-redirect futuro).
// Ver ese archivo para el razonamiento completo del gate de seguridad
// (isDemo se lee de Firestore acá, nunca del query param).
//
// 07/10/2026: combos. El closer (closers/service.js) ya le pide al
// LLM mandar varios servicios en `servicio` separados por coma
// ("id1,id2"), pero este endpoint buscaba el string entero como un
// solo id y respondía 422 en cualquier combo. Ahora se separa por
// coma, se resuelve cada servicio contra Firestore (los inválidos o
// inactivos se ignoran, no se inventan, igual que wa-redirect) y el
// mensaje los lista. Con un solo servicio el mensaje es idéntico al
// anterior. Precio de combo: la suma si todos tienen precio; si
// alguno no lo tiene, "a coordinar" (misma regla que `quote` en el
// closer). También se agregan topes de largo a zona, consulta y
// cantidad de servicios.
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

// Topes: texto libre que viene del LLM, nunca se confía en el largo.
const MAX_SERVICIOS = 10;
const MAX_ZONA      = 100;
const MAX_CONSULTA  = 500;

const tienePrecio = (s) => !!s.precio?.valor;

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

    // ── resolver servicio(s) contra Firestore (fuente real) ──
    // `servicio` puede traer un id o varios separados por coma
    // (combo). Se deduplica y se limita la cantidad.
    const ids = [...new Set(
      String(servicio).split(',').map(x => x.trim()).filter(Boolean)
    )].slice(0, MAX_SERVICIOS);

    const serviciosSnap = await comercioRef.collection('servicios').get();
    const serviciosById = new Map(
      serviciosSnap.docs.map(d => [d.id, d.data()])
    );

    // inexistente o inactivo → se ignora, no se inventa
    const validos = ids
      .map(id => serviciosById.get(id))
      .filter(s => s && s.activo === true);

    if (!validos.length) return res.status(422).send('Servicio inválido o inactivo');

    // ── líneas de servicio y precio ──
    let servicioLines;
    let precioLine;

    if (validos.length === 1) {
      const s = validos[0];
      servicioLines = [`Servicio: ${s.nombre || 'Consulta'}`];
      precioLine = tienePrecio(s)
        ? `Precio: $${s.precio.valor}`
        : 'Precio: a coordinar';
    } else {
      servicioLines = [
        'Servicios:',
        ...validos.map(s =>
          `- ${s.nombre || 'Consulta'} - ${tienePrecio(s) ? `$${s.precio.valor}` : 'a coordinar'}`
        ),
      ];
      precioLine = validos.every(tienePrecio)
        ? `Precio total: $${validos.reduce((acc, s) => acc + Number(s.precio.valor), 0)}`
        : 'Precio total: a coordinar';
    }

    const modalidadLabel = modalidad === 'domicilio' ? 'A domicilio' : 'En el local';

    const zonaTxt     = zona     ? String(zona).slice(0, MAX_ZONA)         : null;
    const consultaTxt = consulta ? String(consulta).slice(0, MAX_CONSULTA) : null;

    const mensaje = [
      isDemo
        ? 'Hola! Esta es una consulta de PRUEBA generada desde el demostrador de IndiceIA 🧪'
        : 'Hola! Vengo de IndiceIA 👋',
      '',
      ...servicioLines,
      `Modalidad: ${modalidadLabel}`,
      zonaTxt ? `Zona: ${zonaTxt}` : null,
      consultaTxt ? `Consulta: ${consultaTxt}` : null,
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
          zona: zonaTxt,
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
