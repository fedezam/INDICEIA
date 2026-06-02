// ============================================================
// src/pages/tipo-entidad.js
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
  const entityType        = ctx.userData?.entityType        || null;
  const capacidades       = ctx.userData?.capacidades       || [];
  const modalidad_trabajo = ctx.userData?.modalidad_trabajo || null;
  const isEditMode        = window.isEditMode === true;

  let selectedOffer = null;
  if (entityType === 'profesional') selectedOffer = 'profesional';
  else if (entityType === 'prestador') selectedOffer = 'servicios';
  else if (entityType === 'comercio')  selectedOffer = 'productos';
  else if (entityType === 'soporte')   selectedOffer = 'soporte';   // ← soporte (no disponible en MVP)

  const tieneProductos = entityType === 'comercio'   || capacidades.includes('productos');
  const tieneServicios = entityType === 'prestador'  || capacidades.includes('servicios');
  const upgradeMode    = isEditMode && !!entityType;

  return {
    entityType,
    capacidades,
    modalidad_trabajo,
    selectedOffer,
    isEditMode,
    upgradeMode,
    tieneProductos,
    tieneServicios,
  };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById("skeleton-page");
  page.innerHTML = "";

  let selectedOffer       = state.selectedOffer;
  let modalidad_trabajo   = state.modalidad_trabajo;
  const selectedCapacidades = new Set(state.capacidades);

  // ── Header ────────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "te-header";
  header.innerHTML = state.upgradeMode
    ? `<h1>Expandí tu negocio</h1>
       <p class="te-subtitle">Podés agregar nuevas capacidades a tu entidad existente.</p>`
    : `<h1>¿A qué te dedicás?</h1>
       <p class="te-subtitle">Elegí la opción que mejor describe tu actividad principal. Esto define cómo va a funcionar tu asistente.</p>`;
  page.appendChild(header);

  // ============================================================
  // PREGUNTA 1 — Tipo principal
  // ============================================================
  const labelQ1 = document.createElement("p");
  labelQ1.className   = "te-label";
  labelQ1.textContent = state.upgradeMode ? "Tu actividad principal:" : "¿Qué hacés principalmente?";
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
      desc:     'Tenés un negocio, local o tienda donde vendés artículos físicos o digitales.',
      ejemplos: 'Kiosco, ferretería, ropa, panadería, verdulería, electrónica.',
      disabled: state.upgradeMode,
    },
    {
      key:      'servicios',
      title:    'Ofrezco servicios',
      icon:     'fa-hands-helping',
      variant:  'info',
      desc:     'Tu trabajo es lo que hacés, no lo que vendés. Tus clientes te contratan por tu tiempo, habilidad o conocimiento.',
      ejemplos: 'Plomero, manicura, peluquería, profe particular, electricista, estética.',
      disabled: state.upgradeMode,
    },
    {
      key:      'profesional',
      title:    'Soy profesional matriculado',
      icon:     'fa-user-md',
      variant:  'warning',
      desc:     'Ejercés una profesión con título universitario y matrícula habilitante.',
      ejemplos: 'Médico, odontólogo, psicólogo, kinesiólogo, abogado, contador, arquitecto, veterinario.',
      disabled: state.upgradeMode,
    },
    // ── SOPORTE — no disponible en MVP ────────────────────────
    // {
    //   key:      'soporte',
    //   title:    'Asistente de soporte',
    //   icon:     'fa-headset',
    //   variant:  'secondary',
    //   desc:     'Un asistente entrenado con tu documentación técnica para responder consultas de usuarios.',
    //   ejemplos: 'Soporte técnico, guías de uso, FAQs, manuales de producto.',
    //   disabled: state.upgradeMode,
    // },
    // ─────────────────────────────────────────────────────────
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

    if (op.disabled) {
      card.style.opacity       = '0.45';
      card.style.pointerEvents = 'none';
      card.style.cursor        = 'not-allowed';
    }

    cardsQ1Map[op.key] = card;
    cardsQ1.appendChild(card);
  });

  // ── Lógica selección Q1 ───────────────────────────────────
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

      if (active !== 'servicios') modalidad_trabajo = null;

      selectedOffer = active;

      actualizarCapacidades(
        selectedOffer,
        capacidadesContainer,
        selectedCapacidades,
        (val) => { modalidad_trabajo = val; },
        modalidad_trabajo,
      );

      document.dispatchEvent(new Event('change'));
    }, 0);
  });

  // ============================================================
  // PREGUNTA 2 — Modalidad + Capacidades extras
  // ============================================================
  const capacidadesContainer = document.createElement("div");
  capacidadesContainer.className = "te-capacidades";
  page.appendChild(capacidadesContainer);

  actualizarCapacidades(
    selectedOffer,
    capacidadesContainer,
    selectedCapacidades,
    (val) => { modalidad_trabajo = val; },
    modalidad_trabajo,
  );

  // ── Texto ayuda ───────────────────────────────────────────
  if (!state.upgradeMode) {
    const ayuda = document.createElement('p');
    ayuda.className   = 'te-ayuda';
    ayuda.textContent = '¿No estás seguro? Elegí la que más se parece a tu actividad principal. Siempre podés agregar más después.';
    page.appendChild(ayuda);
  }

  // ── Dirty check ───────────────────────────────────────────
  const snapshot = {
    selectedOffer,
    modalidad_trabajo:  state.modalidad_trabajo,
    capacidades:        JSON.stringify([...selectedCapacidades].sort()),
  };

  const dirtyController = {
    hasUnsavedChanges: () =>
      selectedOffer     !== snapshot.selectedOffer     ||
      modalidad_trabajo !== snapshot.modalidad_trabajo ||
      JSON.stringify([...selectedCapacidades].sort()) !== snapshot.capacidades,
    markSaved: () => {
      snapshot.selectedOffer     = selectedOffer;
      snapshot.modalidad_trabajo = modalidad_trabajo;
      snapshot.capacidades       = JSON.stringify([...selectedCapacidades].sort());
    }
  };

  // ── Label dinámico ────────────────────────────────────────
  function getLabel() {
    if (!selectedOffer) return 'Seleccioná una opción para continuar';
    if (selectedOffer === 'servicios' && !modalidad_trabajo) return 'Indicá cómo trabajás para continuar';
    if (state.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
    if (state.isEditMode) return 'Guardar y continuar';
    return 'Continuar';
  }

  // ── Botón ─────────────────────────────────────────────────
  const btn = createOnboardingButton({
    stepName: 'tipo-entidad',

    validate: () => {
      if (!selectedOffer) return false;
      if (selectedOffer === 'servicios' && !modalidad_trabajo) return false;
      return true;
    },

    getLabel,

    dirtyController: state.isEditMode ? dirtyController : undefined,

    onSave: async ({ uid, comercioId }) => {
      const entityType =
        selectedOffer === 'profesional' ? 'profesional' :
        selectedOffer === 'servicios'   ? 'prestador'   :
        // selectedOffer === 'soporte'  ? 'soporte'    :   // ← soporte (no disponible en MVP)
                                          'comercio';

      const capacidades = [...selectedCapacidades];

      const userUpdates = {
        entityType,
        capacidades,
        'onboardingSteps.tipo-entidad': true,
      };

      if (entityType === 'prestador' && modalidad_trabajo === 'local') {
        userUpdates.modalidad_trabajo = 'local';
      } else if (entityType === 'prestador') {
        userUpdates.modalidad_trabajo = null;
      }

      await updateDoc(doc(db, 'usuarios', uid), userUpdates);

      if (comercioId) {
        const entidadUpdates = { entityType, capacidades };
        if (entityType === 'prestador' && modalidad_trabajo === 'local') {
          entidadUpdates.modalidad_trabajo = 'local';
        } else if (entityType === 'prestador') {
          entidadUpdates.modalidad_trabajo = null;
        }
        await updateDoc(doc(db, 'entidades', comercioId), entidadUpdates);
      }

      return { success: true, stepMarked: true };
    },

    onSuccess: () => showToast('Configuración guardada', 'success'),

    onError: (err) => {
      console.error('[tipo-entidad] onSave ERROR:', err);
      showToast('Error al guardar la configuración', 'error');
    }
  });

  page.appendChild(btn);
}

