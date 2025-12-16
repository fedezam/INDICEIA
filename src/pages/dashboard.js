// ========================================
// DASHBOARD – CENTRO DE CONTROL
// ========================================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './dashboard.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
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
    } catch (error) {
        console.error('Error obteniendo token:', error);
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

        // Paso 1: Cargar usuario
        const userRef = doc(db, 'usuarios', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            hideLoading();
            showToast("Error", "No se encontró información del usuario.", "error");
            console.error('Usuario no existe en Firestore');
            return;
        }

        const userData = userSnap.data();
        console.log('✅ Datos de usuario cargados:', userData);

        // Verificar que tenga comercioId
        if (!userData.comercioId) {
            hideLoading();
            showToast("Error", "Tu usuario no tiene un comercio asignado. Contacta a soporte.", "error");
            console.error('Usuario sin comercioId:', userData);
            return;
        }

        currentComercioId = userData.comercioId;
        console.log('📍 ComercioId obtenido:', currentComercioId);

        // Paso 2: Cargar comercio con manejo de errores
        await loadComercioData();

        // Paso 3: Actualizar UI con datos disponibles
        updateHeaderInfo(
            comercioData.nombreComercio || 'Mi Comercio', 
            PLANS[comercioData.plan || 'trial']
        );
        updateBanner();

        // Paso 4: Renderizar dashboard
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        await renderDashboard();
        setupEvents();

        hideLoading();
        console.log('✅ Dashboard cargado exitosamente');

    } catch (err) {
        console.error('❌ Error en initializePage:', err);
        hideLoading();
        
        // Intentar renderizar el dashboard de todas formas
        try {
            await renderDashboard();
            setupEvents();
            showToast('Advertencia', 'Algunos datos no se pudieron cargar. Verifica tus permisos.', 'warning');
        } catch (renderErr) {
            console.error('❌ Error al renderizar:', renderErr);
            showToast('Error', 'No se pudo cargar el dashboard: ' + err.message, 'error');
        }
    }
}

// ==================== DATA ====================
async function loadComercioData() {
    try {
        console.log('🔍 Intentando cargar comercio:', currentComercioId);
        
        const ref = doc(db, 'comercios', currentComercioId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            comercioData = { 
                id: currentComercioId, 
                ...snap.data() 
            };
            console.log('✅ Datos de comercio cargados:', comercioData);
        } else {
            console.warn('⚠️ Documento de comercio no existe, usando datos por defecto');
            comercioData = { 
                id: currentComercioId,
                plan: 'trial',
                nombreComercio: 'Mi Comercio',
                stats: {
                    productosCount: 0,
                    horariosConfigurados: false
                }
            };
        }
    } catch (error) {
        console.error('❌ Error cargando comercio:', error);
        console.error('❌ Código de error:', error.code);
        console.error('❌ Mensaje:', error.message);
        
        // Si el error es de permisos, mostrar mensaje específico
        if (error.code === 'permission-denied') {
            console.error('❌ PERMISOS DENEGADOS - Posibles causas:');
            console.error('1. El documento usuarios/' + currentUser.uid + ' no tiene el campo comercioId correcto');
            console.error('2. Las reglas de Firestore no permiten acceso');
            console.error('3. El usuario no está autenticado correctamente');
            
            showToast(
                'Error de permisos', 
                'No tienes permisos para acceder a este comercio. Verifica que tu usuario esté configurado correctamente.', 
                'error'
            );
        }
        
        // Usar datos por defecto para que el dashboard se renderice
        comercioData = { 
            id: currentComercioId,
            plan: 'trial',
            nombreComercio: 'Mi Comercio',
            stats: {
                productosCount: 0,
                horariosConfigurados: false
            }
        };
    }
}

async function loadHorarios() {
    try {
        const ref = doc(db, 'comercios', currentComercioId, 'config', 'horarios');
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error('Error cargando horarios:', error);
        return null;
    }
}

// ==================== BANNER ====================
function updateBanner() {
    try {
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
    } catch (error) {
        console.error('Error actualizando banner:', error);
        updateSubscriptionBanner('Bienvenido', 'trial');
    }
}

