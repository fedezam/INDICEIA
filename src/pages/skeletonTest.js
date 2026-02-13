// src/pages/dashboard.js
// Dashboard en formato skeleton (sin imports de Firebase directo)

import './skeletonTest';

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createCard } from '../skeleton/components/card/index.js';
import { showToast } from '../skeleton/components/toast/index.js';

const dashboardPage = {
  async load(ctx) {
    console.log('📦 Dashboard cargado');
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.comercioId = ctx.comercioId;
    this.userData = ctx.userData || {};
    
    console.log('Comercio ID:', this.comercioId);
    console.log('Comercio Data:', this.comercioData);
  },

  render() {
    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ #skeleton-page no existe');
      return;
    }

    page.innerHTML = '';
    page.className = 'dashboard-container';

    // ===== SECCIÓN CONFIGURACIÓN =====
    const configSection = this.createConfigSection();
    
    // ===== SECCIÓN PUBLICACIÓN =====
    const publishSection = this.createPublishSection();
    
    // ===== SECCIÓN SISTEMA =====
    const systemSection = this.createSystemSection();

    page.append(configSection, publishSection, systemSection);
    
    console.log('✅ Dashboard renderizado');
  },

  createConfigSection() {
    const section = document.createElement('section');
    section.className = 'dashboard-section';
    section.innerHTML = '<h2>Configuración</h2>';

    section.append(
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
        title: 'Configuración IA',
        content: 'Personalidad y comportamiento de la IA',
        icon: 'fa-robot',
        clickable: true,
        onClick: () => location.href = '/ia-config.html'
      })
    );

    return section;
  },

  createPublishSection() {
    const section = document.createElement('section');
    section.className = 'dashboard-section';
    section.innerHTML = '<h2>Publicación</h2>';

    const hasEntity = !!this.comercioData.entityPublicUrl;

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
            onClick: () => this.generateEntity(generateEntityCard, publicLinkCard)
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
            url: this.comercioData.entityPublicUrl,
            target: '_blank'
          }
        : {
            type: 'button',
            label: 'No disponible',
            onClick: () => showToast('Primero generá la entidad', 'info')
          }
    });

    section.append(generateEntityCard, publicLinkCard);

    return section;
  },

  createSystemSection() {
    const section = document.createElement('section');
    section.className = 'dashboard-section';
    section.innerHTML = '<h2>Sistema</h2>';

    section.append(
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

    return section;
  },

  async generateEntity(generateCard, linkCard) {
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
        body: JSON.stringify({ comercioId: this.comercioId })
      });

      const data = await res.json();
      if (!data.ok) throw new Error('Error generando entidad');

      showToast('Entidad generada con éxito', 'success');

      // Actualizar estado local
      this.comercioData.entityPublicUrl = data.entityPublicUrl || true;

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
          url: this.comercioData.entityPublicUrl,
          target: '_blank'
        }
      });

    } catch (err) {
      console.error('Error generando entidad:', err);
      showToast('Error al generar entidad', 'error');
      
      // Restaurar card
      generateCard.update({
        title: 'Generar entidad',
        content: 'Publica la entidad con la configuración actual',
        icon: 'fa-magic',
        highlight: true,
        action: {
          type: 'button',
          label: 'Generar',
          onClick: () => this.generateEntity(generateCard, linkCard)
        }
      });
    }
  }
};

/* ============================
   RUN
============================ */
runSkeleton({
  page: dashboardPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: 'Cargando dashboard...'
  }
});
