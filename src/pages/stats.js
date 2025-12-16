// ========================================
// STATS – Landing Analytics (READ ONLY)
// ========================================

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import './stats.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

import { renderLayout, updateHeaderInfo } from '../shared/layout.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';

// ========================================
// STATE
// ========================================
let currentUser = null;
let comercioId = null;

// ========================================
// AUTH
// ========================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  currentUser = user;
  await init();
});

// ========================================
// INIT
// ========================================
async function init() {
  try {
    showLoading('Cargando estadísticas...');
    renderLayout();

    await resolveComercioId();
    await loadStats();

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ========================================
// RESOLVE COMERCIO
// ========================================
async function resolveComercioId() {
  const snap = await getDocs(
    query(
      collection(db, 'usuarios'),
      where('__name__', '==', currentUser.uid)
    )
  );

  if (snap.empty) {
    throw new Error('Usuario sin comercio asociado');
  }

  comercioId = snap.docs[0].data().comercioId;
}

// ========================================
// LOAD STATS
// ========================================
async function loadStats() {
  const eventsRef = collection(db, 'landing_events');

  const now = Timestamp.now();
  const last30Days = Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  const q = query(
    eventsRef,
    where('comercioId', '==', comercioId),
    where('timestamp', '>=', last30Days)
  );

  const snap = await getDocs(q);

  const stats = {
    total: 0,
    views: 0,
    clicks: 0,
    redirects: 0,
    byDay: {}
  };

  snap.forEach(doc => {
    const e = doc.data();
    stats.total++;

    if (e.type === 'view') stats.views++;
    if (e.type === 'click') stats.clicks++;
    if (e.type === 'redirect') stats.redirects++;

    const day = e.timestamp
      .toDate()
      .toISOString()
      .slice(0, 10);

    stats.byDay[day] = (stats.byDay[day] || 0) + 1;
  });

  renderStats(stats);
}

// ========================================
// RENDER
// ========================================
function renderStats(stats) {
  // KPIs
  document.getElementById('kpi-total').innerText = stats.total;
  document.getElementById('kpi-views').innerText = stats.views;
  document.getElementById('kpi-clicks').innerText = stats.clicks;
  document.getElementById('kpi-redirects').innerText = stats.redirects;

  // Tabla simple por día
  const tbody = document.getElementById('stats-table-body');
  tbody.innerHTML = '';

  Object.keys(stats.byDay)
    .sort()
    .reverse()
    .forEach(day => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${day}</td>
        <td>${stats.byDay[day]}</td>
      `;
      tbody.appendChild(tr);
    });
}
