// ============================================================
// src/pages/modelo-negocio.js
// ============================================================
import { doc, updateDoc }          from "firebase/firestore";
import { db }                      from "/src/firebase.js";
import { runLifecycle }            from "/src/skeleton/lifecycle.js";
import { createFirebaseAdapter }   from "/src/skeleton/adapters/firebaseAdapter.js";
import { mountLayout }             from "/src/skeleton/layout/index.js";
import { runFlowController }       from "/src/controllers/flowController.js";
import { createCard }              from "/src/skeleton/components/card/index.js";
import { createOnboardingButton }  from "/src/skeleton/components/onboarding-button/index.js";
import { showToast }               from "/src/skeleton/components/toast/index.js";
import "./modelo-negocio.css";

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: "Cargando..." },
  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

/* ============================================================
   LOAD
   ============================================================ */
async function load(ctx) {
  const offerType  = ctx.comercioData?.offerType || {};
  const isEditMode = ctx.isEditMode === true;
  console.log('[modelo-negocio] load() offerType:', offerType, '| isEditMode:', isEditMode);
  return {
    productos:  offerType.productos === true,
    servicios:  offerType.servicios === true,
    isEditMode,
  };
}

/* ============================================================
   RENDER
   ============================================================ */
function render(ctx, state) {
  const page = document.getElementById("skeleton-page");
  page.innerHTML = "";

  // ── Header ──────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "page-content";
  header.innerHTML = `
    <h1>¿Qué ofrece tu comercio?</h1>
    <p>Seleccioná una o ambas opciones para continuar.</p>
  `;
  page.appendChild(header);

  // ── Cards seleccionables ─────────────────────────────────
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";
  page.appendChild(cardsContainer);

  const cardProductos = createCard({
    title:      "Productos",
    content:    "Vendés artículos físicos o digitales.",
    icon:       "fa-box",
    variant:    "primary",
    selectable: true,
    selected:   state.productos,
  });

  const cardServicios = createCard({
    title:      "Servicios",
    content:    "Ofrecés servicios con turnos o por hora.",
    icon:       "fa-concierge-bell",
    variant:    "info",
    selectable: true,
    selected:   state.servicios,
  });

  cardsContainer.appendChild(cardProductos);
  cardsContainer.appendChild(cardServicios);

  // ── Prevenir deselección total ───────────────────────────
  // Si el usuario intenta quitar la última opción activa, la restauramos
  cardsContainer.addEventListener('click', () => {
    setTimeout(() => {
      const productos = cardProductos.isSelected();
      const servicios = cardServicios.isSelected();
      if (!productos && !servicios) {
        // Restauramos la que estaba activa antes
        if (state.productos) cardProductos.select();
        if (state.servicios) cardProductos.select();
        showToast('Al menos una opción debe estar activa', 'warning');
      }
    }, 0);
  });

  // ── Snapshot inicial para dirty check ───────────────────
  const snapshot = {
    productos: state.productos,
    servicios: state.servicios,
  };

  const dirtyController = {
    hasUnsavedChanges: () => {
      const dirty =
        cardProductos.isSelected() !== snapshot.productos ||
        cardServicios.isSelected() !== snapshot.servicios;
      console.log('[modelo-negocio] hasUnsavedChanges():', dirty);
      return dirty;
    },
    markSaved: () => {
      snapshot.productos = cardProductos.isSelected();
      snapshot.servicios = cardServicios.isSelected();
      console.log('[modelo-negocio] markSaved() snapshot actualizado:', { ...snapshot });
    }
  };

  // ── Onboarding button ────────────────────────────────────
  const btn = createOnboardingButton({
    stepName: 'modelo-negocio',

    validate: () => {
      const ok = cardProductos.isSelected() || cardServicios.isSelected();
      console.log('[modelo-negocio] validate():', ok);
      return ok;
    },

    getLabel: () => {
      const productos = cardProductos.isSelected();
      const servicios = cardServicios.isSelected();

      if (!productos && !servicios) return 'Seleccioná al menos una opción';
      if (state.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      if (state.isEditMode) return 'Guardar y volver al dashboard';
      return 'Continuar';
    },

    // En edit mode usamos dirtyController para que sin cambios redirija directo
    dirtyController: state.isEditMode ? dirtyController : undefined,

    onSave: async ({ uid, comercioId }) => {
      const productos = cardProductos.isSelected();
      const servicios = cardServicios.isSelected();

      console.log('[modelo-negocio] onSave() →', { productos, servicios, comercioId });

      await updateDoc(doc(db, 'comercios', comercioId), {
        offerType: { productos, servicios },
        'onboardingSteps.modelo-negocio': true,
      });

      // Toast descriptivo según qué cambió
      const agregados = [];
      if (productos && !snapshot.productos) agregados.push('Productos');
      if (servicios && !snapshot.servicios) agregados.push('Servicios');

      const removidos = [];
      if (!productos && snapshot.productos) removidos.push('Productos');
      if (!servicios && snapshot.servicios) removidos.push('Servicios');

      if (agregados.length) {
        showToast(`${agregados.join(' y ')} habilitado${agregados.length > 1 ? 's' : ''}`, 'success');
      }
      if (removidos.length) {
        showToast(`${removidos.join(' y ')} deshabilitado${removidos.length > 1 ? 's' : ''}`, 'info');
      }
      if (!agregados.length && !removidos.length) {
        showToast('Configuración guardada', 'success');
      }

      return { success: true, stepMarked: true };
    },

    onError: (err) => {
      console.error('[modelo-negocio] onSave ERROR:', err);
      showToast('Error al guardar la configuración', 'error');
    }
  });

  page.appendChild(btn);
}
