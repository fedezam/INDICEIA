// src/pages/mi-ia.js
import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { getUserData, updateUserData } from '../shared/firebaseHelpers.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { PlansManager } from '../shared/plans.js';
import Navigation from '../shared/navigation.js';

// Variables globales
let userData = {};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading('Verificando sesión...');
    
    const user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!user) {
      window.location.href = '/index.html';
      return;
    }

    showLoading('Cargando configuración de IA...');
    userData = await getUserData();
    
    updateHeader();
    updateSubscriptionBanner();
    renderAIConfigForm();
    setupEventListeners();
    Navigation.init();

    // Si ya tiene IA generada, mostrar preview
    if (userData.aiGenerated) {
      renderPreview();
    }

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showToast('Error', 'No se pudo cargar la página', 'error');
  }
});

// ==========================================
// ACTUALIZACIÓN DE HEADER
// ==========================================
function updateHeader() {
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  
  if (commerceName) {
    commerceName.textContent = userData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    const plan = PlansManager.getPlan(userData.plan || 'trial');
    planBadge.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
  }
}

function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const messageEl = document.getElementById('subscriptionMessage');
  
  if (!banner || !messageEl) return;
  
  const trialEnd = userData.trialEndDate ? new Date(userData.trialEndDate) : null;
  const now = new Date();
  const status = userData.estado || 'trial';
  
  if (status === 'active') {
    const endDate = userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : null;
    const formattedDate = endDate ? endDate.toLocaleDateString('es-ES') : 'fecha no disponible';
    messageEl.textContent = `Suscripción activa hasta ${formattedDate}`;
    banner.className = 'subscription-banner active';
  } else if (status === 'trial' && trialEnd) {
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      messageEl.textContent = `Trial gratuito - ${daysLeft} días restantes`;
      banner.className = 'subscription-banner';
    } else {
      messageEl.textContent = `Trial expirado - actualiza tu plan`;
      banner.className = 'subscription-banner expired';
    }
  } else {
    messageEl.textContent = `Suscripción vencida - actualiza tu plan`;
    banner.className = 'subscription-banner expired';
  }
}

// ==========================================
// RENDERIZADO DE FORMULARIO IA
// ==========================================
function renderAIConfigForm() {
  const container = document.getElementById('aiConfigFields');
  if (!container) return;
  
  container.innerHTML = '';

  const aiFields = [
    { id: "aiName", label: "Nombre del Asistente", type: "text", placeholder: "ej: Ana" },
    { id: "aiPersonality", label: "Personalidad", type: "select", options: ["Amigable y cercano", "Profesional", "Divertido", "Formal", "Casual"] },
    { id: "aiTone", label: "Tono de voz", type: "select", options: ["Entusiasta", "Relajado", "Serio", "Jovial", "Elegante"] },
    { id: "aiGreeting", label: "Saludo inicial", type: "textarea", placeholder: "¡Hola! Soy Ana, tu asistente virtual..." }
  ];

  aiFields.forEach(field => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('form-group');

    const label = document.createElement('label');
    label.textContent = field.label;
    wrapper.appendChild(label);

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.name = field.id;
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        input.appendChild(option);
      });
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.name = field.id;
      input.placeholder = field.placeholder || '';
    } else {
      input = document.createElement('input');
      input.type = field.type;
      input.name = field.id;
      input.placeholder = field.placeholder || '';
    }

    // Valor guardado previamente
    if (userData.aiConfig?.[field.id]) {
      input.value = userData.aiConfig[field.id];
    }

    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Formulario IA
  document.getElementById('aiConfigForm')?.addEventListener('submit', generateAI);
  
  // Preview
  document.getElementById('previewAI')?.addEventListener('click', renderPreview);
  
  // Compartir
  document.getElementById('copyLinkBtn')?.addEventListener('click', copyLinkToClipboard);
  document.getElementById('whatsappShareBtn')?.addEventListener('click', shareLinkWhatsApp);
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      await signOut(auth);
      window.location.href = '/index.html';
    }
  });
}

// ==========================================
// GENERAR Y GUARDAR IA
// ==========================================
async function generateAI(e) {
  e.preventDefault();
  
  try {
    showLoading('Generando IA...');
    
    const form = document.getElementById('aiConfigForm');
    const formData = new FormData(form);
    const aiConfig = {};
    formData.forEach((value, key) => { 
      aiConfig[key] = value; 
    });

    // Guardar en Firestore usando helper
    await updateUserData({
      aiConfig,
      aiGenerated: true,
      fechaActualizacion: new Date()
    });
    
    // Actualizar datos locales
    userData.aiConfig = aiConfig;
    userData.aiGenerated = true;

    hideLoading();
    renderPreview();
    showToast('IA generada', 'Tu asistente virtual está listo', 'success');
  } catch (error) {
    hideLoading();
    console.error('Error generando IA:', error);
    showToast('Error', 'No se pudo generar la IA', 'error');
  }
}

// ==========================================
// PREVIEW Y COMPARTIR
// ==========================================
function renderPreview() {
  if (!userData.aiGenerated) {
    showToast('Info', 'Primero debes generar tu IA', 'info');
    return;
  }
  
  const previewSection = document.getElementById('aiPreviewSection');
  if (!previewSection) return;
  
  previewSection.classList.remove('hidden');

  // Generar link dinámico
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  
  const aiLink = `${window.location.origin}/app?user=${userId}`;
  const display = document.getElementById('aiLinkDisplay');
  
  if (display) {
    display.textContent = aiLink;
    display.setAttribute('data-link', aiLink);
  }
}

function copyLinkToClipboard() {
  const display = document.getElementById('aiLinkDisplay');
  if (!display) return;
  
  const link = display.getAttribute('data-link');
  if (!link) {
    showToast('Error', 'No hay link para copiar', 'error');
    return;
  }
  
  navigator.clipboard.writeText(link)
    .then(() => showToast('Copiado', 'Enlace copiado al portapapeles', 'success'))
    .catch(() => showToast('Error', 'No se pudo copiar el enlace', 'error'));
}

function shareLinkWhatsApp() {
  const display = document.getElementById('aiLinkDisplay');
  if (!display) return;
  
  const link = display.getAttribute('data-link');
  if (!link) {
    showToast('Error', 'No hay link para compartir', 'error');
    return;
  }
  
  const whatsappUrl = `https://wa.me/?text=Visita%20mi%20IA:%20${encodeURIComponent(link)}`;
  window.open(whatsappUrl, '_blank');
}