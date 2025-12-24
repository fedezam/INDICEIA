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

// ==================== INICIALIZACIÓN ====================
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
  } else {
    comercioData = { id: currentComercioId };
  }
}

// ==================== REGISTRY ====================
async function loadTemplateRegistry() {
  const res = await fetch('/api/entity-factory/templates/registry.json');
  const json = await res.json();
  TEMPLATE_REGISTRY = Object.values(json.templates || {});
}

// ==================== RENDER TEMPLATES ====================
function renderTemplates() {
  const container = document.getElementById('skinsContainer');
  if (!container) return;

  container.innerHTML = TEMPLATE_REGISTRY.map(template => {
    const isActive = selectedTemplateId === template.id;

    return `
      <div class="skin-card ${isActive ? 'active' : ''}" data-id="${template.id}">
        
        ${isActive ? '<div class="active-badge"><i class="fas fa-check-circle"></i> Activo</div>' : ''}

        <div class="skin-thumbnail">
          <iframe
            src="${template.previews?.iframe || ''}"
            class="template-preview-iframe"
            loading="lazy">
          </iframe>
          <div class="thumbnail-overlay">
            <div class="overlay-content">
              <i class="fas fa-eye"></i>
              <span>Click para seleccionar</span>
            </div>
          </div>
        </div>

        <div class="skin-content">
          <h3>${template.name}</h3>
          <p class="skin-version">v${template.version}</p>
          <p class="skin-description">Template visual disponible</p>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.skin-card').forEach(card => {
    const templateId = card.dataset.id;
    card.addEventListener('click', () => selectTemplate(templateId));
  });
}

// ==================== SELECCIONAR TEMPLATE ====================
function selectTemplate(templateId) {
  document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));

  const selectedCard = document.querySelector(`.skin-card[data-id="${templateId}"]`);
  if (selectedCard) selectedCard.classList.add('active');

  selectedTemplateId = templateId;

  const template = TEMPLATE_REGISTRY.find(t => t.id === templateId);
  showToast('Seleccionado', `${template.name} seleccionado. No olvides guardar.`, 'info');
}

// ==================== GUARDAR SELECCIÓN ====================
async function saveTemplate() {
  if (!selectedTemplateId) {
    showToast('Error', 'Debes seleccionar un template primero', 'error');
    return;
  }

  try {
    showLoading('Guardando template...');

    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      templateId: selectedTemplateId,
      templateUpdatedAt: new Date().toISOString()
    });

    hideLoading();

    const template = TEMPLATE_REGISTRY.find(t => t.id === selectedTemplateId);
    showToast('¡Listo!', `Template "${template.name}" guardado correctamente`, 'success');

    comercioData.templateId = selectedTemplateId;
    renderTemplates();

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1500);

  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== EVENTOS ====================
function setupEvents() {
  const saveBtn = document.getElementById('saveSkinBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveTemplate);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("¿Cerrar sesión?")) signOut(auth);
    });
  }
}