// ============================================================
// CAPACIDADES + MODALIDAD DE TRABAJO
// ============================================================
function actualizarCapacidades(selectedOffer, container, selectedCapacidades, onModalidadChange, modalidadActual) {
  container.innerHTML = '';

  if (!selectedOffer) return;

  // ── Pregunta de modalidad — solo para prestadores ─────────
  if (selectedOffer === 'servicios') {
    const labelModalidad = document.createElement('p');
    labelModalidad.className   = 'te-label';
    labelModalidad.textContent = '¿Cómo prestás tus servicios?';
    container.appendChild(labelModalidad);

    const cardsModalidad = document.createElement('div');
    cardsModalidad.className = 'te-cards';
    container.appendChild(cardsModalidad);

    const opcionesModalidad = [
      {
        value:    'local',
        title:    'Tengo local / taller / consultorio',
        icon:     'fa-store',
        variant:  'primary',
        desc:     'Mis clientes vienen a donde yo estoy.',
        ejemplos: 'Estética, mecánico, peluquería, reparación de PC, consultorio.',
      },
      {
        value:    null,
        title:    'Voy al lugar del cliente',
        icon:     'fa-route',
        variant:  'info',
        desc:     'Yo me desplazo al domicilio o lugar acordado.',
        ejemplos: 'Plomero, electricista, manicura a domicilio, profe particular.',
      },
    ];

    const modalidadCards = {};

    opcionesModalidad.forEach(op => {
      const content = document.createElement('div');
      content.innerHTML = `
        <p class="te-card-desc">${op.desc}</p>
        <p class="te-card-ejemplos"><strong>Ejemplos:</strong> ${op.ejemplos}</p>
      `;

      const preSelected = modalidadActual !== null
        ? (op.value === 'local' ? modalidadActual === 'local' : modalidadActual !== 'local')
        : false;

      const card = createCard({
        title:      op.title,
        icon:       op.icon,
        variant:    op.variant,
        selectable: true,
        selected:   preSelected,
        content,
      });

      modalidadCards[op.value ?? 'domicilio'] = card;
      cardsModalidad.appendChild(card);
    });

    cardsModalidad.addEventListener('click', () => {
      setTimeout(() => {
        let activeKey = null;
        Object.entries(modalidadCards).forEach(([key, card]) => {
          if (card.isSelected?.()) activeKey = key;
        });

        if (!activeKey) return;

        Object.entries(modalidadCards).forEach(([key, card]) => {
          if (key !== activeKey) card.deselect?.();
        });

        const valor = activeKey === 'local' ? 'local' : null;
        onModalidadChange(valor);
        document.dispatchEvent(new Event('change'));
      }, 0);
    });
  }

  // ── Capacidades extras ────────────────────────────────────
  const opcionesExtras = {
    productos:   [{ key: 'servicios', label: 'También ofrezco servicios', icon: 'fa-hands-helping', desc: 'Agregá servicios a tu comercio. Ej: instalación, reparación, asesoramiento.' }],
    servicios:   [{ key: 'productos', label: 'También vendo productos',   icon: 'fa-box',           desc: 'Vendé productos además de tus servicios. Ej: insumos, materiales, kits.' }],
    profesional: [{ key: 'productos', label: 'También vendo productos',   icon: 'fa-box',           desc: 'Vendé productos relacionados a tu profesión. Ej: libros, kits, materiales.' }],
    // soporte: [],   // ← sin capacidades extras por ahora (no disponible en MVP)
  };

  const extras = opcionesExtras[selectedOffer];
  if (!extras?.length) return;

  const label = document.createElement('p');
  label.className   = 'te-label';
  label.textContent = '¿Algo más? (opcional)';
  container.appendChild(label);

  const cards = document.createElement('div');
  cards.className = 'te-cards';
  container.appendChild(cards);

  extras.forEach(op => {
    const content = document.createElement('div');
    content.innerHTML = `<p class="te-card-desc">${op.desc}</p>`;

    const card = createCard({
      title:      op.label,
      icon:       op.icon,
      variant:    'success',
      selectable: true,
      selected:   selectedCapacidades.has(op.key),
      content,
    });

    card.addEventListener('click', () => {
      setTimeout(() => {
        if (card.isSelected?.()) selectedCapacidades.add(op.key);
        else selectedCapacidades.delete(op.key);
        document.dispatchEvent(new Event('change'));
      }, 0);
    });

    cards.appendChild(card);
  });

  const ayuda = document.createElement('p');
  ayuda.className   = 'te-ayuda-extra';
  ayuda.textContent = 'Podés agregar o quitar esto después desde tu panel.';
  container.appendChild(ayuda);
}
