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
    showToast('Error', err.message || 'Error al cargar la página', 'error');
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
  try {
    // ← AHORA CARGA EL REGISTRY VISUAL CORRECTO
    const res = await fetch('/templates/registry.visual.json?t=' + Date.now()); // cache busting por si acaso

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`);
    }

    const json = await res.json();
    TEMPLATE_REGISTRY = json.templates || [];

    if (TEMPLATE_REGISTRY.length === 0) {
      console.warn('Registry visual vacío');
    }
  } catch (err) {
    console.error('Error cargando registry visual:', err);
    showToast('Error', 'No se pudieron cargar los templates disponibles.', 'error');
    TEMPLATE_REGISTRY = [];
  }
}

// ==================== RENDER ====================
function renderTemplates() {
  const container = document.getElementById('skinsContainer');
  if (!container) return;

  if (TEMPLATE_REGISTRY.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-500 text-lg">No hay templates disponibles en este momento.</p>
        <p class="text-gray-400 text-sm mt-2">Intentá recargar la página más tarde.</p>
      </div>`;
    return;
  }

  container.innerHTML = TEMPLATE_REGISTRY.map(template => {
    const isActive = selectedTemplateId === template.id;

    return `
      <div class="skin-card ${isActive ? 'active' : ''}" data-id="${template.id}">
        ${isActive ? `<div class="active-badge">✔ Activo</div>` : ''}

        <!-- Thumbnail -->
        ${template.previews?.thumbnail ? `
          <div class="skin-thumbnail">
            <img src="${template.previews.thumbnail}" alt="${template.name}" loading="lazy" />
          </div>
        ` : `
          <div class="skin-thumbnail placeholder">
            <div class="bg-gray-200 w-full h-full flex items-center justify-center">
              <span class="text-gray-400">Sin imagen</span>
            </div>
          </div>
        `}

        <div class="skin-content">
          <h3>${template.name || 'Template sin nombre'}</h3>
          <p class="skin-version">v${template.version} · ${template.tier}</p>

          <p class="skin-description">
            ${template.description || 'Sin descripción disponible.'}
          </p>

          ${template.ideal_for && template.ideal_for.length > 0 ? `
            <div class="skin-section">
              <strong>Ideal para:</strong>
              <div class="tags">
                ${template.ideal_for.map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Preview interactivo -->
          ${template.visual?.iframe_url ? `
            <div class="skin-preview">
              <iframe src="${template.visual.iframe_url}" loading="lazy" title="Preview de ${template.name}"></iframe>
            </div>
          ` : `
            <div class="skin-preview placeholder">
              <p class="text-gray-500 text-center py-8">Preview no disponible</p>
            </div>
          `}

          <div class="skin-actions">
            <button class="btn-primary select-btn">
              ${isActive ? '✓ Seleccionado' : 'Seleccionar template'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Eventos de click en toda la card
  document.querySelectorAll('.skin-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Evitar que el click en el botón dispare doble evento
      if (e.target.closest('.select-btn')) return;
      selectTemplate(card.dataset.id);
    });
  });

  // Botón explícito
  document.querySelectorAll('.select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.skin-card');
      selectTemplate(card.dataset.id);
    });
  });
}

// ==================== SELECT ====================
function selectTemplate(templateId) {
  // Quitar active de todas
  document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
  
  // Poner active en la seleccionada
  const card = document.querySelector(`.skin-card[data-id="${templateId}"]`);
  if (card) card.classList.add('active');

  selectedTemplateId = templateId;

  const t = TEMPLATE_REGISTRY.find(t => t.id === templateId);
  if (t) {
    showToast('Template seleccionado', `${t.name} listo para aplicar`, 'success');
  }
}

// ==================== SAVE ====================
async function saveTemplate() {
  if (!selectedTemplateId) {
    showToast('Error', 'Por favor, seleccioná un template primero.', 'error');
    return;
  }

  try {
    showLoading('Guardando template seleccionado...');

    await updateDoc(doc(db, 'comercios', currentComercioId), {
      templateId: selectedTemplateId,
      templateUpdatedAt: new Date().toISOString()
    });

    hideLoading();
    showToast('¡Listo!', 'Template guardado correctamente.', 'success');

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1500);
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo guardar el template.', 'error');
  }
}

// ==================== EVENTS ====================
function setupEvents() {
  const saveBtn = document.getElementById('saveSkinBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveTemplate);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("¿Querés cerrar sesión?")) {
        signOut(auth);
      }
    });
  }
}
