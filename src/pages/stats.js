// /src/pages/stats.js

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';

let comercioId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // comercioId viene guardado localmente (ya lo usás en dashboard)
  comercioId = localStorage.getItem('currentComercioId');
  if (!comercioId) {
    console.error('No comercioId');
    return;
  }

  await loadStats();
});

async function loadStats() {
  const eventsRef = collection(db, 'stats', comercioId, 'events');

  const q = query(eventsRef);
  const snap = await getDocs(q);

  let visits = 0;
  let clicks = 0;
  let lastTs = null;
  const hours = Array(24).fill(0);

  snap.forEach(doc => {
    const e = doc.data();

    if (e.type === 'landing_view') visits++;
    if (e.type === 'talk_click') clicks++;

    if (typeof e.hour === 'number') {
      hours[e.hour]++;
    }

    if (!lastTs || e.ts?.toMillis() > lastTs.toMillis()) {
      lastTs = e.ts;
    }
  });

  renderStats({
    visits,
    clicks,
    conversion: visits > 0 ? Math.round((clicks / visits) * 100) : 0,
    lastActivity: lastTs,
    hours
  });
}

function renderStats(data) {
  document.getElementById('stat-visits').textContent = data.visits;
  document.getElementById('stat-clicks').textContent = data.clicks;
  document.getElementById('stat-conversion').textContent =
    `${data.conversion}%`;

  document.getElementById('stat-last').textContent =
    data.lastActivity
      ? new Date(data.lastActivity.toMillis()).toLocaleString()
      : '—';

  renderHourChart(data.hours);
}

function renderHourChart(hours) {
  const container = document.getElementById('hour-chart');
  container.innerHTML = '';

  const max = Math.max(...hours, 1);

  hours.forEach((count, hour) => {
    const bar = document.createElement('div');
    bar.className = 'hour-bar';
    bar.style.height = `${(count / max) * 100}%`;
    bar.title = `${hour}:00 — ${count}`;

    const label = document.createElement('span');
    label.textContent = hour;

    const col = document.createElement('div');
    col.className = 'hour-col';
    col.appendChild(bar);
    col.appendChild(label);

    container.appendChild(col);
  });
}
