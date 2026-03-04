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
  const offerType = ctx.comercioData?.offerType || {};
  console.log('[modelo-negocio] load() offerType:', offerType);
  return {
    productos: offerType.productos === true,
    servicios: offerType.servicios === true,
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
    title:     "Productos",
    content:   "Vendés artículos físicos o digitales.",
    icon:      "fa-box",
    variant:   "primary",
    selectable: true,
    selected:  state.productos,
  });

  const cardServicios = createCard({
    title:     "Servicios",
    content:   "Ofrecés servicios con turnos o por hora.",
    icon:      "fa-concierge-bell",
    variant:   "info",
    selectable: true,
    selected:  state.servicios,
  });

  cardsContainer.appendChild(cardProductos);
  cardsContainer.appendChild(cardServicios);

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
      return 'Continuar';
    },

    onSave: async ({ uid, comercioId }) => {
      const productos = cardProductos.isSelected();
      const servicios = cardServicios.isSelected();

      console.log('[modelo-negocio] onSave() →', { productos, servicios, comercioId });

      await updateDoc(doc(db, 'comercios', comercioId), {
        offerType: { productos, servicios },
        'onboardingSteps.modelo-negocio': true,
      });

      showToast('Configuración guardada correctamente', 'success');

      // Retornamos stepMarked: true porque ya escribimos onboardingSteps arriba
      return { success: true, stepMarked: true };
    },

    onError: (err) => {
      console.error('[modelo-negocio] onSave ERROR:', err);
      showToast('Error al guardar la configuración', 'error');
    }
  });

  page.appendChild(btn);
}
