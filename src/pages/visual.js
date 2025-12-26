// ========================================
// VISUAL BUILDER - Selector de Templates
// ========================================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import './visual.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo } from '../shared/layout.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

// ==================== VARIABLES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let selectedTemplateId = null;
let TEMPLATE_REGISTRY = [];

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  currentUser = user;
  await initializePage();
});

// ==================== INIT ====================
async function initializePage() {
  try {
    showLoading('Cargando Visual Builder...');
    renderLayout();

    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      hideLoading();
      showToast("Error", "No se encontró información del usuario.", "error");
      return;
    }

    currentComercioId = userSnap.data().comercioId;
    await loadComercioData();

    updateHeaderInfo(comercioData.nombreComercio || 'Mi Comercio', null);

    await loadTemplateRegistry();
    renderTemplates();
    setupEvents();

    hideLoading();

  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== DATA ====================
async function loadComercioData() {
  const ref = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
    selectedTemplateId = comercioData.templateId || null;
  }
}

// ==================== REGISTRY ====================
async function loadTemplateRegistry() {
  const res = await fetch('/api/entity-factory/templates/registry.json');
  const json = await res.json();

  // 👉 por ahora mostramos SOLO EL PRIMERO
  TEMPLATE_REGISTRY = Object.values(json.templates || {}).slice(0, 1);
}

// ==================== RENDER ====================
function renderTemplates() {
  const container = document.getElementById('skinsContainer');
  if (!container) return;

  container.innerHTML = TEMPLATE_REGISTRY.map(template => {
    const isActive = selectedTemplateId === template.id;

    return `
      <div class="skin-card ${isActive ? 'active' : ''}" data-id="${template.id}">

        ${isActive ? `<div class="active-badge">✔ Activo</div>` : ''}

        <div class="skin-content">
          <h3>${template.name}</h3>
          <p class="skin-version">v${template.version} · ${template.tier}</p>

          <p class="skin-description">
            ${template.description}
          </p>

          <div class="skin-section">
            <strong>Ideal para:</strong>
            <div class="tags">
              ${template.ideal_for.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          </div>

          <div class="skin-section">
            <strong>Incluye:</strong>
            <ul>
              ${Object.entries(template.supports || {})
                .filter(([, v]) => v === true)
                .map(([k]) => `<li>✔ ${k}</li>`)
                .join('')}
            </ul>
          </div>

          <div class="skin-section limitations">
            <strong>Limitaciones:</strong>
            <ul>
              ${template.limitations.map(l => `<li>✖ ${l}</li>`).join('')}
            </ul>
          </div>

          <div class="skin-actions">
            <a
              href="${template.previews.html}"
              target="_blank"
              class="btn-secondary"
            >
              Ver demo
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.skin-card').forEach(card => {
    card.addEventListener('click', () => {
      selectTemplate(card.dataset.id);
    });
  });
}

// ==================== SELECT ====================
function selectTemplate(templateId) {
  document.querySelectorAll('.skin-card')
    .forEach(c => c.classList.remove('active'));

  const card = document.querySelector(`.skin-card[data-id="${templateId}"]`);
  if (card) card.classList.add('active');

  selectedTemplateId = templateId;

  const t = TEMPLATE_REGISTRY.find(t => t.id === templateId);
  showToast('Seleccionado', `${t.name} seleccionado`, 'info');
}

// ==================== SAVE ====================
async function saveTemplate() {
  if (!selectedTemplateId) {
    showToast('Error', 'Seleccioná un template primero', 'error');
    return;
  }

  try {
    showLoading('Guardando template...');

    await updateDoc(doc(db, 'comercios', currentComercioId), {
      templateId: selectedTemplateId,
      templateUpdatedAt: new Date().toISOString()
    });

    hideLoading();
    showToast('Listo', 'Template guardado', 'success');

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1200);

  } catch (err) {
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== EVENTS ====================
function setupEvents() {
  const saveBtn = document.getElementById('saveSkinBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveTemplate);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("¿Cerrar sesión?")) signOut(auth);
    });
  }
}
