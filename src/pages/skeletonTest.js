import './skeletonTest.css';

import { auth, db } from '../../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { renderLayout } from '../../skeleton/layout/renderLayout.js';
import { createCard } from '../../skeleton/components/card/index.js';

import { showToast, showLoading, hideLoading } from '../../shared/utils.js';

let currentUser = null;
let comercioId = null;
let comercioData = null;

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await initDashboard();
});

// ==================== INIT ====================
async function initDashboard() {
  showLoading('Cargando dashboard...');
  renderLayout();

  try {
    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
    if (!userSnap.exists()) throw new Error('Usuario no existe');

    comercioId = userSnap.data().comercioId;

    const comercioSnap = await getDoc(doc(db, 'comercios', comercioId));
    comercioData = comercioSnap.exists() ? comercioSnap.data() : {};

    renderDashboard();
  } catch (err) {
    console.error(err);
    showToast('Error cargando dashboard', 'error');
  } finally {
    hideLoading();
  }
}

// ==================== RENDER ====================
function renderDashboard() {
  const root = document.getElementById('pageContent');
  root.innerHTML = '';

  // ===== SECCIÓN CONFIGURACIÓN =====
  const configSection = document.createElement('section');
  configSection.className = 'dashboard-section';
  configSection.innerHTML = `<h2>Configuración</h2>`;

  configSection.append(
    createCard({
      title: 'Usuario',
      content: 'Datos de acceso y contacto',
      icon: 'fa-user',
      clickable: true,
      onClick: () => location.href = '/usuario.html'
    }),
    createCard({
      title: 'Mi comercio',
      content: 'Información general del comercio',
      icon: 'fa-store',
      clickable: true,
      onClick: () => location.href = '/mi-comercio.html'
    }),
    createCard({
      title: 'Horarios',
      content: 'Días y horarios de atención',
      icon: 'fa-clock',
      clickable: true,
      onClick: () => location.href = '/horarios.html'
    }),
    createCard({
      title: 'Servicios',
      content: 'Servicios ofrecidos',
      icon: 'fa-concierge-bell',
      clickable: true,
      onClick: () => location.href = '/servicios.html'
    }),
    createCard({
      title: 'Productos',
      content: 'Productos publicados',
      icon: 'fa-box',
      clickable: true,
      onClick: () => location.href = '/productos.html'
    }),
    createCard({
      title: 'Estado cognitivo',
      content: 'Capacidades mentales de la entidad',
      icon: 'fa-brain',
      clickable: true,
      onClick: () => location.href = '/estado-cognitivo.html'
    })
  );

  // ===== SECCIÓN PUBLICACIÓN =====
  const publishSection = document.createElement('section');
  publishSection.className = 'dashboard-section';
  publishSection.innerHTML = `<h2>Publicación</h2>`;

  const hasEntity = !!comercioData.entityPublicUrl;

  const generateEntityCard = createCard({
    title: hasEntity ? 'Entidad generada' : 'Generar entidad',
    content: hasEntity
      ? 'Tu entidad ya está publicada y sincronizada'
      : 'Publica la entidad con la configuración actual',
    icon: hasEntity ? 'fa-check' : 'fa-magic',
    variant: hasEntity ? 'success' : null,
    highlight: !hasEntity,
    action: hasEntity
      ? null
      : {
          type: 'button',
          label: 'Generar',
          onClick: () => generateEntity(generateEntityCard, publicLinkCard)
        }
  });

  const publicLinkCard = createCard({
    title: 'Link público',
    content: hasEntity
      ? 'Accedé al link y QR de tu entidad'
      : 'Disponible una vez generada la entidad',
    icon: 'fa-link',
    clickable: hasEntity,
    flat: !hasEntity,
    action: hasEntity
      ? {
          type: 'link',
          label: 'Ver link',
          url: comercioData.entityPublicUrl,
          target: '_blank'
        }
      : {
          type: 'button',
          label: 'No disponible',
          onClick: () =>
            showToast('Primero generá la entidad', 'info')
        }
  });

  publishSection.append(generateEntityCard, publicLinkCard);

  // ===== SECCIÓN SISTEMA =====
  const systemSection = document.createElement('section');
  systemSection.className = 'dashboard-section';
  systemSection.innerHTML = `<h2>Sistema</h2>`;

  systemSection.append(
    createCard({
      title: 'Visual Builder',
      content: 'Personalización visual (opcional)',
      icon: 'fa-palette',
      clickable: true,
      onClick: () => location.href = '/visual.html'
    }),
    createCard({
      title: 'Estadísticas',
      content: 'Visitas y conversiones',
      icon: 'fa-chart-bar',
      clickable: true,
      onClick: () => location.href = '/stats.html'
    })
  );

  root.append(configSection, publishSection, systemSection);
}

// ==================== ACTIONS ====================
async function generateEntity(generateCard, linkCard) {
  try {
    generateCard.update({
      title: 'Generando entidad…',
      content: 'Publicando entidad',
      icon: 'fa-spinner',
      flat: true,
      action: null
    });

    const res = await fetch('/api/generate-and-upload-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId })
    });

    const data = await res.json();
    if (!data.ok) throw new Error();

    showToast('Entidad generada con éxito', 'success');

    // Estado local
    comercioData.entityPublicUrl = true;

    // Actualizar cards
    generateCard.update({
      title: 'Entidad generada',
      content: 'Tu entidad está publicada y sincronizada',
      icon: 'fa-check',
      variant: 'success',
      highlight: false
    });

    linkCard.update({
      content: 'Accedé al link y QR de tu entidad',
      clickable: true,
      flat: false,
      action: {
        type: 'link',
        label: 'Ver link',
        url: comercioData.entityPublicUrl,
        target: '_blank'
      }
    });

  } catch (err) {
    console.error(err);
    showToast('Error al generar entidad', 'error');
  }
}

