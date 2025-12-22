// ========================================
// DASHBOARD – VERSIÓN SIMPLIFICADA
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

let currentUser = null;
let currentComercioId = null;
let comercioData = {};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/login.html";
        return;
    }
    currentUser = user;
    await initializePage();
    runFlowController(user.uid);
});

async function initializePage() {
    console.log('🚀 INICIANDO initializePage');
   
    try {
        showLoading('Cargando dashboard...');
        renderLayout();
        const userRef = doc(db, 'usuarios', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            console.error('❌ Usuario no existe');
            hideLoading();
            return;
        }
        const userData = userSnap.data();
        currentComercioId = userData.comercioId;
        console.log('✅ ComercioId:', currentComercioId);
        await loadComercioData();
        updateHeaderInfo(
            comercioData.nombreComercio || 'Mi Comercio',
            PLANS[comercioData.plan || 'trial']
        );
        updateBanner();
        console.log('⏳ Esperando frame de animación...');
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
       
        console.log('🎨 LLAMANDO A renderDashboard()');
        renderDashboard(); // SIN await - ejecutar inmediatamente
       
        console.log('🔧 Configurando eventos');
        setupEvents();
        hideLoading();
        console.log('✅ InitializePage COMPLETO');
    } catch (err) {
        console.error('❌ ERROR en initializePage:', err);
        hideLoading();
       
        // FORZAR renderizado de emergencia
        console.log('🚨 Intentando renderizado de emergencia');
        renderDashboard();
        setupEvents();
    }
}

async function loadComercioData() {
    try {
        const ref = doc(db, 'comercios', currentComercioId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            comercioData = { id: currentComercioId, ...snap.data() };
        } else {
            comercioData = {
                id: currentComercioId,
                plan: 'trial',
                nombreComercio: 'Mi Comercio',
                stats: { productosCount: 0, horariosConfigurados: false }
            };
        }
    } catch (error) {
        console.error('❌ Error cargando comercio:', error);
        comercioData = {
            id: currentComercioId,
            plan: 'trial',
            nombreComercio: 'Mi Comercio',
            stats: { productosCount: 0, horariosConfigurados: false }
        };
    }
}

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
    }
}

function renderDashboard() {
    console.log('═══════════════════════════════════════════');
    console.log('🎨 RENDER DASHBOARD - INICIO');
    console.log('═══════════════════════════════════════════');
   
    const cont = document.getElementById("dashboardContainer");
    console.log('📦 Contenedor dashboardContainer:', cont ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
   
    if (!cont) {
        console.error('❌ CRÍTICO: No existe #dashboardContainer en el DOM');
        console.log('📋 Contenido del body:', document.body.innerHTML.substring(0, 300));
        return;
    }
    const productCount = comercioData.stats?.productosCount ?? 0;
    const horarios = comercioData.stats?.horariosConfigurados === true;
    console.log('📊 Datos disponibles:');
    console.log(' - Email:', currentUser?.email);
    console.log(' - Comercio:', comercioData.nombreComercio);
    console.log(' - ComercioId:', currentComercioId);
    cont.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
            <p>Resumen general y accesos rápidos a todas las secciones</p>
        </div>
        <section class="dashboard-grid">
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
            <!-- CARD MODIFICADA: Generar Entidad (Llamada Mínima) -->
            <div class="dash-card highlight">
                <div class="dash-icon"><i class="fas fa-cogs"></i></div>
                <div class="dash-content">
                    <h3>Generar Entidad</h3>
                    <p>Crea y guarda la entidad oficial del comercio</p>
                </div>
                <button id="btnGenerateEntity" class="btn btn-primary btn-sm">
                    <i class="fas fa-magic"></i> Generar
                </button>
            </div>
            <div class="dash-card highlight">
                <div class="dash-icon"><i class="fas fa-link"></i></div>
                <div class="dash-content">
                    <h3>Generar Link de la Entidad</h3>
                    <p>Obtén URL o QR para compartir</p>
                </div>
                <a href="/api/link-builder?action=generate&comercio_id=${currentComercioId || 'SIN_ID'}" target="_blank" class="btn btn-primary btn-sm">
                    <i class="fas fa-arrow-right"></i> Generar
                </a>
            </div>
        </section>
    `;
    // Verificación exhaustiva
    const cards = cont.querySelectorAll('.dash-card');
    console.log('✅ innerHTML establecido');
    console.log('🔢 Total de cards renderizadas:', cards.length);
   
    if (cards.length === 9) {
        console.log('✅✅✅ TODAS LAS 9 CARDS ESTÁN EN EL DOM');
    } else {
        console.error('❌ FALTAN CARDS! Solo hay', cards.length);
    }
   
    cards.forEach((card, i) => {
        const title = card.querySelector('h3')?.textContent || 'Sin título';
        const visible = card.offsetHeight > 0;
        console.log(` ${i + 1}. ${title} - ${visible ? '👁️ VISIBLE' : '🚫 OCULTA'}`);
    });
   
    console.log('═══════════════════════════════════════════');
    console.log('🎨 RENDER DASHBOARD - FIN');
    console.log('═══════════════════════════════════════════');
}

function setupEvents() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("¿Cerrar sesión?")) {
                signOut(auth).catch(err => console.error('Error al cerrar sesión:', err));
            }
        });
    }

    // ===============================
    // GENERAR ENTIDAD (LLAMADA MÍNIMA)
    // ===============================
    const btnGenerate = document.getElementById('btnGenerateEntity');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            if (btnGenerate.disabled) return;
            btnGenerate.disabled = true;
            const originalHTML = btnGenerate.innerHTML;
            btnGenerate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

            try {
                console.log('🚀 Generando entidad para:', currentComercioId);
                
                const response = await fetch('/api/generate-and-upload-entity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        comercioId: currentComercioId
                    })
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Error del servidor');
                }

                const data = await response.json();
                console.log('✅ RESULTADO:', data);

                if (data.ok && data.url) {
                    showToast('¡Entidad generada y guardada con éxito!', 'success');
                } else {
                    throw new Error('Respuesta incompleta del servidor');
                }

            } catch (err) {
                console.error('❌ Error generando entidad:', err);
                showToast('Error: ' + (err.message || 'Inténtalo más tarde'), 'error');
            } finally {
                btnGenerate.disabled = false;
                btnGenerate.innerHTML = originalHTML;
            }
        });
    }
}

window.validateCurrentPageData = async () => true;
