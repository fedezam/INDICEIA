// ============================================================
// src/pages/visual/visual.js
// ============================================================

import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { db }                     from '/src/services/firebase/firebase.js';
import { doc, updateDoc }         from 'firebase/firestore';
import './visual.css';

// ============================================================
// PÁGINA
// ============================================================
const page = {
  _data: {
    templates: [],
    selectedTemplateId: null
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._data.selectedTemplateId = ctx.comercioData?.templateId || null;

    try {
      const res = await fetch('/templates/registry.visual.json?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this._data.templates = json.templates || [];
    } catch (err) {
      console.error('[visual] Error cargando registry:', err);
      this._data.templates = [];
      showToast('Error', 'No se pudieron cargar los templates', 'error');
    }
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-palette"></i> Visual Builder</h1>
      <p class="page-subtitle">Seleccioná el diseño perfecto para tu catálogo</p>
    `;
    root.appendChild(header);

    // Info card — componente card del skeleton, variante info
    root.appendChild(createCard({
      icon: 'fa-info-circle',
      variant: 'info',
      title: 'Elegí tu template ideal',
      content: 'Cada diseño está optimizado para diferentes tipos de negocio. Hacé clic en una tarjeta para seleccionarla y luego guardá tu elección.',
      flat: true
    }));

    // Templates
    root.appendChild(this._renderTemplatesCard());

    // Botón guardar
    root.appendChild(this._renderSaveButton());
  },

  // ──────────────────────────────────────────────────────────
  // TEMPLATES CARD
  // ──────────────────────────────────────────────────────────
  _renderTemplatesCard() {
    const container = document.createElement('div');

    if (this._data.templates.length === 0) {
      container.innerHTML = `
        <div class="visual-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>No hay templates disponibles en este momento.</p>
        </div>
      `;
    } else {
      const grid = document.createElement('div');
      grid.className = 'visual-grid';

      this._data.templates.forEach(template => {
        grid.appendChild(this._renderTemplateCard(template));
      });

      container.appendChild(grid);
    }

    return createCard({
      title: 'Templates disponibles',
      icon: 'fa-swatchbook',
      content: container
    });
  },

  _renderTemplateCard(template) {
    const isActive = this._data.selectedTemplateId === template.id;

    const card = document.createElement('div');
    card.className = `visual-card${isActive ? ' active' : ''}`;
    card.dataset.id = template.id;

    card.innerHTML = `
      ${isActive ? `<div class="visual-badge active-badge"><i class="fas fa-check"></i> Activo</div>` : ''}

      <div class="visual-thumbnail">
        ${template.previews?.thumbnail
          ? `<img src="${template.previews.thumbnail}" alt="${template.name}" loading="lazy" />`
          : `<div class="visual-thumbnail-placeholder"><i class="fas fa-image"></i></div>`
        }
        <div class="visual-thumbnail-overlay">
          <i class="fas fa-mouse-pointer"></i>
          Seleccionar
        </div>
      </div>

      <div class="visual-info">
        <h3>${template.name || 'Sin nombre'}</h3>
        <span class="visual-version">v${template.version || '1.0'} · ${template.tier || 'free'}</span>
        <p class="visual-description">${template.description || 'Sin descripción.'}</p>

        ${template.ideal_for?.length ? `
          <div class="visual-tags">
            ${template.ideal_for.map(t => `<span class="visual-tag">${t}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;

    card.addEventListener('click', () => this._selectTemplate(template.id));
    return card;
  },

  _selectTemplate(templateId) {
    this._data.selectedTemplateId = templateId;

    // Actualizar UI sin re-render completo
    document.querySelectorAll('.visual-card').forEach(card => {
      const isSelected = card.dataset.id === templateId;
      card.classList.toggle('active', isSelected);

      const badge = card.querySelector('.visual-badge');
      if (isSelected && !badge) {
        const b = document.createElement('div');
        b.className = 'visual-badge active-badge';
        b.innerHTML = `<i class="fas fa-check"></i> Activo`;
        card.appendChild(b);
      } else if (!isSelected && badge) {
        badge.remove();
      }
    });

    const t = this._data.templates.find(t => t.id === templateId);
    if (t) showToast('Template seleccionado', `${t.name} listo para aplicar`, 'success');
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    return createOnboardingButton({
      stepName: 'visual',

      validate: () => {
        const valid = !!this._data.selectedTemplateId;
        if (!valid) showToast('Error', 'Seleccioná un template primero', 'warning');
        return valid;
      },

      onSave: async ({ comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId');

        await updateDoc(doc(db, 'comercios', comercioId), {
          templateId: this._data.selectedTemplateId,
          templateUpdatedAt: new Date().toISOString()
        });

        return { success: true, stepMarked: false };
      },

      onSuccess: () => {
        showToast('¡Listo!', 'Template guardado correctamente', 'success');
      },

      onError: (err) => {
        console.error('[visual] Error guardando template:', err);
        showToast('Error', 'No se pudo guardar el template', 'error');
      },

      redirectTo: '/dashboard.html'
    });
  }
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando Visual Builder...' }
});
