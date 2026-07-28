// api/contact-redirect/[id].js
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
  const { motivo, cobertura, lugar } = req.query;

  if (!comercioId || !motivo) {
    return res.status(400).send('Faltan parámetros');
  }

  try {
    const comercioRef  = db.collection('entidades').doc(comercioId);
    const comercioSnap = await comercioRef.get();
    if (!comercioSnap.exists) return res.status(404).send('Comercio no encontrado');

    // ── professional vive directo en el documento, no en subcolección ──
    const data = comercioSnap.data();
    const waNumber = resolveWaNumber(data.whatsapp);
    if (!waNumber) return res.status(409).send('Sin WhatsApp configurado');

    const nombre = data.nombre || 'el profesional';

    // ── validar lugar contra data.lugares si fue provisto ──
    let lugarValido = null;
    if (lugar && Array.isArray(data.lugares)) {
      const match = data.lugares.find(
        l => l.activo !== false && l.nombre === lugar
      );
      if (match) lugarValido = match.nombre;
    }

    // ── validar cobertura contra data.cobertura.mutuales si fue provista ──
    let coberturaValida = null;
    if (cobertura && data.cobertura?.mutuales?.includes(cobertura)) {
      coberturaValida = cobertura;
    } else if (cobertura === 'particular' && data.cobertura?.particular) {
      coberturaValida = 'Particular';
    }

    const mensaje = [
      'Hola! Vengo de IndiceIA 👋',
      '',
      `Motivo: ${motivo}`,
      coberturaValida ? `Obra social: ${coberturaValida}` : null,
      lugarValido ? `Lugar preferido: ${lugarValido}` : null,
      '─────────────────',
      'Quedo a la espera para coordinar turno 🙏',
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
          event: 'wa_contact_click',
          cobertura: coberturaValida,
          lugar: lugarValido,
          timestamp: new Date(),
        });
      } catch (e) {
        console.error('[CONTACT-REDIRECT] log falló:', e);
      }
    }

    return res.redirect(302, waUrl);
  } catch (err) {
    console.error('[CONTACT-REDIRECT]', err);
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
