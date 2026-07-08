// ============================================================
// src/pages/horarios.js
// ============================================================

import { runLifecycle }           from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }            from '/src/skeleton/layout/index.js';
import { runFlowController }      from '/src/controllers/flowController.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { createHorariosEditor }   from '/src/skeleton/components/horarios-editor/index.js';

import './horarios.css';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando horarios...' },

  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
function getMode() {
  return new URLSearchParams(window.location.search).get('mode');
}

async function load(ctx) {
  const isDelivery = getMode() === 'delivery';

  const horariosData = isDelivery
    ? ctx.comercioData?.horariosDelivery
    : ctx.comercioData?.horarios;

  const entityType       = ctx.comercioData?.entityType || 'comercio';
  const tieneLocalFisico = entityType === 'comercio'
    ? ctx.comercioData?.tieneLocalFisico !== false
    : ctx.comercioData?.modalidad_trabajo === 'local';

  return { horariosData, tieneLocalFisico, isDelivery };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  // ── HEADER ───────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'page-header';

  if (state.isDelivery) {
    header.innerHTML = `
      <h2><i class="fas fa-motorcycle"></i> Horarios de Delivery</h2>
      <p>Configurá cuándo pueden realizarse entregas</p>`;
  } else if (state.tieneLocalFisico) {
    header.innerHTML = `
      <h2><i class="fas fa-clock"></i> Horarios de Atención</h2>
      <p>Configurá cuándo está abierto tu local</p>`;
  } else {
    header.innerHTML = `
      <h2><i class="fas fa-clock"></i> Horarios de Trabajo</h2>
      <p>Configurá en qué horarios trabajás habitualmente</p>`;
  }
  page.appendChild(header);

  // ── AI CARD ───────────────────────────────────────────────
  const aiCardContent = state.isDelivery
    ? 'Tu asistente sabrá cuándo podés realizar entregas y comunicará los horarios a tus clientes automáticamente.'
    : state.tieneLocalFisico
      ? 'Tu asistente sabrá cuándo está abierto tu local y se lo comunicará a tus clientes automáticamente.'
      : 'Tu asistente sabrá en qué horarios trabajás y avisará a los clientes si contactan fuera de ese horario.';

  page.appendChild(createCard({
    title:     '¡Tu IA conocerá tus horarios!',
    icon:      'fa-robot',
    variant:   'info',
    highlight: true,
    compact:   true,
    content:   aiCardContent
  }));

  // ── EDITOR DE HORARIOS ────────────────────────────────────
  const originalSnapshot = structuredClone(
    normalizeParaSnapshot(state.horariosData)
  );

  const editor = createHorariosEditor(state.horariosData, {
    tieneLocalFisico: state.tieneLocalFisico,
    onChange: () => document.dispatchEvent(new Event('change'))
  });

  page.appendChild(editor.element);

  const dirtyController = {
    hasUnsavedChanges: () => JSON.stringify(editor.getValue()) !== JSON.stringify(originalSnapshot),
    markSaved:         () => Object.assign(originalSnapshot, structuredClone(editor.getValue()))
  };

  // ── BOTÓN GUARDAR ─────────────────────────────────────────
  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '30px';

  btnContainer.appendChild(createOnboardingButton({
    stepName: state.isDelivery ? 'horarios-delivery' : 'horarios',

    validate: () => editor.isValid(),

    getData: () => ({
      [state.isDelivery ? 'horariosDelivery' : 'horarios']: editor.getValue(),
      comercioId: ctx.comercioId
    }),

    dirtyController,
    getLabel: () => {
      if (ctx.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      return 'Guardar y continuar';
    },
    onSuccess: () => showToast('Horarios guardados correctamente', 'success'),
    onError:   (err) => showToast('Error al guardar: ' + err.message, 'error'),
  }));

  page.appendChild(btnContainer);
}

// Usa la misma normalización que el editor para que el snapshot inicial
// (usado por dirtyController) coincida exactamente con editor.getValue().
function normalizeParaSnapshot(horariosData) {
  const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const result = {};
  DAYS.forEach(day => {
    const existing = horariosData?.[day];
    result[day] = existing
      ? { open: existing.open ?? false, turnos: Array.isArray(existing.turnos) ? existing.turnos : [] }
      : { open: false, turnos: [] };
  });
  return result;
}
