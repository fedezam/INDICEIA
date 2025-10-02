import { auth, db } from '../js/firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

let currentUser = null;
let userData = {};

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await initializePage();
    } else {
      window.location.href = '/index.html';
    }
  });
});

async function initializePage() {
  showLoading('Cargando datos de IA...');
  await loadUserData();
  renderAIConfigForm();
  setupEventListeners();
  hideLoading();
}

async function loadUserData() {
  const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
  if (userDoc.exists()) {
    userData = { id: currentUser.uid, ...userDoc.data() };
  } else {
    userData = { id: currentUser.uid };
  }
}

function renderAIConfigForm() {
  const container = document.getElementById('aiConfigFields');
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

function setupEventListeners() {
  document.getElementById('aiConfigForm').addEventListener('submit', generateAI);
  document.getElementById('previewAI').addEventListener('click', renderPreview);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('copyLinkBtn').addEventListener('click', copyLinkToClipboard);
  document.getElementById('whatsappShareBtn').addEventListener('click', shareLinkWhatsApp);
}

async function generateAI(e) {
  e.preventDefault();
  showLoading('Generando IA...');
  const form = document.getElementById('aiConfigForm');
  const formData = new FormData(form);
  const aiConfig = {};
  formData.forEach((value, key) => { aiConfig[key] = value; });

  // Guardar en Firestore
  await updateDoc(doc(db, "usuarios", currentUser.uid), { aiConfig, aiGenerated: true, fechaActualizacion: new Date() });
  userData.aiConfig = aiConfig;
  userData.aiGenerated = true;

  hideLoading();
  renderPreview();
  showToast('IA generada', 'Tu asistente virtual está listo');
}

function renderPreview() {
  if (!userData.aiGenerated) return;
  document.getElementById('aiPreviewSection').classList.remove('hidden');

  // Generar link dinámico (Vercel)
  const aiLink = `${window.location.origin}/app?user=${currentUser.uid}`;
  const display = document.getElementById('aiLinkDisplay');
  display.textContent = aiLink;
  display.setAttribute('data-link', aiLink);
}

function copyLinkToClipboard() {
  const link = document.getElementById('aiLinkDisplay').getAttribute('data-link');
  navigator.clipboard.writeText(link).then(() => showToast('Copiado', 'Enlace copiado al portapapeles'));
}

function shareLinkWhatsApp() {
  const link = document.getElementById('aiLinkDisplay').getAttribute('data-link');
  const whatsappUrl = `https://wa.me/?text=Visita%20mi%20IA:%20${encodeURIComponent(link)}`;
  window.open(whatsappUrl, '_blank');
}

function handleLogout() {
  if (confirm('¿Deseas cerrar sesión?')) {
    auth.signOut().then(() => window.location.href = '/index.html');
  }
}

// Loading & Toast
function showLoading(text = 'Cargando...') {
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  overlay.classList.add('show');
  loadingText.textContent = text;
}
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('show'); }

function showToast(title, message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${title}</strong> - ${message}`;
  container.appendChild(toast);
  setTimeout(() => container.removeChild(toast), 4000);
}
