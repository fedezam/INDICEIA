// api/contact-redirect/[id].js
//
// ── ROL ──────────────────────────────────────────────────────
// Mismo patrón que wa-redirect: el LLM (mind) nunca arma texto
// libre ni hace encoding — solo concatena params ASCII simples
// (item id, o motivo/cobertura/lugar) en la URL. Este endpoint
// resuelve contra Firestore (fuente real, no el blob público),
// arma el mensaje canónico y hace el encoding real antes del
// 302 redirect a wa.me.
//
// Sirve a DOS closers distintos del mind, diferenciados por qué
// param llega:
//   - `item`   → LEAD_CLOSE (comercio con modeloCierre=showroom_lead:
//                autos, maquinaria — interés puntual en 1 producto,
//                sin qty/carrito, precio "consultado" nunca cerrado)
//   - `motivo` → CONTACT_CLOSE (profesional: consulta con motivo +
//                cobertura/lugar opcionales)
// No son dos entityTypes distintos ni dos endpoints — es el mismo
// "conectar con una persona" con dos formas de calificar el lead.
// Ver mind.builder.js (compileLeadClose / compileContactClose).
//
// REGLA DURA: si el item viene de LEAD_CLOSE, el mensaje NUNCA
// arma un total ni presenta el precio como cerrado — el mind trae
// la restricción ¬prometer_precio_final_cerrado y este endpoint
// tiene que sostenerla en el texto real que ve el comercio del
// otro lado, no solo en el prompt.
// ────────────────────────────────────────────────────────────

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
  const { item, motivo, cobertura, lugar } = req.query;

  if (!comercioId) {
    return res.status(400).send('Falta comercioId');
  }

  if (!item && !motivo) {
    return res.status(400).send('Falta item o motivo');
  }

  try {
    const comercioRef  = db.collection('entidades').doc(comercioId);
    const comercioSnap = await comercioRef.get();
    if (!comercioSnap.exists) return res.status(404).send('Comercio no encontrado');

    const data = comercioSnap.data();
    const waNumber = resolveWaNumber(data.whatsapp);
    if (!waNumber) return res.status(409).send('Comercio sin WhatsApp configurado');

    const nombreEntidad = data.nombre || data.nombreComercio || 'el comercio';

    const { mensaje, eventName, logExtra } = item
      ? await buildLeadMessage(comercioRef, item, nombreEntidad)
      : buildContactMessage({ motivo, cobertura, lugar }, nombreEntidad);

    if (!mensaje) {
      // Solo la rama `item` puede devolver null (producto inexistente/pausado)
      return res.status(422).send('Item no disponible');
    }

    const waUrl = `https://wa.me/549${waNumber}?text=${encodeURIComponent(mensaje)}`;

    // ── log: mismo criterio que wa-redirect — landing_events con
    // destination=slug (lo único que lee stats.js), con await antes
    // del redirect (serverless puede congelar el proceso apenas
    // responde, dejando fire-and-forget sin completar) ──
    const slug = data.landing?.slug || null;
    if (slug) {
      try {
        await db.collection('landing_events').add({
          destination: slug,
          event: eventName,
          ...logExtra,
          timestamp: new Date(),
        });
      } catch (e) {
        console.error('[CONTACT-REDIRECT] log falló:', e);
        // no bloquea el redirect — el usuario no debe notar el fallo de logging
      }
    }

    return res.redirect(302, waUrl);
  } catch (err) {
    console.error('[CONTACT-REDIRECT]', err);
    return res.status(500).send('Error interno');
  }
}

// ────────────────────────────────────────────────────────────
// LEAD_CLOSE — item puntual, showroom_lead
// ────────────────────────────────────────────────────────────

async function buildLeadMessage(comercioRef, itemId, nombreEntidad) {
  const productoSnap = await comercioRef.collection('productos').doc(itemId).get();
  if (!productoSnap.exists || productoSnap.data()?.paused) {
    return { mensaje: null, eventName: null, logExtra: null };
  }

  const p = productoSnap.data();

  // Precio SIEMPRE etiquetado como "consultado" — nunca "Total" ni
  // aritmética. La negociación real pasa en persona con el vendedor.
  const mensaje = [
    `Hola! Vengo de IndiceIA, quiero consultar por esto de ${nombreEntidad} 🙋`,
    '',
    `Producto de interés: ${p.nombre}${p.codigo ? ` (cód. ${p.codigo})` : ''}`,
    p.precio_final ? `Precio consultado: $${p.precio_final} (a confirmar)` : null,
    '',
    'Me gustaría coordinar para verlo/probarlo en persona. ¿Cuándo puedo pasar?',
  ].filter(Boolean).join('\n');

  return {
    mensaje,
    eventName: 'lead_contact_click',
    logExtra: { item: itemId },
  };
}

// ────────────────────────────────────────────────────────────
// CONTACT_CLOSE — profesional (motivo + cobertura/lugar opcionales)
// ────────────────────────────────────────────────────────────

function buildContactMessage({ motivo, cobertura, lugar }, nombreEntidad) {
  const partes = [
    `Hola! Vengo de IndiceIA, quisiera hacer una consulta a ${nombreEntidad} 🙋`,
    '',
    `Motivo: ${motivo}`,
  ];

  if (cobertura) partes.push(`Cobertura: ${cobertura}`);
  if (lugar) partes.push(`Lugar preferido: ${lugar}`);

  partes.push('', 'Quedo atento/a, gracias!');

  return {
    mensaje: partes.join('\n'),
    eventName: 'contact_click',
    logExtra: {
      motivo,
      cobertura: cobertura || null,
      lugar: lugar || null,
    },
  };
}

// ────────────────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────────────────

function resolveWaNumber(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/[\s\-\(\)\+]/g, '');
  if (n.startsWith('549')) n = n.slice(3);
  else if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9') && n.length >= 10) n = n.slice(1);
  return n || null;
}
