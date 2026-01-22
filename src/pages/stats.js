import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

let comercioId = null;

// ==============================
// UTILS
// ==============================
function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate(); // Firestore Timestamp
  return new Date(ts);               // string o Date
}

// ==============================
// AUTH
// ==============================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  comercioId = localStorage.getItem('currentComercioId');
  if (!comercioId) {
    console.warn('[STATS] comercioId no disponible');
    return;
  }

  loadStats();
});

// ==============================
// LOAD STATS
// ==============================
async function loadStats() {
  // ✅ RUTA CORRECTA
  const ref = collection(db, 'comercios', comercioId, 'stats');
  const snap = await getDocs(ref);

  const events = [];
  snap.forEach(doc => events.push(doc.data()));

  if (events.length === 0) {
    renderKPIs({
      views: 0,
      clicks: 0,
      ctr: 0,
      abandonos: 0,
      tiempoPromedio: null,
      decisionesRapidas: 0,
      decisionesLentas: 0,
      dispositivos: {},
      referrers: {},
      horarios: {}
    });
    return;
  }

  // ==============================
  // METRICAS BÁSICAS
  // ==============================
  const views = events.filter(e => e.event === 'landing_view').length;
  const clicks = events.filter(e => e.event === 'talk_click').length;
  const ctr = views ? ((clicks / views) * 100).toFixed(1) : 0;
  const abandonos = views - clicks;

  // ==============================
  // TIEMPO DE DECISIÓN (si hay fingerprint)
  // ==============================
  const fingerprints = {};
  events.forEach(e => {
    if (!e.fingerprint) return;
    if (!fingerprints[e.fingerprint]) fingerprints[e.fingerprint] = {};
    if (e.event === 'landing_view') fingerprints[e.fingerprint].view = e.timestamp;
    if (e.event === 'talk_click') fingerprints[e.fingerprint].click = e.timestamp;
  });

  const tiempos = [];
  for (const fp in fingerprints) {
    const { view, click } = fingerprints[fp];
    if (view && click) {
      tiempos.push((toDate(click) - toDate(view)) / 1000);
    }
  }

  const tiempoPromedio = tiempos.length
    ? (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(1)
    : null;

  const decisionesRapidas = tiempos.filter(t => t < 5).length;
  const decisionesLentas = tiempos.filter(t => t > 20).length;
  const totalDecisiones = tiempos.length;

  // ==============================
  // DISPOSITIVOS
  // ==============================
  const dispositivos = {};
  events.forEach(e => {
    const d = e.device || 'unknown';
    if (!dispositivos[d]) dispositivos[d] = { views: 0, clicks: 0 };
    if (e.event === 'landing_view') dispositivos[d].views++;
    if (e.event === 'talk_click') dispositivos[d].clicks++;
  });

  // ==============================
  // REFERRERS
  // ==============================
  const referrers = {};
  events.forEach(e => {
    const r = e.referrer || 'direct';
    if (!referrers[r]) referrers[r] = { views: 0, clicks: 0 };
    if (e.event === 'landing_view') referrers[r].views++;
    if (e.event === 'talk_click') referrers[r].clicks++;
  });

  // ==============================
  // HORARIOS
  // ==============================
  const horarios = {};
  events.forEach(e => {
    const dt = toDate(e.timestamp);
    if (!dt) return;
    const h = dt.getHours();
    if (!horarios[h]) horarios[h] = { views: 0, clicks: 0 };
    if (e.event === 'landing_view') horarios[h].views++;
    if (e.event === 'talk_click') horarios[h].clicks++;
  });

  // ==============================
  // RENDER
  // ==============================
  renderKPIs({
    views,
    clicks,
    ctr,
    abandonos,
    tiempoPromedio,
    decisionesRapidas: totalDecisiones
      ? ((decisionesRapidas / totalDecisiones) * 100).toFixed(1)
      : 0,
    decisionesLentas: totalDecisiones
      ? ((decisionesLentas / totalDecisiones) * 100).toFixed(1)
      : 0,
    dispositivos,
    referrers,
    horarios
  });
}

// ==============================
// RENDER
// ==============================
function renderKPIs(data) {
  const viewsEl = document.getElementById('kpiViews');
  const clicksEl = document.getElementById('kpiClicks');
  const ctrEl = document.getElementById('kpiCTR');
  const abandonosEl = document.getElementById('kpiAbandonos');

  if (viewsEl) viewsEl.textContent = data.views;
  if (clicksEl) clicksEl.textContent = data.clicks;
  if (ctrEl) ctrEl.textContent = data.ctr + '%';
  if (abandonosEl) abandonosEl.textContent = data.abandonos;

  // DISPOSITIVOS
  const devicesEl = document.getElementById('kpiDevices');
  if (devicesEl) {
    devicesEl.innerHTML = '';
    for (const d in data.dispositivos) {
      const s = data.dispositivos[d];
      const ctr = s.views ? ((s.clicks / s.views) * 100).toFixed(1) : 0;
      const div = document.createElement('div');
      div.textContent = `${d}: ${s.views}v / ${s.clicks}c (${ctr}%)`;
      devicesEl.appendChild(div);
    }
  }

  // REFERRERS
  const refEl = document.getElementById('kpiReferrers');
  if (refEl) {
    refEl.innerHTML = '';
    for (const r in data.referrers) {
      const s = data.referrers[r];
      const ctr = s.views ? ((s.clicks / s.views) * 100).toFixed(1) : 0;
      const div = document.createElement('div');
      div.textContent = `${r}: ${s.views}v / ${s.clicks}c (${ctr}%)`;
      refEl.appendChild(div);
    }
  }

  // TIEMPO
  const tiempoEl = document.getElementById('kpiTiempo');
  if (tiempoEl) {
    tiempoEl.innerHTML = `
      Promedio: ${data.tiempoPromedio ? data.tiempoPromedio + 's' : '—'}<br/>
      Rápidas (&lt;5s): ${data.decisionesRapidas}%<br/>
      Lentas (&gt;20s): ${data.decisionesLentas}%
    `;
  }

  // HORARIOS
  const horaEl = document.getElementById('kpiHorarios');
  if (horaEl) {
    horaEl.innerHTML = '';
    for (let h = 0; h < 24; h++) {
      const s = data.horarios[h] || { views: 0, clicks: 0 };
      const ctr = s.views ? ((s.clicks / s.views) * 100).toFixed(1) : 0;
      const div = document.createElement('div');
      div.textContent = `${h}:00 → ${s.views}v / ${s.clicks}c (${ctr}%)`;
      horaEl.appendChild(div);
    }
  }
}
