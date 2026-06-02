// ============================================================
// src/pages/documentos.js
// ============================================================

import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { db }                     from '/src/services/firebase/firebase.js';
import { doc, updateDoc }         from 'firebase/firestore';

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================

const page = {
  _data: { manual: '' },
  _originalSnapshot: null,
  _ctx: null,
  _isEditMode: false,
  _refs: { fields: {} },

  async load(ctx) {
    this._ctx        = ctx;
    this._isEditMode = ctx.isEditMode === true;

    const c      = ctx.comercioData || {};
    this._data   = { manual: c.manual || '' };
    this._originalSnapshot = structuredClone(this._data);
  },

  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';
    this._refs = { fields: {} };

    const title = document.createElement('h2');
    title.className   = 'page-title';
    title.textContent = 'Manual del asistente';
    root.appendChild(title);

    const help = document.createElement('p');
    help.className   = 'form-help';
    help.textContent = 'Pegá o escribí el manual en formato Markdown. El asistente va a usar este contenido para responder consultas.';
    root.appendChild(help);

    this._refs.fields.manual = createFormField({
      label: 'Manual', name: 'manual', type: 'textarea', rows: 20, required: true,
      placeholder: '# Mi manual\n\nEscribí acá el contenido que debe conocer el asistente...',
      value: this._data.manual,
      actions: { onChange: (v) => { this._data.manual = v; } }
    });
    root.appendChild(this._refs.fields.manual);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    btnContainer.appendChild(this._renderSaveButton());
    root.appendChild(btnContainer);
  },

  _buildDirtyController() {
    return {
      hasUnsavedChanges: () => JSON.stringify(this._data) !== JSON.stringify(this._originalSnapshot),
      markSaved: () => { this._originalSnapshot = structuredClone(this._data); }
    };
  },

  _renderSaveButton() {
    const dirtyController = this._buildDirtyController();
    return createOnboardingButton({
      stepName: 'documentos',
      dirtyController: this._isEditMode ? dirtyController : undefined,
      getLabel: () => {
        if (!this._isEditMode) return 'Continuar';
        if (dirtyController.hasUnsavedChanges()) return 'Guardar y volver al dashboard';
        return 'Volver al dashboard';
      },
      validate: () => this._data.manual.trim().length > 0,
      onSave: async ({ comercioId }) => {
        await updateDoc(doc(db, 'entidades', comercioId), {
          manual:                      page._data.manual,
          'onboardingSteps.documentos': true,
          fechaActualizacion:          new Date(),
        });
        return { success: true, stepMarked: true };
      },
      onSuccess: () => {
        showToast('Manual guardado correctamente', 'success');
        dirtyController.markSaved();
      },
      onError: (err) => {
        console.error('❌ Error guardando manual:', err);
        showToast('Error al guardar: ' + err.message, 'error');
      }
    });
  }
};

// ============================================================
// ARRANQUE
// ============================================================

runSkeleton({ page, adapter: createFirebaseAdapter, options: { loadingMessage: 'Cargando manual...' } });
