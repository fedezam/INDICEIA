import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

let comercioId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  comercioId = localStorage.getItem('currentComercioId');
  if (!comercioId) {
    console.warn('[STATS] comercioId no disponible');
    return;
  }

  loadStats();
});

async function loadStats() {
  const ref = collection(db, 'stats', comercioId, 'events');
  const snap = await getDocs(ref);

  const events = [];
  snap.forEach(doc => events.push(doc.data()));

  if (events.length === 0) {
    renderKPIs({ views: 0, clicks: 0 });
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
  // TIEMPO DE DECISIÓN
  // ==============================
  // Relacionamos por fingerprint
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
      tiempos.push((new Date(click) - new Date(view)) / 1000); // en segundos
    }
  }
  const tiempoPromedio = tiempos.length
    ? (tiempos.reduce((a,b)=>a+b,0)/tiempos.length).toFixed(1)
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
    if (!dispositivos[d]) dispositivos[d] = { views:0, clicks:0 };
    if (e.event === 'landing_view') dispositivos[d].views++;
    if (e.event === 'talk_click') dispositivos[d].clicks++;
  });

  // ==============================
  // REFERRERS / ORIGEN
  // ==============================
  const referrers = {};
  events.forEach(e => {
    const r = e.referrer || 'direct';
    if (!referrers[r]) referrers[r] = { views:0, clicks:0 };
    if (e.event === 'landing_view') referrers[r].views++;
    if (e.event === 'talk_click') referrers[r].clicks++;
  });

  // ==============================
  // HORARIOS / DÍAS
  // ==============================
  const horarios = {};
  events.forEach(e => {
    const dt = new Date(e.timestamp);
    const h = dt.getHours();
    if (!horarios[h]) horarios[h] = { views:0, clicks:0 };
    if (e.event === 'landing_view') horarios[h].views++;
    if (e.event === 'talk_click') horarios[h].clicks++;
  });

  // ==============================
  // RENDERIZADO
  // ==============================
  renderKPIs({
    views,
    clicks,
    ctr,
    abandonos,
    tiempoPromedio,
    decisionesRapidas: totalDecisiones ? ((decisionesRapidas/totalDecisiones)*100).toFixed(1) : 0,
    decisionesLentas: totalDecisiones ? ((decisionesLentas/totalDecisiones)*100).toFixed(1) : 0,
    dispositivos,
    referrers,
    horarios
  });
}

function renderKPIs(data) {
  // ==============================
  // ELEMENTOS BÁSICOS
  // ==============================
  const viewsEl = document.getElementById('kpiViews');
  const clicksEl = document.getElementById('kpiClicks');
  const ctrEl = document.getElementById('kpiCTR');
  const abandonosEl = document.getElementById('kpiAbandonos');

  if (viewsEl) viewsEl.textContent = data.views;
  if (clicksEl) clicksEl.textContent = data.clicks;
  if (ctrEl) ctrEl.textContent = data.ctr + '%';
  if (abandonosEl) abandonosEl.textContent = data.abandonos;

  // ==============================
  // DISPOSITIVOS
  // ==============================
  const devicesEl = document.getElementById('kpiDevices');
  if (devicesEl) {
    devicesEl.innerHTML = '';
    for (const d in data.dispositivos) {
      const stats = data.dispositivos[d];
      const ctr = stats.views ? ((stats.clicks/stats.views)*100).toFixed(1) : 0;
      const div = document.createElement('div');
      div.textContent = `${d}: ${stats.views}v / ${stats.clicks}c (${ctr}%)`;
      devicesEl.appendChild(div);
    }
  }

  // ==============================
  // REFERRERS
  // ==============================
  const refEl = document.getElementById('kpiReferrers');
  if (refEl) {
    refEl.innerHTML = '';
    for (const r in data.referrers) {
      const stats = data.referrers[r];
      const ctr = stats.views ? ((stats.clicks/stats.views)*100).toFixed(1) : 0;
      const div = document.createElement('div');
      div.textContent = `${r}: ${stats.views}v / ${stats.clicks}c (${ctr}%)`;
      refEl.appendChild(div);
    }
  }

  // ==============================
  // TIEMPOS DE DECISIÓN
  // ==============================
  const tiempoEl = document.getElementById('kpiTiempo');
  if (tiempoEl) {
    tiempoEl.innerHTML = `
      Promedio: ${data.tiempoPromedio ? data.tiempoPromedio+'s' : '—'} <br/>
      Rápidas (<5s): ${data.decisionesRapidas}% <br/>
      Lentas (>20s): ${data.decisionesLentas}%
    `;
  }

  // ==============================
  // HORARIOS
  // ==============================
  const horaEl = document.getElementById('kpiHorarios');
  if (horaEl) {
    horaEl.innerHTML = '';
    for (let h=0; h<24; h++) {
      const stats = data.horarios[h] || { views:0, clicks:0 };
      const ctr = stats.views ? ((stats.clicks/stats.views)*100).toFixed(1) : 0;
      const div = document.createElement('div');
      div.textContent = `${h}:00 → ${stats.views}v / ${stats.clicks}c (${ctr}%)`;
      horaEl.appendChild(div);
    }
  }
}
