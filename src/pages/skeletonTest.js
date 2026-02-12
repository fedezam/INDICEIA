import './skeletonTest.css';

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createCard } from '../skeleton/components/card/index.js';
import { createButton } from '../skeleton/components/button/index.js';
import { showToast } from '../skeleton/components/toast/index.js';

import { db } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';

// ==================== DEFINICIÓN CANÓNICA ====================
// MATCH EXACTO con cognitive_permissions.schema.json
const COGNITIVE_PERMISSIONS = {
  explain_services: {
    label: 'Explicar servicios',
    description:
      'Usar conocimiento general para enriquecer descripciones escuetas o técnicas de servicios que ya existen en el catálogo.'
  },
  relate_catalog_items: {
    label: 'Relacionar productos o servicios',
    description:
      'Sugerir combinaciones lógicas entre ítems del catálogo real, basadas en conocimiento de dominio.'
  },
  infer_intent: {
    label: 'Inferir necesidades del cliente',
    description:
      'Deducir intenciones no explícitas a partir de las preguntas del cliente, para afinar la respuesta sin asumir.'
  },
  simplify_language: {
    label: 'Traducir lo técnico a simple',
    description:
      'Convertir jerga profesional o técnica en lenguaje cotidiano, usando analogías precisas y sin alterar hechos.'
  },
  compare_offered_options: {
    label: 'Comparar opciones',
    description:
      'Explicar diferencias funcionales entre productos o servicios REALES que ofrece el comercio.'
  },
  justify_recommendations: {
    label: 'Justificar recomendaciones',
    description:
      'Argumentar por qué una opción conviene, usando lógica causal basada en datos reales del catálogo.'
  },
  maintain_conversation_context: {
    label: 'Recordar contexto de la conversación',
    description:
      'Mantener coherencia durante la sesión, recordando temas previos sin salir del universo del comercio.'
  }
};

// ==================== PÁGINA ====================
const cognitionPage = {
  cognitiveState: {},
  checkboxes: {},

  async load(ctx) {
    this.ctx = ctx;
    this.currentComercioId = ctx.currentComercioId;
    this.comercioData = ctx.comercioData || {};

    // Universo LER: solo lo existente
    this.cognitiveState =
      this.comercioData.cognitive_permissions || {};
  },

  render() {
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2><i class="fas fa-brain"></i> Estado Cognitivo</h2>
      <p>Activá o desactivá las capacidades cognitivas de la entidad</p>
    `;
    page.appendChild(header);

    // Card principal
    page.appendChild(
      createCard({
        title: 'Capacidades cognitivas',
        icon: 'fa-brain',
        content: this.renderCheckboxes()
      })
    );

    // Botón guardar
    const guardarBtn = createButton({
      label: 'Guardar estado cognitivo',
      icon: 'fa-save',
      variant: 'success',
      size: 'lg',
      block: true,
      onClick: () => this.handleGuardar()
    });

    const btnWrap = document.createElement('div');
    btnWrap.className = 'cognition-save';
    btnWrap.appendChild(guardarBtn);

    page.appendChild(btnWrap);
  },

  renderCheckboxes() {
    const wrapper = document.createElement('div');
    wrapper.className = 'cognition-list';

    Object.entries(COGNITIVE_PERMISSIONS).forEach(([key, def]) => {
      const row = document.createElement('label');
      row.className = 'cognition-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!this.cognitiveState[key]?.enabled;

      this.checkboxes[key] = checkbox;

      const text = document.createElement('div');
      text.className = 'cognition-text';
      text.innerHTML = `
        <strong>${def.label}</strong>
        <span>${def.description}</span>
      `;

      row.append(checkbox, text);
      wrapper.appendChild(row);
    });

    return wrapper;
  },

  async handleGuardar() {
    const cognitive_permissions = {};

    Object.entries(COGNITIVE_PERMISSIONS).forEach(([key, def]) => {
      if (this.checkboxes[key].checked) {
        cognitive_permissions[key] = {
          enabled: true,
          label: def.label,
          description: def.description
        };
      }
    });

    try {
      await updateDoc(
        doc(db, 'comercios', this.currentComercioId),
        {
          cognitive_permissions,
          fechaActualizacion: new Date()
        }
      );

      showToast({
        title: 'Guardado',
        message: 'Estado cognitivo actualizado',
        variant: 'success'
      });
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Error',
        message: err.message,
        variant: 'error'
      });
    }
  }
};

// RUN
runSkeleton({
  page: cognitionPage,
  adapter: createFirebaseAdapter
});
