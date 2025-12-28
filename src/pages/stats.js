import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

let comercioId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  comercioId = localStorage.getItem('currentComercioId');
  if (!comercioId) {
    console.error('[STATS] comercioId no encontrado');
    return;
  }

  await loadStats();
});

async function loadStats() {
  const ref = collection(db, 'stats', comercioId, 'events');
  const snap = await getDocs(ref);

  let views = 0;
  let clicks = 0;

  snap.forEach(doc => {
    const e = doc.data();
    if (e.type === 'landing_view') views++;
    if (e.type === 'talk_click') clicks++;
  });

  renderKPIs({ views, clicks });
}

function renderKPIs({ views, clicks }) {
  const viewsEl = document.getElementById('kpiViews');
  const clicksEl = document.getElementById('kpiClicks');

  if (viewsEl) viewsEl.textContent = views;
  if (clicksEl) clicksEl.textContent = clicks;

  // KPIs futuros — dejamos claro que no están activos aún
  const qrEl = document.getElementById('kpiQr');
  const devicesEl = document.getElementById('kpiDevices');

  if (qrEl) qrEl.textContent = '—';
  if (devicesEl) devicesEl.textContent = '—';
}
