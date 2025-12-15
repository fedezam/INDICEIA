/* ========================================
   LANDING IA COMERCIAL — ÍndiceIA
   Lógica pública, sin auth
   ======================================== */

// ================= CONFIG =================

const FIREBASE_CONFIG = window.firebaseConfig; // inyectado globalmente

const db = firebase.firestore();

// ================= HELPERS =================

function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ================= CONTEXT =================

const entityId = getQueryParam('entity');
const sessionId = uuidv4();
const startedAt = Date.now();

if (!entityId) {
  document.body.innerHTML = '<p style="padding:2rem;text-align:center">Entidad no válida</p>';
  throw new Error('Missing entityId');
}

// ================= TRACKING =================

async function trackEvent(type, extra = {}) {
  try {
    await db.collection('landing_events').add({
      entityId,
      sessionId,
      type,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || null,
      ...extra,
    });
  } catch (e) {
    console.warn('Tracking error', e);
  }
}

// ================= LOAD ENTITY =================

async function loadEntity() {
  try {
    const snap = await db.collection('entities').doc(entityId).get();

    if (!snap.exists) throw new Error('Entity not found');

    const data = snap.data();

    document.getElementById('commerceLogo').src = data.logoUrl || '';
    document.getElementById('commerceName').innerText = data.commerceName || 'Asistente Virtual';
    document.getElementById('commerceDescription').innerText =
      data.description || 'Un asistente virtual para ayudarte.';

    await trackEvent('view');

    document.getElementById('ctaButton').onclick = () => openAssistant(data);
  } catch (e) {
    document.body.innerHTML = '<p style="padding:2rem;text-align:center">Entidad no encontrada</p>';
  }
}

// ================= CTA =================

async function openAssistant(entityData) {
  await trackEvent('cta_click');

  const claudeBase = entityData.claudeUrl; // ya viene armado desde backend

  const url = `${claudeBase}&session=${sessionId}`;

  window.location.href = url;
}

// ================= INIT =================

loadEntity();
