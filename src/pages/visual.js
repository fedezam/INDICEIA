// ============================================================
// src/pages/visual/visual.js
// ============================================================

import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import {
  createTemplateSelector,
  loadTemplatesForEntityType
} from '/src/skeleton/components/visual-template-selector/index.js';
import './visual.css';

// ============================================================
// PÁGINA
// ============================================================
const page = {
  _data: {
    templates: [],
    originalTemplateId: null   // snapshot al momento de load
  },
  _selector: null,

  async load(ctx) {
    const entityType = ctx.comercioData?.entityType || 'comercio';

    this._data.originalTemplateId = ctx.comercioData?.templateId || null;

    try {
      this._data.templates = await loadTemplatesForEntityType(entityType);
    } catch (err) {
      console.error('[visual] Error cargando registry:', err);
      this._data.templates = [];
      showToast('Error', 'No se pudieron cargar los templates', 'error');
    }
  },

  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-palette"></i> Visual Builder</h1>
      <p class="page-subtitle">Seleccioná el diseño perfecto para tu catálogo</p>
    `;
    root.appendChild(header);

    root.appendChild(createCard({
      icon: 'fa-info-circle',
      variant: 'info',
      title: 'Elegí tu template ideal',
      content: 'Cada diseño está optimizado para diferentes tipos de negocio. Hacé clic en una tarjeta para seleccionarla y luego guardá tu elección.',
      flat: true
    }));

    root.appendChild(this._renderTemplatesCard());
    root.appendChild(this._renderSaveButton());
  },

  _renderTemplatesCard() {
    this._selector = createTemplateSelector({
      templates:  this._data.templates,
      selectedId: this._data.originalTemplateId,
      onChange: () => {
        // Notifica al botón que el estado cambió para actualizar el label
        document.dispatchEvent(new Event('change'));

        const id = this._selector.getValue();
        const t  = this._data.templates.find(t => t.id === id);
        if (t) showToast('Template seleccionado', `${t.name} listo para aplicar`, 'success');
      }
    });

    return createCard({ title: 'Templates disponibles', icon: 'fa-swatchbook', content: this._selector });
  },

  _renderSaveButton() {
    const self = this;

    // dirtyController manual — el estado cambia por click, no por inputs DOM
    const dirtyController = {
      hasUnsavedChanges: () =>
        self._selector.getValue() !== self._data.originalTemplateId,
      markSaved: () => {
        self._data.originalTemplateId = self._selector.getValue();
      }
    };

    return createOnboardingButton({
      stepName: 'visual',

      validate: () => true,

      dirtyController,

      getLabel: () =>
        dirtyController.hasUnsavedChanges()
          ? 'Guardar cambios'
          : 'Volver al dashboard',

      onSave: async ({ persistence }) => {
        const current  = self._selector.getValue();
        const original = self._data.originalTemplateId;

        // Sin cambios → redirect directo, sin escribir nada
        if (current === original) {
          return { success: true, stepMarked: false };
        }

        if (current) {
          // update — eligió un template
          await persistence.updateData({
            templateId: current,
            templateUpdatedAt: new Date().toISOString()
          });
        } else {
          // delete — tenía uno y lo quitó
          await persistence.deleteFields(['templateId', 'templateUpdatedAt']);
        }

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
