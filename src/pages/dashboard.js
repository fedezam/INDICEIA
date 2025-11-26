// ========================================
// DASHBOARD – ESQUELETO 100% HORARIOS.JS
// ========================================

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './dashboard.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

// ==================== VARIABLES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    currentUser = user;

    try {
        await user.getIdToken();
    } catch {
        signOut(auth);
        window.location.href = "/login.html";
        return;
    }

    await initializePage();
    runFlowController(user.uid);
});

// ==================== INICIALIZACIÓN ====================
async function initializePage() {
    try {
        showLoading('Cargando dashboard...');
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

        initNavigation();
        updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan || 'trial']);
        updateBanner();

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        await renderDashboard();
        setupEvents();
        insertAIHelperCard();

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
    } else {
        comercioData = { plan: 'trial' };
    }
}

async function loadProductCount() {
    const ref = collection(db, 'comercios', currentComercioId, 'productos');
    const snap = await getDocs(ref);
    return snap.size;
}

async function loadHorarios() {
    const ref = doc(db, 'comercios', currentComercioId, 'config', 'horarios');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

// ==================== BANNER ====================
function updateBanner() {
    const estado = calcularEstadoPlan(comercioData);
    const plan = PLANS[comercioData.plan || 'trial'];
    let html = "";

    switch (estado) {
        case "trial":
            const dias = getDiasRestantesTrial(comercioData);
            html = `<strong>Trial activo</strong> – Te quedan <strong>${dias} días</strong>`;
            break;
        case "activo":
            html = `<strong>Plan ${plan.nombre} activo</strong> – Todo funcionando`;
            break;
        case "expirado":
            html = `Trial expirado – Elegí un plan para continuar`;
            break;
        default:
            html = `Bienvenido`;
    }

    updateSubscriptionBanner(html, estado);
}

// ==================== RENDER ====================
async function renderDashboard() {
    const cont = document.getElementById("dashboardContainer");
    if (!cont) return;

    const productCount = await loadProductCount();
    const horarios = await loadHorarios();

    cont.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
            <p>Resumen general y accesos rápidos</p>
        </div>

        <section class="dashboard-grid">

            <div class="dash-card">
                <h3>👤 Usuario</h3>
                <p>${currentUser.email}</p>
                <button onclick="window.location.href='usuario.html'" class="btn btn-secondary">Ver</button>
            </div>

            <div class="dash-card">
                <h3>🏪 Comercio</h3>
                <p>${comercioData.nombreComercio || "Sin nombre"}</p>
                <button onclick="window.location.href='mi-comercio.html'" class="btn btn-secondary">Ver</button>
            </div>

            <div class="dash-card">
                <h3>⏰ Horarios</h3>
                <p>${horarios ? "Cargados ✔" : "No configurados"}</p>
                <button onclick="window.location.href='horarios.html'" class="btn btn-secondary">Ver</button>
            </div>

            <div class="dash-card">
                <h3>📦 Productos</h3>
                <p>${productCount} productos</p>
                <button onclick="window.location.href='productos.html'" class="btn btn-secondary">Ver</button>
            </div>

            <div class="dash-card">
                <h3>🎨 Configuración IA</h3>
                <p>Personalización visual del bot</p>
                <button onclick="window.location.href='ia-config.html'" class="btn btn-secondary">Ver</button>
            </div>

        </section>
    `;
}

// ==================== EVENTOS ====================
function setupEvents() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("¿Cerrar sesión?")) signOut(auth);
        });
    }
}

// ==================== AI HELPER ====================
function insertAIHelperCard() {
    const container = document.getElementById("dashboardContainer");
    if (!container) return;

    const card = document.createElement("div");
    card.className = "ai-helper-card";
    card.innerHTML = `
        <div class="ai-helper-icon">AI</div>
        <div class="ai-helper-content">
            <h4>Tu asistente IA usa estos datos</h4>
            <p>La IA se sincroniza automáticamente cada vez que editás Usuario, Comercio, Horarios, Productos o Config IA.</p>
        </div>
    `;

    container.prepend(card);
}

// ==================== FLOW CONTROLLER ====================
window.validateCurrentPageData = async () => true;
