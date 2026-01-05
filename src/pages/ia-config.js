// src/pages/ia-config.js
// Onboarding Paso 5 – Configuración de IA (final, estable)

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './ia-config.css';

import { auth, db } from '../firebase.js';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

import { bootFlow } from "../controllers/boot/flowBoot.js";
import { redirectAfterSave } from "../controllers/flowController.js";

bootFlow();

// ==================== GLOBAL ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];
let productosDestacados = [];
let hasUnsavedChanges = false;
let originalAIConfig = {};
let searchTimeout = null;

const $ = (id) => document.getElementById(id);

// ==================== HELPERS ====================
function safeSet(id, value, def = '') {
  const el = $(id);
  if (el) el.value = value ?? def;
}

function safeGet(id) {
  const el = $(id);
  return el ? el.value?.trim() || '' : '';
}

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
    await loadProducts();

    initNavigation();
    updateHeaderInfo(comercioData.nombreComercio || 'Mi comercio', PLANS[comercioData.plan || 'trial']);
    updateBanner();

    
    loadAIConfig();
    renderCanalesAlternativos();

    createSaveButton();
    setupEventListeners();
    insertAIHelperCard();
    checkFormValidity();

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

async function loadComercioData() {
  const snap = await getDoc(doc(db, 'comercios', currentComercioId));
  comercioData = snap.exists() ? { id: currentComercioId, ...snap.data() } : {};
}

async function loadProducts() {
  const snap = await getDocs(collection(db, 'comercios', currentComercioId, 'productos'));
  productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
function getAvailableChannelsFromUI() {
  const result = { whatsapp: true };
  const container = $('contactosValidacion');
  if (!container) return result;

  container.querySelectorAll('input[data-canal]').forEach(cb => {
    result[cb.dataset.canal] = cb.checked;
  });

  result.whatsapp = true;
  return result;
}

function getCurrentConfig() {
  return {
    aiName: safeGet('aiName'),
    aiLanguage: safeGet('aiLanguage'),
    aiPersonality: safeGet('aiPersonality'),
    aiTone: safeGet('aiTone'),
    aiGreeting: safeGet('aiGreeting'),
    sinPrecio: safeGet('sinPrecio'),
    sinStock: safeGet('sinStock'),
    localCerrado: safeGet('localCerrado'),
    proactividad: safeGet('proactividad'),
    formatoRespuestas: safeGet('formatoRespuestas'),
    mensajeWhatsapp: safeGet('mensajeWhatsapp'),
    mensajeInstagram: safeGet('mensajeInstagram'),
    mensajeWeb: safeGet('mensajeWeb'),
    mensajeDefault: safeGet('mensajeDefault'),
    productosDestacados,
    availableChannels: getAvailableChannelsFromUI()
  };
}

function loadAIConfig() {
  const config = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(config));

  [
    'aiName','aiPersonality','aiTone','aiGreeting',
    'sinPrecio','sinStock','localCerrado','proactividad',
    'formatoRespuestas','mensajeWhatsapp','mensajeInstagram',
    'mensajeWeb','mensajeDefault'
  ].forEach(id => safeSet(id, config[id]));

  safeSet('aiLanguage', config.aiLanguage || 'es-AR');
  productosDestacados = Array.isArray(config.productosDestacados) ? config.productosDestacados : [];
}

// ==================== CANALES ====================
function renderCanalesAlternativos() {
  const container = $('contactosValidacion');
  if (!container) return;

  const canales = [
    { key: 'whatsapp', label: 'WhatsApp', obligatorio: true },
    { key: 'email', label: 'Email', obligatorio: true },
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'tiktok', label: 'TikTok' }
  ];

  const available = comercioData.aiConfig?.availableChannels || {};

  let html = `
    <div class="canales-box">
      <p class="muted">
        WhatsApp es el canal principal.  
        Podés habilitar otros canales si querés que tus clientes te contacten también por ahí.
      </p>
      <div class="canales-list">
  `;

  canales.forEach(c => {
    const existe = !!comercioData[c.key]?.trim();
    if (!existe && !c.obligatorio) return;

    const checked = c.obligatorio ? true : !!available[c.key];
    const disabled = c.obligatorio ? 'disabled' : '';

    html += `
      <label class="canal-item ${disabled}">
        <input type="checkbox" data-canal="${c.key}" ${checked ? 'checked' : ''} ${disabled}>
        <span>${c.label}</span>
        ${c.obligatorio ? '<small>(principal)</small>' : ''}
      </label>
    `;
  });

  html += `
      </div>
      <small class="muted">
        ⚠️ Más canales = más puntos de atención para tu negocio.
      </small>
    </div>
  `;

  container.innerHTML = html;

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (!cb.disabled) cb.addEventListener('change', markAsChanged);
  });
}

// ==================== SAVE ====================
async function saveAIConfig() {
  showLoading('Guardando configuración...');
  const config = getCurrentConfig();

  try {
    await updateDoc(doc(db, 'comercios', currentComercioId), {
      aiConfig: config,
      'onboardingSteps.ia-config': true,
      fechaActualizacion: new Date()
    });

    hasUnsavedChanges = false;
    originalAIConfig = JSON.parse(JSON.stringify(config));
    hideLoading();
    showToast('Listo', 'IA configurada correctamente', 'success');

    setTimeout(() => redirectAfterSave(), 500);
  } catch (err) {
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== STATE ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  const btn = $('saveChangesBtn');
  if (!btn) return;

  const changed = JSON.stringify(getCurrentConfig()) !== JSON.stringify(originalAIConfig);
  btn.disabled = !changed;
}

// ==================== UI ====================
function createSaveButton() {
  if ($('saveChangesBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.disabled = true;
  btn.innerHTML = 'Guardar cambios';
  btn.onclick = saveAIConfig;
  document.querySelector('.header .user-info')?.prepend(btn);
}

function insertAIHelperCard() {
  if (document.querySelector('.ai-helper-card')) return;
  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <h4>Tu IA ya entiende cómo contactarte</h4>
    <p>Los canales que habilites acá serán los únicos que la IA podrá usar.</p>
  `;
  document.querySelector('main .container')?.prepend(card);
}

function setupEventListeners() {
  window.addEventListener('beforeunload', e => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
