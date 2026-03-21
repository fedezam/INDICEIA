// ============================================================
// src/pages/tipo-entidad/tipo-entidad.js
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
import "./tipo-entidad.css";

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

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  // Lee desde userData — ahora vive en usuarios, no en comercios
  const entityType = ctx.userData?.entityType || null;
  const offerType  = ctx.userData?.offerType  || {};
  const isEditMode = ctx.isEditMode === true;

  // Derivar selección inicial desde lo guardado
  let selected = null;
  if (entityType) {
    if (offerType.productos && offerType.servicios) selected = 'ambas';
    else if (offerType.productos) selected = 'productos';
    else if (offerType.servicios) selected = 'servicios';
  }

  return { selected, isEditMode };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById("skeleton-page");
  page.innerHTML = "";

  // ── Header ──────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "te-header";
  header.innerHTML = `
    <h1>¿A qué te dedicás?</h1>
    <p class="te-subtitle">Elegí la opción que mejor describe tu actividad. Esto define cómo va a funcionar tu asistente.</p>
  `;
  page.appendChild(header);

  // ── Estado de selección ──────────────────────────────────
  let selected = state.selected;

  // ── Cards ────────────────────────────────────────────────
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container te-cards";
  page.appendChild(cardsContainer);

  const opciones = [
    {
      key:      'productos',
      title:    'Vendo productos',
      icon:     'fa-box',
      variant:  'primary',
      desc:     'Tenés un negocio, local o tienda donde vendés artículos físicos o digitales. Tus clientes te preguntan precios, disponibilidad y cómo comprar.',
      ejemplos: 'Kiosco, ferretería, ropa, panadería, verdulería, electrónica.',
    },
    {
      key:      'servicios',
      title:    'Ofrezco servicios',
      icon:     'fa-hands-helping',
      variant:  'info',
      desc:     'Tu trabajo es lo que hacés, no lo que vendés. Tus clientes te contratan por tu tiempo, habilidad o conocimiento.',
      ejemplos: 'Plomero, psicólogo, peluquería, clases particulares, diseñador, médico.',
    },
    {
      key:      'ambas',
      title:    'Vendo productos y ofrezco servicios',
      icon:     'fa-layer-group',
      variant:  'success',
      desc:     'Tu actividad combina las dos cosas. Vendés productos Y también prestás servicios relacionados.',
      ejemplos: 'Óptica que vende lentes y hace medición de vista, centro de estética que vende cosméticos y da tratamientos, taller que vende repuestos y hace reparaciones.',
    },
  ];

  const cards = {};

  opciones.forEach(op => {
    const content = document.createElement('div');
    content.className = 'te-card-content';
    content.innerHTML = `
      <p class="te-card-desc">${op.desc}</p>
      <p class="te-card-ejemplos"><strong>Ejemplos:</strong> ${op.ejemplos}</p>
    `;

    const card = createCard({
      title:      op.title,
      icon:       op.icon,
      variant:    op.variant,
      selectable: true,
      selected:   selected === op.key,
      content,
    });

    cards[op.key] = card;
    cardsContainer.appendChild(card);
  });

  // ── Texto de ayuda ───────────────────────────────────────
  const ayuda = document.createElement('p');
  ayuda.className = 'te-ayuda';
  ayuda.textContent = '¿No estás seguro? Elegí la que más se parece a tu actividad principal. Siempre podés cambiarlo después.';
  page.appendChild(ayuda);

  // ── Lógica de selección exclusiva ───────────────────────
  cardsContainer.addEventListener('click', () => {
    setTimeout(() => {
      // Solo una puede estar activa
      let active = null;
      Object.entries(cards).forEach(([key, card]) => {
        if (card.isSelected()) active = key;
      });

      // Si ninguna quedó activa, restaurar la anterior
      if (!active) {
        if (selected) cards[selected].select();
        showToast('Seleccioná una opción para continuar', 'warning');
        return;
      }

      // Desactivar las otras
      Object.entries(cards).forEach(([key, card]) => {
        if (key !== active && card.isSelected()) card.deselect?.();
      });

      selected = active;
      document.dispatchEvent(new Event('change'));
    }, 0);
  });

  // ── Snapshot para dirty check ────────────────────────────
  const snapshot = { selected: state.selected };

  const dirtyController = {
    hasUnsavedChanges: () => selected !== snapshot.selected,
    markSaved: () => { snapshot.selected = selected; }
  };

  // ── Botón ────────────────────────────────────────────────
  const btn = createOnboardingButton({
    stepName: 'tipo-entidad',

    validate: () => !!selected,

    getLabel: () => {
      if (!selected) return 'Seleccioná una opción para continuar';
      if (state.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      if (state.isEditMode) return 'Guardar y volver al dashboard';
      return 'Continuar';
    },

    dirtyController: state.isEditMode ? dirtyController : undefined,

    onSave: async ({ uid }) => {
      const offerType = {
        productos: selected === 'productos' || selected === 'ambas',
        servicios: selected === 'servicios' || selected === 'ambas',
      };

      const entityType = selected === 'servicios' ? 'prestador' : 'comercio';

      // Guarda en usuarios — comercio todavía no existe
      await updateDoc(doc(db, 'usuarios', uid), {
        entityType,
        offerType,
        'onboardingSteps.tipo-entidad': true,
      });

      return { success: true, stepMarked: true };
    },

    onSuccess: () => {
      const msgs = {
        productos: 'Vas a configurar tu negocio de productos',
        servicios: 'Vas a configurar tu perfil de servicios',
        ambas:     'Vas a configurar productos y servicios',
      };
      showToast(msgs[selected] || 'Configuración guardada', 'success');
    },

    onError: (err) => {
      console.error('[tipo-entidad] onSave ERROR:', err);
      showToast('Error al guardar la configuración', 'error');
    }
  });

  page.appendChild(btn);
}
