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
  const serviceType = ctx.userData?.serviceType || null; // 'oficio' | 'profesional'
  const isEditMode  = ctx.isEditMode === true;

  // Derivar selección inicial
  let selectedOffer = null;
  if (entityType) {
    if (offerType.productos && offerType.servicios) selectedOffer = 'ambas';
    else if (offerType.productos)                   selectedOffer = 'productos';
    else if (offerType.servicios)                   selectedOffer = 'servicios';
  }

  return { selectedOffer, serviceType, isEditMode };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById("skeleton-page");
  page.innerHTML = "";

  // Estado mutable
  let selectedOffer   = state.selectedOffer;
  let selectedService = state.serviceType;

  // ── Header ──────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "te-header";
  header.innerHTML = `
    <h1>¿A qué te dedicás?</h1>
    <p class="te-subtitle">Elegí la opción que mejor describe tu actividad. Esto define cómo va a funcionar tu asistente.</p>
  `;
  page.appendChild(header);

  // ── Pregunta 1 — oferta ──────────────────────────────────
  const labelQ1 = document.createElement("p");
  labelQ1.className = "te-label";
  labelQ1.textContent = "¿Qué hacés principalmente?";
  page.appendChild(labelQ1);

  const cardsQ1 = document.createElement("div");
  cardsQ1.className = "te-cards";
  page.appendChild(cardsQ1);

  const opcionesQ1 = [
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
      ejemplos: 'Plomero, manicura, peluquería, profe particular, electricista.',
    },
    {
      key:      'ambas',
      title:    'Vendo productos y ofrezco servicios',
      icon:     'fa-layer-group',
      variant:  'success',
      desc:     'Tu actividad combina las dos cosas. Vendés productos Y también prestás servicios relacionados.',
      ejemplos: 'Óptica que vende lentes y hace medición, estética que vende cosméticos y da tratamientos, taller que vende repuestos y hace reparaciones.',
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
      variant:    op.variant,
      selectable: true,
      selected:   selectedOffer === op.key,
      content,
    });

    cardsQ1Map[op.key] = card;
    cardsQ1.appendChild(card);
  });

  // ── Pregunta 2 — tipo de servicio (condicional) ──────────
  const q2Container = document.createElement("div");
  q2Container.className = "te-q2";
  q2Container.style.display = (selectedOffer === 'servicios' || selectedOffer === 'ambas') ? 'block' : 'none';
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

    // Card oficio
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

    // Card profesional — próximamente
    const contentProfesional = document.createElement('div');
    contentProfesional.innerHTML = `
      <span class="te-badge-soon">Próximamente</span>
      <p class="te-card-desc">Ejercés una profesión regulada con título universitario y/o matrícula. Tus clientes esperan ver tus credenciales y especialidades.</p>
      <p class="te-card-ejemplos"><strong>Ejemplos:</strong> Médico, abogado, contador, psicólogo, arquitecto, odontólogo.</p>
    `;

    const cardProfesional = createCard({
      title:   'Profesional con título',
      icon:    'fa-user-graduate',
      variant: 'warning',
      content: contentProfesional,
    });
    cardProfesional.classList.add('te-card-disabled');

    cardsQ2.appendChild(cardOficio);
    cardsQ2.appendChild(cardProfesional);

    // Selección Q2 — solo oficio es clickeable
    cardOficio.addEventListener('click', () => {
      setTimeout(() => {
        selectedService = cardOficio.isSelected() ? 'oficio' : null;
        document.dispatchEvent(new Event('change'));
      }, 0);
    });

    // Profesional — click muestra aviso
    cardProfesional.addEventListener('click', () => {
      showToast('Próximamente', 'Esta opción estará disponible muy pronto', 'info');
    });

    return { cardOficio };
  }

  let q2Refs = renderQ2();

  // ── Texto ayuda ──────────────────────────────────────────
  const ayuda = document.createElement('p');
  ayuda.className = 'te-ayuda';
  ayuda.textContent = '¿No estás seguro? Elegí la que más se parece a tu actividad principal. Siempre podés cambiarlo después.';
  page.appendChild(ayuda);

  // ── Lógica selección Q1 — exclusiva ─────────────────────
  cardsQ1.addEventListener('click', () => {
    setTimeout(() => {
      let active = null;
      Object.entries(cardsQ1Map).forEach(([key, card]) => {
        if (card.isSelected()) active = key;
      });

      if (!active) {
        if (selectedOffer) cardsQ1Map[selectedOffer].select();
        showToast('Seleccioná una opción para continuar', 'warning');
        return;
      }

      // Deseleccionar las otras
      Object.entries(cardsQ1Map).forEach(([key, card]) => {
        if (key !== active) card.deselect();
      });

      selectedOffer = active;

      // Mostrar/ocultar Q2
      const needsQ2 = active === 'servicios' || active === 'ambas';
      q2Container.style.display = needsQ2 ? 'block' : 'none';

      if (!needsQ2) selectedService = null;
      else q2Refs = renderQ2();

      document.dispatchEvent(new Event('change'));
    }, 0);
  });

  // ── Snapshot para dirty check ────────────────────────────
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

  // ── Botón ────────────────────────────────────────────────
  const btn = createOnboardingButton({
    stepName: 'tipo-entidad',

    validate: () => {
      if (!selectedOffer) return false;
      // Si tiene servicios, necesita también elegir el tipo
      const needsService = selectedOffer === 'servicios' || selectedOffer === 'ambas';
      if (needsService && !selectedService) return false;
      return true;
    },

    getLabel: () => {
      if (!selectedOffer) return 'Seleccioná una opción para continuar';
      const needsService = selectedOffer === 'servicios' || selectedOffer === 'ambas';
      if (needsService && !selectedService) return 'Seleccioná el tipo de servicio';
      if (state.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      if (state.isEditMode) return 'Guardar y volver al dashboard';
      return 'Continuar';
    },

    dirtyController: state.isEditMode ? dirtyController : undefined,

    onSave: async ({ uid, comercioId }) => {
      const offerType = {
        productos: selectedOffer === 'productos' || selectedOffer === 'ambas',
        servicios: selectedOffer === 'servicios' || selectedOffer === 'ambas',
      };

      const entityType = selectedOffer === 'servicios' ? 'prestador' : 'comercio';

      await updateDoc(doc(db, 'usuarios', uid), {
        entityType,
        offerType,
        serviceType: selectedService || null,
        'onboardingSteps.tipo-entidad': true,
      });

      if (comercioId) {
        await updateDoc(doc(db, 'entidades', comercioId), {
          entityType,
          offerType,
          serviceType: selectedService || null,
        });
      }

      return { success: true, stepMarked: true };
    },
    onSuccess: () => {
      const msgs = {
        productos: 'Vas a configurar tu negocio de productos',
        servicios: 'Vas a configurar tu perfil de servicios',
        ambas:     'Vas a configurar productos y servicios',
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