// ==================== RENDER ====================
async function renderDashboard() {
    const cont = document.getElementById("dashboardContainer");
    if (!cont) {
        console.error('❌ No se encontró #dashboardContainer');
        return;
    }

    const productCount = comercioData.stats?.productosCount ?? 0;
    const horarios = comercioData.stats?.horariosConfigurados === true;

    cont.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
            <p>Resumen general y accesos rápidos a todas las secciones</p>
        </div>

        <section class="dashboard-grid">

            <!-- EXISTENTES -->
            <div class="dash-card">
                <div class="dash-icon"><i class="fas fa-user"></i></div>
                <div class="dash-content">
                    <h3>Usuario</h3>
                    <p>${currentUser?.email || 'No disponible'}</p>
                </div>
                <a href="usuario.html?edit=true" class="btn btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </a>
            </div>

            <div class="dash-card">
                <div class="dash-icon"><i class="fas fa-store"></i></div>
                <div class="dash-content">
                    <h3>Mi Comercio</h3>
                    <p>${comercioData.nombreComercio || "Sin nombre"}</p>
                </div>
                <a href="mi-comercio.html?edit=true" class="btn btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </a>
            </div>

            <div class="dash-card">
                <div class="dash-icon"><i class="fas fa-clock"></i></div>
                <div class="dash-content">
                    <h3>Horarios</h3>
                    <p>${horarios ? "Configurados ✓" : "No configurados"}</p>
                </div>
                <a href="horarios.html?edit=true" class="btn btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </a>
            </div>

            <div class="dash-card">
                <div class="dash-icon"><i class="fas fa-box"></i></div>
                <div class="dash-content">
                    <h3>Productos</h3>
                    <p>${productCount} producto${productCount !== 1 ? 's' : ''}</p>
                </div>
                <a href="productos.html?edit=true" class="btn btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </a>
            </div>

            <div class="dash-card">
                <div class="dash-icon"><i class="fas fa-robot"></i></div>
                <div class="dash-content">
                    <h3>Configuración IA</h3>
                    <p>Estado mental y capacidades</p>
                </div>
                <a href="ia-config.html?edit=true" class="btn btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </a>
            </div>

            <!-- NUEVAS CARDS -->
            <div class="dash-card highlight">
                <div class="dash-icon"><i class="fas fa-chart-bar"></i></div>
                <div class="dash-content">
                    <h3>Estadísticas</h3>
                    <p>Visitas y conversiones de tu landing</p>
                </div>
                <a href="stats.html" class="btn btn-primary btn-sm">
                    <i class="fas fa-arrow-right"></i> Ver
                </a>
            </div>

            <div class="dash-card highlight">
                <div class="dash-icon"><i class="fas fa-cogs"></i></div>
                <div class="dash-content">
                    <h3>Generar Entidad</h3>
                    <p>Ejecuta Entity Factory para tu comercio</p>
                </div>
                <a href="/api/entity-factory" target="_blank" class="btn btn-primary btn-sm">
                    <i class="fas fa-arrow-right"></i> Ejecutar
                </a>
            </div>

            <div class="dash-card highlight">
                <div class="dash-icon"><i class="fas fa-link"></i></div>
                <div class="dash-content">
                    <h3>Generar Link de la Entidad</h3>
                    <p>Obtén URL o QR para compartir</p>
                </div>
                <a href="/api/link-builder?action=generate&comercio_id=${currentComercioId || ''}" target="_blank" class="btn btn-primary btn-sm">
                    <i class="fas fa-arrow-right"></i> Generar
                </a>
            </div>

            <!-- VISUAL BUILDER OPCIONAL -->
            <div class="dash-card highlight">
                <div class="dash-icon"><i class="fas fa-palette"></i></div>
                <div class="dash-content">
                    <h3>Visual Builder <span class="badge-optional">Opcional</span></h3>
                    <p>Personaliza la apariencia de tu IA</p>
                </div>
                <a href="visual.html" class="btn btn-primary btn-sm">
                    <i class="fas fa-arrow-right"></i> Acceder
                </a>
            </div>

        </section>
    `;
    
    console.log('✅ Dashboard renderizado');
}

// ==================== EVENTOS ====================
function setupEvents() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("¿Cerrar sesión?")) {
                signOut(auth).catch(err => console.error('Error al cerrar sesión:', err));
            }
        });
    }
}

// ==================== FLOW CONTROLLER ====================
window.validateCurrentPageData = async () => true;
