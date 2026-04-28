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
  const capacidades = ctx.userData?.capacidades || [];
  const isEditMode  = window.isEditMode === true;

  // ── Reconstruir selectedOffer desde entityType + capacidades ──
  let selectedOffer = null;
  if (entityType === 'profesional') selectedOffer = 'profesional';
  else if (entityType === 'prestador') selectedOffer = 'servicios';
  else if (entityType === 'comercio') selectedOffer = 'productos';

  // ── Capacidades extras seleccionadas ──────────────────────
  // En upgradeMode: qué tiene y qué le falta
  const tieneProductos = entityType === 'comercio' || capacidades.includes('productos');
  const tieneServicios = entityType === 'prestador' || capacidades.includes('servicios');

  const upgradeMode = isEditMode && !!entityType;

  return {
    entityType,
    capacidades,
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

  let selectedOffer = state.selectedOffer;

  // Capacidades extras seleccionadas (set mutable)
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
      entityType: 'comercio',
      title:    'Vendo productos',
      icon:     'fa-box',
      variant:  'primary',
      desc:     'Tenés un negocio, local o tienda donde vendés artículos físicos o digitales.',
      ejemplos: 'Kiosco, ferretería, ropa, panadería, verdulería, electrónica.',
      disabled: state.upgradeMode, // en upgradeMode no se puede cambiar el tipo principal
    },
    {
      key:      'servicios',
      entityType: 'prestador',
      title:    'Ofrezco servicios',
      icon:     'fa-hands-helping',
      variant:  'info',
      desc:     'Tu trabajo es lo que hacés, no lo que vendés. Tus clientes te contratan por tu tiempo, habilidad o conocimiento.',
      ejemplos: 'Plomero, manicura, peluquería, profe particular, electricista.',
      disabled: state.upgradeMode,
    },
    {
      key:      'profesional',
      entityType: 'profesional',
      title:    'Soy profesional matriculado',
      icon:     'fa-user-md',
      variant:  'warning',
      desc:     'Ejercés una profesión con título universitario y matrícula habilitante.',
      ejemplos: 'Médico, odontólogo, psicólogo, kinesiólogo, abogado, contador, arquitecto, veterinario.',
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

      selectedOffer = active;

      // Mostrar/ocultar capacidades según tipo seleccionado
      actualizarCapacidades(selectedOffer, capacidadesContainer, selectedCapacidades);

      document.dispatchEvent(new Event('change'));
    }, 0);
  });

  // ============================================================
  // PREGUNTA 2 — Capacidades extras (opcional)
  // ============================================================
  const capacidadesContainer = document.createElement("div");
  capacidadesContainer.className = "te-capacidades";
  page.appendChild(capacidadesContainer);

  // Render inicial
  actualizarCapacidades(selectedOffer, capacidadesContainer, selectedCapacidades);

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
    capacidades: JSON.stringify([...selectedCapacidades].sort()),
  };

  const dirtyController = {
    hasUnsavedChanges: () =>
      selectedOffer !== snapshot.selectedOffer ||
      JSON.stringify([...selectedCapacidades].sort()) !== snapshot.capacidades,
    markSaved: () => {
      snapshot.selectedOffer = selectedOffer;
      snapshot.capacidades   = JSON.stringify([...selectedCapacidades].sort());
    }
  };

  // ── Label dinámico ────────────────────────────────────────
  function getLabel() {
    if (!selectedOffer) return 'Seleccioná una opción para continuar';
    if (state.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
    if (state.isEditMode) return 'Guardar y continuar';
    return 'Continuar';
  }

  // ── Botón ─────────────────────────────────────────────────
  const btn = createOnboardingButton({
    stepName: 'tipo-entidad',

    validate: () => !!selectedOffer,

    getLabel,

    dirtyController: state.isEditMode ? dirtyController : undefined,

    onSave: async ({ uid, comercioId }) => {
      // entityType: string simple derivado de la selección principal
      const entityType =
        selectedOffer === 'profesional' ? 'profesional' :
        selectedOffer === 'servicios'   ? 'prestador'   :
                                         'comercio';

      // capacidades: array de extras
      const capacidades = [...selectedCapacidades];

      // Guardar en usuarios
      await updateDoc(doc(db, 'usuarios', uid), {
        entityType,
        capacidades,
        'onboardingSteps.tipo-entidad': true,
      });

      // Guardar en entidad si ya existe
      if (comercioId) {
        await updateDoc(doc(db, 'entidades', comercioId), {
          entityType,
          capacidades,
        });
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
// CAPACIDADES EXTRAS
// Muestra opciones adicionales según el tipo principal elegido.
// ============================================================
function actualizarCapacidades(selectedOffer, container, selectedCapacidades) {
  container.innerHTML = '';

  if (!selectedOffer) return;

  // Qué capacidades extras tiene sentido ofrecer según el tipo principal
  const opcionesExtras = {
    productos:    [{ key: 'servicios', label: 'También ofrezco servicios', icon: 'fa-hands-helping', desc: 'Agregá servicios a tu comercio. Ej: instalación, reparación, asesoramiento.' }],
    servicios:    [{ key: 'productos', label: 'También vendo productos',   icon: 'fa-box',           desc: 'Vendé productos además de tus servicios. Ej: insumos, materiales, kits.' }],
    profesional:  [{ key: 'productos', label: 'También vendo productos',   icon: 'fa-box',           desc: 'Vendé productos relacionados a tu profesión. Ej: libros, kits, materiales.' }],
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
        if (card.isSelected?.()) {
          selectedCapacidades.add(op.key);
        } else {
          selectedCapacidades.delete(op.key);
        }
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
