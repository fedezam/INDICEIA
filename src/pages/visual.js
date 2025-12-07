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

// ==================== TEMPLATES HARDCODEADOS ====================
const TEMPLATES = [
  {
    id: 'C1_Napolitana',
    name: 'Menú Simple - Napolitana Style',
    version: '1.0.0',
    status: 'stable',
    thumbnail: 'https://via.placeholder.com/400x300/1e293b/f59e0b?text=C1+Napolitana',
    description: '1 imagen por producto. Ideal para menús simples y claros.',
    recommended_for: ['Restaurantes', 'Pizzerías', 'Cafeterías', 'Bares'],
    features: [
      'Categorías dinámicas',
      'Carrito funcional',
      'WhatsApp checkout',
      'Múltiples tamaños'
    ],
    use_cases: [
      'pizzería',
      'restaurante',
      'cafetería',
      'bar',
      'panadería',
      'heladería'
    ]
  },
  {
    id: 'C2_CatalogoVisual',
    name: 'Catálogo Visual - Multi Imagen',
    version: '1.0.0',
    status: 'stable',
    thumbnail: 'https://via.placeholder.com/400x300/0f172a/3b82f6?text=C2+Catalogo',
    description: 'Múltiples imágenes por producto. Perfecto para productos que necesitan mostrar detalles.',
    recommended_for: ['Automotrices', 'Inmobiliarias', 'Mueblerías', 'Electrónica'],
    features: [
      'Galería de imágenes',
      'Modal de detalle',
      'Sistema de favoritos',
      'Compartir productos'
    ],
    use_cases: [
      'automotriz',
      'inmobiliaria',
      'mueblería',
      'electrónica',
      'joyería'
    ]
  },
  {
    id: 'C3_Marketplace',
    name: 'Marketplace Multi-vendedor',
    version: 'Coming Soon',
    status: 'coming_soon',
    eta: '2025-Q1',
    thumbnail: 'https://via.placeholder.com/400x300/374151/9ca3af?text=Proximamente',
    description: 'Múltiples vendedores en una sola plataforma.',
    recommended_for: ['Marketplaces', 'Centros comerciales'],
    features: ['Multi-vendedor', 'Gestión de comisiones', 'Panel admin'],
    locked: true
  },
  {
    id: 'C5_Minimal',
    name: 'Lista Minimalista',
    version: 'Coming Soon',
    status: 'coming_soon',
    eta: '2025-Q1',
    thumbnail: 'https://via.placeholder.com/400x300/374151/9ca3af?text=Proximamente',
    description: 'Diseño ultra simple sin imágenes. Solo texto y precios.',
    recommended_for: ['Servicios', 'Listas simples'],
    features: ['Ultra rápido', 'Sin imágenes', 'Minimalista'],
    locked: true
  }
];

// ==================== VARIABLES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let selectedTemplateId = null;

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

// ==================== RENDER TEMPLATES ====================
function renderTemplates() {
    const container = document.getElementById('skinsContainer');
    if (!container) return;

    // Detectar recomendación automática
    const tipoNegocio = (comercioData.tipoNegocio || '').toLowerCase();
    const recommendedTemplate = getRecommendedTemplate(tipoNegocio);

    container.innerHTML = TEMPLATES.map(template => {
        const isActive = selectedTemplateId === template.id;
        const isRecommended = recommendedTemplate === template.id;
        const isLocked = template.locked || false;

        return `
            <div class="skin-card ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}" 
                 data-id="${template.id}"
                 ${isLocked ? 'style="cursor: not-allowed; opacity: 0.6;"' : ''}>
                
                ${isLocked ? '<div class="lock-badge"><i class="fas fa-lock"></i> Próximamente</div>' : ''}
                ${isRecommended && !isActive ? '<div class="recommended-badge"><i class="fas fa-star"></i> Recomendado</div>' : ''}
                ${isActive ? '<div class="active-badge"><i class="fas fa-check-circle"></i> Activo</div>' : ''}
                
                <div class="skin-thumbnail">
                    <img src="${template.thumbnail}" alt="${template.name}">
                </div>
                
                <div class="skin-content">
                    <h3>${template.name}</h3>
                    <p class="skin-version">v${template.version}</p>
                    <p class="skin-description">${template.description}</p>
                    
                    <div class="skin-features">
                        <strong>Features:</strong>
                        <ul>
                            ${template.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="skin-recommended">
                        <strong>Ideal para:</strong>
                        <div class="tags">
                            ${template.recommended_for.map(r => `<span class="tag">${r}</span>`).join('')}
                        </div>
                    </div>

                    ${template.eta ? `<p class="skin-eta"><i class="fas fa-clock"></i> Disponible: ${template.eta}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Agregar event listeners
    document.querySelectorAll('.skin-card').forEach(card => {
        const templateId = card.dataset.id;
        const template = TEMPLATES.find(t => t.id === templateId);
        
        if (!template.locked) {
            card.addEventListener('click', () => selectTemplate(templateId));
        }
    });
}

// ==================== LÓGICA DE RECOMENDACIÓN ====================
function getRecommendedTemplate(tipoNegocio) {
    // Buscar en los use_cases de cada template
    for (const template of TEMPLATES) {
        if (template.use_cases && template.use_cases.includes(tipoNegocio)) {
            return template.id;
        }
    }
    
    // Default fallback
    return 'C1_Napolitana';
}

// ==================== SELECCIONAR TEMPLATE ====================
function selectTemplate(templateId) {
    // Remover active de todos
    document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
    
    // Agregar active al seleccionado
    const selectedCard = document.querySelector(`.skin-card[data-id="${templateId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }
    
    selectedTemplateId = templateId;
    
    // Mostrar feedback visual
    const template = TEMPLATES.find(t => t.id === templateId);
    showToast('Seleccionado', `${template.name} seleccionado. No olvides guardar.`, 'info');
}

// ==================== GUARDAR SELECCIÓN ====================
async function saveTemplate() {
    if (!selectedTemplateId) {
        showToast('Error', 'Debes seleccionar un template primero', 'error');
        return;
    }

    if (!currentComercioId) {
        showToast('Error', 'No se encontró el comercio', 'error');
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
        
        const template = TEMPLATES.find(t => t.id === selectedTemplateId);
        showToast('¡Listo!', `Template "${template.name}" guardado correctamente`, 'success');
        
        // Actualizar local
        comercioData.templateId = selectedTemplateId;
        
        // Re-render para actualizar badges
        renderTemplates();
        
        // Redirigir al dashboard después de 1.5s
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1500);
        
    } catch (err) {
        console.error(err);
        hideLoading();
        showToast('Error', 'No se pudo guardar el template: ' + err.message, 'error');
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
