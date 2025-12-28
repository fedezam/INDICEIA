// src/pages/landing.js

import { db } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';

const comercioId = resolveComercioId();

if (!comercioId) {
  renderError('Comercio no válido');
} else {
  initLanding(comercioId);
}

// ==============================
// INIT
// ==============================
async function initLanding(comercioId) {
  logEvent(comercioId, 'landing_view');

  await hydrateLanding(comercioId);
  bindActions(comercioId);
}

// ==============================
// DATA
// ==============================
async function hydrateLanding(comercioId) {
  try {
    const ref = doc(db, 'comercios', comercioId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();

    setText('comercioNombre', data.nombreComercio);
    setText('comercioDescripcion', data.descripcion || '');
  } catch (err) {
    console.warn('[LANDING] No se pudo hidratar comercio');
  }
}

// ==============================
// EVENTS
// ==============================
function bindActions(comercioId) {
  const btn = document.getElementById('btnTalkIA');

  if (!btn) return;

  btn.addEventListener('click', () => {
    logEvent(comercioId, 'talk_click');

    // Punto único de salida
    window.location.href = `/api/bot/${comercioId}`;
  });
}

// ==============================
// LOGGING
// ==============================
function logEvent(comercioId, type) {
  fetch('/api/link-builder?action=log_interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comercio_id: comercioId,
      type,
      ts: Date.now(),
      user_agent: navigator.userAgent
    })
  }).catch(() => {});
}

// ==============================
// HELPERS
// ==============================
function resolveComercioId() {
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('bot');
  return idx !== -1 ? parts[idx + 1] : null;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

function renderError(msg) {
  document.body.innerHTML = `
    <main style="padding:40px;text-align:center">
      <h2>${msg}</h2>
    </main>
  `;
}
