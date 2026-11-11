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
//
// 11/11/2026:
//   - Filtro de activo alineado con services.builder.js: `!== false`.
//     Antes exigía `=== true` y descartaba servicios cuyo doc no tiene
//     el campo, que el builder SÍ le entrega al LLM con su id.
//   - Nombre completo: las variantes (hijos con parent_id) se muestran
//     como "Padre - Variante" ("Depilacion Definitiva - Axila",
//     "Presoterapia - 40 minutos"). Sin esto el comercio recibía
//     "Servicio: 40 minutos".
//   - `modalidad` es opcional: si no viene (entidades de local fijo),
//     no se imprime la línea. Antes asumía "En el local".
//   - Servicio inválido ya no corta con 422: la persona no ve un error
//     en el navegador, se redirige a WhatsApp con "Servicio: a definir"
//     y lo que haya en `consulta`. Se loguea aparte
//     (wa_service_click_sin_servicio) para detectar el problema.
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
  const { id: entidadId } = req.query;
  const { servicio, modalidad, zona, consulta, waDestino } = req.query;

  if (!entidadId || !servicio) {
    return res.status(400).send('Faltan parámetros');
  }

  try {
    const comercioRef  = db.collection('entidades').doc(entidadId);
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

    // inexistente o inactivo → se ignora, no se inventa.
    // `!== false` tolera entidades donde `activo` no existe (mismo
    // criterio que services.builder.js).
    const validos = ids
      .map(id => serviciosById.get(id))
      .filter(s => s && s.activo !== false);

    const sinServicio = validos.length === 0;
    if (sinServicio) {
      console.warn('[SERVICE-REDIRECT] servicio inválido o inactivo', { entidadId, servicio });
    }

    // Variantes: "Padre - Variante". Si no tiene padre, el nombre solo.
    const nombreCompleto = (s) => {
      const n = s.nombre || 'Consulta';
      const padre = s.parent_id ? serviciosById.get(s.parent_id) : null;
      return padre?.nombre ? `${padre.nombre} - ${n}` : n;
    };

    // ── líneas de servicio y precio ──
    let servicioLines;
    let precioLine;

    if (sinServicio) {
      servicioLines = ['Servicio: a definir'];
      precioLine = null;
    } else if (validos.length === 1) {
      const s = validos[0];
      servicioLines = [`Servicio: ${nombreCompleto(s)}`];
      precioLine = tienePrecio(s)
        ? `Precio: $${s.precio.valor}`
        : 'Precio: a coordinar';
    } else {
      servicioLines = [
        'Servicios:',
        ...validos.map(s =>
          `- ${nombreCompleto(s)} - ${tienePrecio(s) ? `$${s.precio.valor}` : 'a coordinar'}`
        ),
      ];
      precioLine = validos.every(tienePrecio)
        ? `Precio total: $${validos.reduce((acc, s) => acc + Number(s.precio.valor), 0)}`
        : 'Precio total: a coordinar';
    }

    // Modalidad opcional: solo se imprime si el closer la mandó.
    const modalidadLine = modalidad
      ? `Modalidad: ${modalidad === 'domicilio' ? 'A domicilio' : 'En el local'}`
      : null;

    const zonaTxt     = zona     ? String(zona).slice(0, MAX_ZONA)         : null;
    const consultaTxt = consulta ? String(consulta).slice(0, MAX_CONSULTA) : null;

    const mensaje = [
      isDemo
        ? 'Hola! Esta es una consulta de PRUEBA generada desde el demostrador de IndiceIA 🧪'
        : 'Hola! Vengo de IndiceIA 👋',
      '',
      ...servicioLines,
      modalidadLine,
      zonaTxt ? `Zona: ${zonaTxt}` : null,
      consultaTxt ? `Consulta: ${consultaTxt}` : null,
      precioLine,
      '─────────────────',
      'Quedamos en contacto 🙏',
    ].filter(Boolean).join('\n');

    const waUrl = `https://wa.me/549${waNumber}?text=${encodeURIComponent(mensaje)}`;

    // ── log: await antes del redirect — en serverless una escritura
    // fire-and-forget puede no completarse si el proceso se congela
    // tras responder. Firestore rechaza `undefined`, por eso `|| null`. ──
    const slug = data.landing?.slug || null;
    if (slug) {
      try {
        const evento = sinServicio
          ? 'wa_service_click_sin_servicio'
          : (isDemo ? 'wa_service_click_demo' : 'wa_service_click');

        await db.collection('landing_events').add({
          destination: slug,
          event: evento,
          servicio: String(servicio).slice(0, 300),
          modalidad: modalidad || null,
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
