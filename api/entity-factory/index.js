// src/pages/capacidadesCognitivas/capacidadesCognitivas.js

import './capacidadesCognitivas.css';

import { runSkeleton }          from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createCard }            from '../skeleton/components/card/index.js';
import { createCheckboxGroup }   from '../skeleton/components/checkbox-group/index.js';
import { createButton }          from '../skeleton/components/button/index.js';
import { showToast }             from '../skeleton/components/toast/index.js';

// ─── DEFINICIÓN CANÓNICA ────────────────────────────────────
const COGNITIVE_PERMISSIONS = {
  explain_services: {
    label: 'Explicar servicios',
    description: 'Usar conocimiento general para enriquecer descripciones escuetas o técnicas de servicios que ya existen en el catálogo.'
  },
  relate_catalog_items: {
    label: 'Relacionar productos o servicios',
    description: 'Sugerir combinaciones lógicas entre ítems del catálogo real, basadas en conocimiento de dominio.'
  },
  infer_intent: {
    label: 'Inferir necesidades del cliente',
    description: 'Deducir intenciones no explícitas a partir de las preguntas del cliente, para afinar la respuesta sin asumir.'
  },
  simplify_language: {
    label: 'Traducir lo técnico a simple',
    description: 'Convertir jerga profesional o técnica en lenguaje cotidiano, usando analogías precisas y sin alterar hechos.'
  },
  compare_offered_options: {
    label: 'Comparar opciones',
    description: 'Explicar diferencias funcionales entre productos o servicios REALES que ofrece el comercio.'
  },
  justify_recommendations: {
    label: 'Justificar recomendaciones',
    description: 'Argumentar por qué una opción conviene, usando lógica causal basada en datos reales del catálogo.'
  },
  maintain_conversation_context: {
    label: 'Recordar contexto de la conversación',
    description: 'Mantener coherencia durante la sesión, recordando temas previos sin salir del universo del comercio.'
  }
};

// ─── PÁGINA ─────────────────────────────────────────────────
const page = {

  async load(ctx) {
    this.ctx = ctx;
    this.cognitiveState = ctx.comercioData?.cognitive_permissions || {};
  },

  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    // ── Header ──
    const header = document.createElement('div');
    header.className = 'ec-header';
    header.innerHTML = `
      <h2><i class="fas fa-brain"></i> Capacidades Cognitivas</h2>
      <p class="ec-subtitle">Activá o desactivá las capacidades cognitivas de la entidad</p>
    `;
    root.appendChild(header);

    // ── Checkbox group ──
    this.checkboxGroup = createCheckboxGroup({
      name: 'cognitive_permissions',
      value: Object.keys(this.cognitiveState).filter(k => this.cognitiveState[k]?.enabled),
      options: Object.entries(COGNITIVE_PERMISSIONS).map(([key, def]) => ({
        value: key,
        label: def.label,
        description: def.description
      }))
    });

    // ── Card contenedora ──
    const card = createCard({
      title: 'Capacidades cognitivas',
      icon: 'fa-brain',
      content: this.checkboxGroup
    });
    root.appendChild(card);

    // ── Botón guardar ──
    const btn = createButton({
      label: 'Guardar capacidades cognitivas',
      icon: 'fa-save',
      variant: 'success',
      size: 'lg',
      block: true,
      onClick: () => this.handleGuardar()
    });

    const btnWrap = document.createElement('div');
    btnWrap.className = 'ec-save';
    btnWrap.appendChild(btn);
    root.appendChild(btnWrap);
  },

  async handleGuardar() {
    const selectedKeys = this.checkboxGroup.getValue();

    const cognitive_permissions = {};
    selectedKeys.forEach(key => {
      const def = COGNITIVE_PERMISSIONS[key];
      if (def) {
        cognitive_permissions[key] = {
          enabled: true,
          label: def.label,
          description: def.description
        };
      }
    });

    try {
      await this.ctx.persistence.updateData({ cognitive_permissions });

      showToast({
        title: 'Guardado',
        message: 'Capacidades cognitivas actualizadas',
        variant: 'success'
      });
    } catch (err) {
      console.error('[capacidadesCognitivas] Error al guardar:', err);
      showToast({
        title: 'Error',
        message: err.message,
        variant: 'error'
      });
    }
  }
};

// ─── BOOT ───────────────────────────────────────────────────
runSkeleton({
  page,
  adapter: createFirebaseAdapter
});
