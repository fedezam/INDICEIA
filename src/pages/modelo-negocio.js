// ============================================================
// src/pages/modelo-negocio.js
// ============================================================

import { doc, updateDoc }        from "firebase/firestore";
import { db }                    from "/src/firebase.js";

import { runLifecycle }          from "/src/skeleton/lifecycle.js";
import { createFirebaseAdapter } from "/src/skeleton/adapters/firebaseAdapter.js";
import { mountLayout }           from "/src/skeleton/layout/index.js";

import { runFlowController }     from "/src/controllers/flowController.js";
import { createCard }            from "/src/skeleton/components/card/index.js";
import { showToast }             from "/src/skeleton/components/toast/index.js";

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

  // ==================== HEADER ====================
  const header = document.createElement("div");
  header.className = "page-content";
  header.innerHTML = `
    <h1>¿Qué ofrece tu comercio?</h1>
    <p>Seleccioná una o ambas opciones para continuar.</p>
  `;
  page.appendChild(header);

  // ==================== CARDS ====================
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";
  page.appendChild(cardsContainer);

  const cardProductos = createCard({
    title: "Productos",
    content: "Vendés artículos físicos o digitales.",
    icon: "fa-box",
    variant: "primary",
    selectable: true,
    selected: state.productos,
  });

  const cardServicios = createCard({
    title: "Servicios",
    content: "Ofrecés servicios con turnos o por hora.",
    icon: "fa-concierge-bell",
    variant: "info",
    selectable: true,
    selected: state.servicios,
  });

  cardsContainer.appendChild(cardProductos);
  cardsContainer.appendChild(cardServicios);

  // ==================== BOTÓN CONTINUAR ====================
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-primary";
  saveBtn.textContent = "Continuar";
  page.appendChild(saveBtn);

  saveBtn.addEventListener("click", async () => {
    const productos = cardProductos.isSelected();
    const servicios = cardServicios.isSelected();

    if (!productos && !servicios) {
      showToast("Seleccioná al menos una opción", "warning");
      return;
    }

    try {
      const comercioId = ctx.userData.comercioId;

      await updateDoc(
        doc(db, "comercios", comercioId),
        {
          offerType: {
            productos,
            servicios,
          },
          "onboardingSteps.modelo-negocio": true,
        }
      );

      showToast("Configuración guardada correctamente", "success");

      // 🔥 Arquitectura dashboard-hub:
      // Siempre volvemos a dashboard.
      window.location.href = "/dashboard.html";

    } catch (error) {
      console.error("Error guardando modelo de negocio:", error);
      showToast("Error al guardar la configuración", "error");
    }
  });
}
