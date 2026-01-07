// src/pages/ia-config.js
// Onboarding Paso 5 – Configuración de IA (BASE ESTABLE)

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './ia-config.css';

import { auth, db } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';

import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

let currentUser = null;
let currentComercioId = null;
let comercioData = {};

const $ = (id) => document.getElementById(id);

// ==================== AUTH ====================
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  currentUser = user;
  await initializePage();
});

// ==================== INIT ====================
async function initializePage() {
  try {
    showLoading('Cargando configuración de IA...');
    renderLayout();

    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
    if (!userSnap.exists() || !userSnap.data().comercioId) {
      showToast('Error', 'Completá primero "Mi comercio".', 'warning');
      hideLoading();
      return;
    }

    currentComercioId = userSnap.data().comercioId;

    await loadComercioData();

    initNavigation();
    updateHeaderInfo(
      comercioData.nombreComercio || 'Mi comercio',
      PLANS[comercioData.plan || 'trial']
    );
    updateBanner();

    loadAIConfig();

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== DATA ====================
async function loadComercioData() {
  const snap = await getDoc(doc(db, 'comercios', currentComercioId));
  comercioData = snap.exists() ? snap.data() : {};
}

// ==================== BANNER ====================
function updateBanner() {
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];

  let html = 'Configurá tu asistente IA';
  if (estado === 'trial') {
    html = `<strong>Trial activo</strong> – ${getDiasRestantesTrial(comercioData)} días`;
  } else if (estado === 'activo') {
    html = `<strong>Plan ${plan.nombre} activo</strong>`;
  }

  updateSubscriptionBanner(html, estado);
}

// ==================== CONFIG ====================
function loadAIConfig() {
  const config = comercioData.aiConfig || {};

  setValue('aiName', config.aiName);
  setValue('aiLanguage', config.aiLanguage || 'es-AR');
  setValue('aiPersonality', config.aiPersonality);
  setValue('aiTone', config.aiTone);
  setValue('aiGreeting', config.aiGreeting);

  setValue('sinPrecio', config.sinPrecio);
  setValue('sinStock', config.sinStock);
  setValue('localCerrado', config.localCerrado);
  setValue('proactividad', config.proactividad);
  setValue('formatoRespuestas', config.formatoRespuestas);
}

function setValue(id, value) {
  const el = $(id);
  if (el && value !== undefined) el.value = value;
}
