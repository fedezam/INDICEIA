import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

let comercioId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // ✅ OBTENER comercioId DESDE FIRESTORE
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
    if (!userDoc.exists()) {
      console.warn('[STATS] Usuario no encontrado en Firestore');
      return;
    }
    
    comercioId = userDoc.data().comercioId;
    
    if (!comercioId) {
      console.warn('[STATS] comercioId no disponible en el usuario');
      return;
    }

    loadStats();
  } catch (error) {
    console.error('[STATS] Error obteniendo comercioId:', error);
  }
});

async function loadStats() {
  const ref = collection(db, 'comercios', comercioId, 'stats');
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
  const fingerprints = {};
  events.forEach(e => {
    if (!e.fingerprint) return;
    if (!fingerprints[e.fingerprint]) fingerprints[e.fingerprint] = {};
    
    // ✅ Convertir Firestore Timestamp a Date
    const timestamp = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
    
    if (e.event === 'landing_view') fingerprints[e.fingerprint].view = timestamp;
    if (e.event === 'talk_click') fingerprints[e.fingerprint].click = timestamp;
  });

  const tiempos = [];
  for (const fp in fingerprints) {
    const { view, click } = fingerprints[fp];
    if (view && click) {
      tiempos.push((click - view) / 1000); // Ya son objetos Date
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
    // ✅ Convertir Firestore Timestamp a Date
    const dt = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
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
  const viewsEl = document.getElementById('kpiViews');
  const clicksEl = document.getElementById('kpiClicks');
  const ctrEl = document.getElementById('kpiCTR');
  const abandonosEl = document.getElementById('kpiAbandonos');

  if (viewsEl) viewsEl.textContent = data.views;
  if (clicksEl) clicksEl.textContent = data.clicks;
  if (ctrEl) ctrEl.textContent = data.ctr + '%';
  if (abandonosEl) abandonosEl.textContent = data.abandonos;

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

  const tiempoEl = document.getElementById('kpiTiempo');
  if (tiempoEl) {
    tiempoEl.innerHTML = `
      Promedio: ${data.tiempoPromedio ? data.tiempoPromedio+'s' : '—'} <br/>
      Rápidas (<5s): ${data.decisionesRapidas}% <br/>
      Lentas (>20s): ${data.decisionesLentas}%
    `;
  }

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
