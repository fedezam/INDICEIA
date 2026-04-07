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
  const entityType  = ctx.userData?.entityType  || null;
  const offerType   = ctx.userData?.offerType   || {};
  const serviceType = ctx.userData?.serviceType || null;
  const isEditMode = window.isEditMode === true;

  // ── Qué tiene actualmente ──────────────────────────────
  const tieneProductos = offerType.productos === true;
  const tieneServicios = offerType.servicios  === true;

  let selectedOffer = null;
  if (entityType === 'profesional') {
    selectedOffer = 'profesional';
  } else if (entityType) {
    if (tieneProductos && tieneServicios) selectedOffer = 'ambas';
    else if (tieneProductos)             selectedOffer = 'productos';
    else if (tieneServicios)             selectedOffer = 'servicios';
  }

  // ── Modo upgrade: tiene solo uno de los dos ────────────
  // upgradeMode = true cuando está en edit y tiene solo productos o solo servicios
  // En ese caso limitamos las opciones disponibles
  const upgradeMode = isEditMode && (tieneProductos !== tieneServicios); // XOR

  return {
    selectedOffer,
    serviceType,
    isEditMode,
    tieneProductos,
    tieneServicios,
    upgradeMode,
  };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById("skeleton-page");
  page.innerHTML = "";

  let selectedOffer   = state.selectedOffer;
  let selectedService = state.serviceType;

  // ── Header ──────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "te-header";

  if (state.upgradeMode) {
    header.innerHTML = `
      <h1>Expandí tu negocio</h1>
      <p class="te-subtitle">
        ${state.tieneProductos
          ? 'Actualmente vendés productos. Podés agregar servicios para ofrecer más a tus clientes.'
          : 'Actualmente ofrecés servicios. Podés agregar productos a tu catálogo.'
        }
      </p>
    `;
  } else {
    header.innerHTML = `
      <h1>¿A qué te dedicás?</h1>
      <p class="te-subtitle">Elegí la opción que mejor describe tu actividad. Esto define cómo va a funcionar tu asistente.</p>
    `;
  }
  page.appendChild(header);

  const labelQ1 = document.createElement("p");
  labelQ1.className = "te-label";
  labelQ1.textContent = state.upgradeMode
    ? "¿Qué querés agregar?"
    : "¿Qué hacés principalmente?";
  page.appendChild(labelQ1);

  const cardsQ1 = document.createElement("div");
  cardsQ1.className = "te-cards";
  page.appendChild(cardsQ1);

  // ── Definir opciones y cuáles están deshabilitadas ──────
  // En upgradeMode solo "ambas" está disponible
  const opcionesQ1 = [
    {
      key:      'productos',
      title:    'Vendo productos',
      icon:     'fa-box',
      variant:  'primary',
      desc:     'Tenés un negocio, local o tienda donde vendés artículos físicos o digitales. Tus clientes te preguntan precios, disponibilidad y cómo comprar.',
      ejemplos: 'Kiosco, ferretería, ropa, panadería, verdulería, electrónica.',
      // En upgradeMode: deshabilitado (ya lo tiene, o no aplica)
      disabled: state.upgradeMode,
    },
    {
      key:      'servicios',
      title:    'Ofrezco servicios',
      icon:     'fa-hands-helping',
      variant:  'info',
      desc:     'Tu trabajo es lo que hacés, no lo que vendés. Tus clientes te contratan por tu tiempo, habilidad o conocimiento.',
      ejemplos: 'Plomero, manicura, peluquería, profe particular, electricista.',
      // En upgradeMode: deshabilitado (ya lo tiene, o no aplica)
      disabled: state.upgradeMode,
    },
    {
      key:      'ambas',
      title:    state.tieneProductos ? 'Vendo productos + ofrezco servicios' : 'Vendo productos + ofrezco servicios',
      icon:     'fa-layer-group',
      variant:  'success',
      desc:     state.upgradeMode
        ? (state.tieneProductos
            ? 'Vas a mantener tus productos y agregar servicios a tu negocio.'
            : 'Vas a mantener tus servicios y agregar productos a tu catálogo.')
        : 'Tu actividad combina las dos cosas. Vendés productos Y también prestás servicios relacionados.',
      ejemplos: state.upgradeMode
        ? (state.tieneProductos
            ? 'Óptica que vende lentes y hace medición, taller que vende repuestos y hace reparaciones.'
            : 'Estética que da tratamientos y vende cosméticos.')
        : 'Óptica que vende lentes y hace medición, estética que vende cosméticos y da tratamientos, taller que vende repuestos y hace reparaciones.',
      disabled: false, // siempre disponible
    },
    {
      key:      'profesional',
      title:    'Soy profesional matriculado',
      icon:     'fa-user-md',
      variant:  'warning',
      desc:     'Ejercés una profesión con título universitario y matrícula habilitante. Tus clientes o pacientes buscan tus credenciales, especialidad, cobertura y disponibilidad.',
      ejemplos: 'Médico, odontólogo, psicólogo, kinesiólogo, abogado, contador, arquitecto, veterinario.',
      // En upgradeMode: deshabilitado (cambio de entidad no permitido desde acá)
      disabled: state.upgradeMode,
    },
  ];

  const cardsQ1Map = {};

  opcionesQ1.forEach(op => {
    const content = document.createElement('div');
    content.innerHTML = `
      <p class="te-card-desc">${op.desc}</p>
      <p class="te-card-ejemplos"><strong>Ejemplos:</strong> ${op.ejemplos}</p>
    `;

    const card = createCard({
      title:      op.title,
      icon:       op.icon,
      variant:    op.disabled ? null : op.variant,
      selectable: !op.disabled,
      selected:   selectedOffer === op.key,
      flat:       op.disabled,
      content,
    });

    // Estilo visual de deshabilitado
    if (op.disabled) {
      card.style.opacity = '0.45';
      card.style.pointerEvents = 'none';
      card.style.cursor = 'not-allowed';
    }

    cardsQ1Map[op.key] = card;
    cardsQ1.appendChild(card);
  });

  // ── Pregunta 2 — tipo de servicio ───────────────────────
  // Solo aplica si el usuario elige servicios o ambas
  // En upgradeMode con tieneServicios ya completo, no hace falta
  const needsQ2Initial = selectedOffer === 'servicios' || selectedOffer === 'ambas';
  const q2AlreadyDone  = state.upgradeMode && state.tieneServicios; // ya tenía servicios configurados

  const q2Container = document.createElement("div");
  q2Container.className = "te-q2";
  q2Container.style.display = (needsQ2Initial && !q2AlreadyDone) ? 'block' : 'none';
  page.appendChild(q2Container);

  function renderQ2() {
    q2Container.innerHTML = "";

    const labelQ2 = document.createElement("p");
    labelQ2.className = "te-label";
    labelQ2.textContent = "¿Qué tipo de servicio ofrecés?";
    q2Container.appendChild(labelQ2);

    const cardsQ2 = document.createElement("div");
    cardsQ2.className = "te-cards";
    q2Container.appendChild(cardsQ2);

    const contentOficio = document.createElement('div');
    contentOficio.innerHTML = `
      <p class="te-card-desc">Realizás un trabajo manual o actividad práctica. No necesitás título universitario para ejercerlo. Tus clientes te contactan para que vayas a su casa o para ir a tu local.</p>
      <p class="te-card-ejemplos"><strong>Ejemplos:</strong> Plomero, electricista, manicura, peluquero, profe particular, fotógrafo, cocinero.</p>
    `;

    const cardOficio = createCard({
      title:      'Oficio o servicio',
      icon:       'fa-tools',
      variant:    'info',
      selectable: true,
      selected:   selectedService === 'oficio',
      content:    contentOficio,
    });

    cardsQ2.appendChild(cardOficio);

    cardOficio.addEventListener('click', () => {
      setTimeout(() => {
        selectedService = cardOficio.isSelected() ? 'oficio' : null;
        document.dispatchEvent(new Event('change'));
      }, 0);
    });

    return { cardOficio };
  }

  let q2Refs = renderQ2();

  // ── Texto ayuda ──────────────────────────────────────────
  if (!state.upgradeMode) {
    const ayuda = document.createElement('p');
    ayuda.className = 'te-ayuda';
    ayuda.textContent = '¿No estás seguro? Elegí la que más se parece a tu actividad principal. Siempre podés cambiarlo después.';
    page.appendChild(ayuda);
  }

  // ── Lógica selección Q1 ──────────────────────────────────
  cardsQ1.addEventListener('click', () => {
    setTimeout(() => {
      let active = null;
      Object.entries(cardsQ1Map).forEach(([key, card]) => {
        if (card.isSelected?.()) active = key;
      });

      if (!active) {
        if (selectedOffer) cardsQ1Map[selectedOffer]?.select?.();
        showToast('Seleccioná una opción para continuar', 'warning');
        return;
      }

      Object.entries(cardsQ1Map).forEach(([key, card]) => {
        if (key !== active) card.deselect?.();
      });

      selectedOffer = active;

      // Q2: mostrar solo si elige servicios/ambas Y no ya tiene servicios configurados
      const needsQ2 = (active === 'servicios' || active === 'ambas') && !q2AlreadyDone;
      q2Container.style.display = needsQ2 ? 'block' : 'none';

      if (!needsQ2) selectedService = state.tieneServicios ? state.serviceType : null;
      else q2Refs = renderQ2();

      document.dispatchEvent(new Event('change'));
    }, 0);
  });

  // ── Dirty check ──────────────────────────────────────────
  const snapshot = {
    selectedOffer:   state.selectedOffer,
    selectedService: state.serviceType,
  };

  const dirtyController = {
    hasUnsavedChanges: () =>
      selectedOffer !== snapshot.selectedOffer ||
      selectedService !== snapshot.selectedService,
    markSaved: () => {
      snapshot.selectedOffer   = selectedOffer;
      snapshot.selectedService = selectedService;
    }
  };

  // ── Label dinámico del botón ─────────────────────────────
  function getLabel() {
    if (!selectedOffer) return 'Seleccioná una opción para continuar';

    const needsService = (selectedOffer === 'servicios' || selectedOffer === 'ambas') && !q2AlreadyDone;
    if (needsService && !selectedService) return 'Seleccioná el tipo de servicio';

    // Modo upgrade: label descriptivo de la acción
    if (state.upgradeMode && selectedOffer === 'ambas') {
      if (state.tieneProductos && !state.tieneServicios) return 'Guardar y agregar servicios';
      if (state.tieneServicios && !state.tieneProductos) return 'Guardar y agregar productos';
    }

    if (state.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
    if (state.isEditMode) return 'Guardar y volver al dashboard';

    return 'Continuar';
  }

  // ── Botón ────────────────────────────────────────────────
  const btn = createOnboardingButton({
    stepName: 'tipo-entidad',

    validate: () => {
      if (!selectedOffer) return false;
      const needsService = (selectedOffer === 'servicios' || selectedOffer === 'ambas') && !q2AlreadyDone;
      if (needsService && !selectedService) return false;
      return true;
    },

    getLabel,

    dirtyController: state.isEditMode ? dirtyController : undefined,

    onSave: async ({ uid, comercioId }) => {
      const entityType = selectedOffer === 'profesional' ? 'profesional'
                       : selectedOffer === 'servicios'   ? 'prestador'
                       : 'comercio';

      const offerType = selectedOffer === 'profesional'
        ? { productos: false, servicios: true }
        : {
            productos: selectedOffer === 'productos' || selectedOffer === 'ambas',
            servicios: selectedOffer === 'servicios' || selectedOffer === 'ambas',
          };

      // El serviceType se mantiene si ya estaba configurado
      const finalServiceType = selectedService || state.serviceType || null;

      await updateDoc(doc(db, 'usuarios', uid), {
        entityType,
        offerType,
        serviceType:                    finalServiceType,
        'onboardingSteps.tipo-entidad': true,
      });

      if (comercioId) {
        await updateDoc(doc(db, 'entidades', comercioId), {
          entityType,
          offerType,
          serviceType: finalServiceType,
        });
      }

      return { success: true, stepMarked: true };
    },

    onSuccess: () => {
      const msgs = {
        productos:   'Configuración guardada',
        servicios:   'Configuración guardada',
        ambas:       state.tieneProductos
                       ? '¡Servicios agregados! Completá la configuración'
                       : '¡Productos agregados! Completá la configuración',
        profesional: 'Configuración guardada',
      };
      showToast(msgs[selectedOffer] || 'Configuración guardada', 'success');
    },

    onError: (err) => {
      console.error('[tipo-entidad] onSave ERROR:', err);
      showToast('Error al guardar la configuración', 'error');
    }
  });

  page.appendChild(btn);
}
