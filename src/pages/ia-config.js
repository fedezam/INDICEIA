// ============================================================
// src/pages/ia-config/ia-config.js
// ============================================================

import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { cleanPayload }           from '/src/skeleton/utils/cleanPayload.js';
import { db }                     from '/src/services/firebase/firebase.js';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './ia-config.css';

// ============================================================
// DATOS ESTÁTICOS
// ============================================================
const IDIOMAS = [
  { value: 'es-AR', label: 'Español (Argentina)' },
  { value: 'es-ES', label: 'Español (España)'    },
  { value: 'es-MX', label: 'Español (México)'    },
  { value: 'en-US', label: 'English (US)'         },
  { value: 'pt-BR', label: 'Português (Brasil)'  }
];

const PERSONALIDADES = [
  { value: '',         label: 'Seleccionar', disabled: true, hidden: true },
  { value: 'amigable', label: 'Amigable' },
  { value: 'formal',   label: 'Formal'   },
  { value: 'vendedor', label: 'Vendedor'  }
];

const TONOS = [
  { value: '',         label: 'Seleccionar', disabled: true, hidden: true },
  { value: 'informal', label: 'Informal' },
  { value: 'neutral',  label: 'Neutral'  },
  { value: 'formal',   label: 'Formal'   }
];

// ============================================================
// PÁGINA
// ============================================================
const page = {
  fields: {},
  greetingPreview: null,
  _aiConfig: {},

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    const raw = ctx.comercioData?.aiConfig || {};

    // Normaliza estructura — soporta legacy plano y nueva estructura anidada
    this._aiConfig = {
      identidad: {
        nombre:       raw.identidad?.nombre       || raw.aiName        || '',
        idioma:       raw.identidad?.idioma        || raw.aiLanguage    || 'es-AR',
        personalidad: raw.identidad?.personalidad  || raw.aiPersonality || '',
        tono:         raw.identidad?.tono          || raw.aiTone        || '',
        saludo:       raw.identidad?.saludo        || raw.aiGreeting    || ''
      },
      comportamiento: {
        proactividad:      raw.comportamiento?.proactividad      || raw.proactividad      || '',
        formatoRespuestas: raw.comportamiento?.formatoRespuestas || raw.formatoRespuestas || ''
      },
      contingencias: {
        sinPrecio:    raw.contingencias?.sinPrecio    || raw.sinPrecio    || '',
        sinStock:     raw.contingencias?.sinStock     || raw.sinStock     || '',
        localCerrado: raw.contingencias?.localCerrado || raw.localCerrado || ''
      }
    };
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-robot"></i> Configuración de IA</h1>
      <p class="page-subtitle">Personalizá el nombre, personalidad y reglas básicas de tu asistente</p>
    `;
    root.appendChild(header);

    root.appendChild(createCard({
      title:     'Tu asistente virtual',
      icon:      'fa-brain',
      variant:   'info',
      highlight: true,
      compact:   true,
      content:   'Acá definís quién es tu asistente y cómo se comunica. Las capacidades avanzadas se configuran por separado.'
    }));

    root.appendChild(this._renderIdentidadCard());
    root.appendChild(this._renderComportamientoCard());
    root.appendChild(this._renderContingenciasCard());
    root.appendChild(this._renderSaveButton());
  },

  // ──────────────────────────────────────────────────────────
  // IDENTIDAD
  // ──────────────────────────────────────────────────────────
  _renderIdentidadCard() {
    const container = document.createElement('div');
    const id = this._aiConfig.identidad;

    this.fields.nombre = createFormField({
      id: 'aiName', label: 'Nombre de la IA',
      placeholder: 'Ej: JuancaBot, Sofi Asistente',
      required: true, value: id.nombre
    });

    this.fields.idioma = createFormField({
      id: 'aiLanguage', label: 'Idioma',
      type: 'select', options: IDIOMAS, value: id.idioma
    });

    this.fields.personalidad = createFormField({
      id: 'aiPersonality', label: 'Personalidad',
      type: 'select', options: PERSONALIDADES,
      required: true, value: id.personalidad
    });

    this.fields.tono = createFormField({
      id: 'aiTone', label: 'Tono de comunicación',
      type: 'select', options: TONOS,
      required: true, value: id.tono
    });

    this.fields.saludo = createFormField({
      id: 'aiGreeting', label: 'Saludo inicial',
      type: 'textarea', rows: 4,
      required: true, maxLength: 200,
      placeholder: 'Ej: ¡Hola! Soy JuancaBot, ¿en qué te puedo ayudar?',
      value: id.saludo
    });

    this.greetingPreview = document.createElement('div');
    this.greetingPreview.className = 'ia-greeting-preview';
    this.greetingPreview.textContent = id.saludo || 'Tu saludo aparecerá aquí...';

    this.fields.saludo.input.addEventListener('input', (e) => {
      this.greetingPreview.textContent = e.target.value || 'Tu saludo aparecerá aquí...';
    });

    container.append(
      this.fields.nombre,
      this.fields.idioma,
      this.fields.personalidad,
      this.fields.tono,
      this.fields.saludo,
      this.greetingPreview
    );

    return createCard({ title: 'Identidad', icon: 'fa-id-card', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // COMPORTAMIENTO
  // ──────────────────────────────────────────────────────────
  _renderComportamientoCard() {
    const container = document.createElement('div');
    container.className = 'ia-grid';
    const c = this._aiConfig.comportamiento;

    this.fields.proactividad = createFormField({
      id: 'proactividad', label: 'Nivel de proactividad',
      type: 'select',
      helpText: 'Define cuánto toma la iniciativa la IA.',
      options: [
        { value: '',      label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'bajo',  label: 'Bajo'  },
        { value: 'medio', label: 'Medio' },
        { value: 'alto',  label: 'Alto'  }
      ],
      value: c.proactividad
    });

    this.fields.formatoRespuestas = createFormField({
      id: 'formatoRespuestas', label: 'Formato de respuestas',
      type: 'select',
      helpText: 'Respuestas breves o más explicativas.',
      options: [
        { value: '',           label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'cortas',     label: 'Cortas'      },
        { value: 'detalladas', label: 'Detalladas'  }
      ],
      value: c.formatoRespuestas
    });

    container.append(this.fields.proactividad, this.fields.formatoRespuestas);

    return createCard({ title: 'Comportamiento', icon: 'fa-sliders-h', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // CONTINGENCIAS
  // ──────────────────────────────────────────────────────────
  _renderContingenciasCard() {
    const container = document.createElement('div');
    container.className = 'ia-grid';
    const c = this._aiConfig.contingencias;

    this.fields.sinPrecio = createFormField({
      id: 'sinPrecio', label: 'Si no hay precio',
      type: 'select',
      options: [
        { value: '',          label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar',  label: 'Informar que no hay precio' },
        { value: 'consultar', label: 'Pedir consulta al dueño'    }
      ],
      value: c.sinPrecio
    });

    this.fields.sinStock = createFormField({
      id: 'sinStock', label: 'Si no hay stock',
      type: 'select',
      options: [
        { value: '',                   label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar',           label: 'Informar que no hay stock'   },
        { value: 'ofrecerAlternativa', label: 'Ofrecer alternativa similar' }
      ],
      value: c.sinStock
    });

    this.fields.localCerrado = createFormField({
      id: 'localCerrado', label: 'Si el local está cerrado',
      type: 'select',
      options: [
        { value: '',             label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar',     label: 'Informar horario' },
        { value: 'tomarMensaje', label: 'Tomar mensaje'    }
      ],
      value: c.localCerrado
    });

    container.append(this.fields.sinPrecio, this.fields.sinStock, this.fields.localCerrado);

    return createCard({ title: 'Contingencias', icon: 'fa-exclamation-triangle', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    return createOnboardingButton({
      stepName: 'ia-config',

      validate: () => {
        const required = ['nombre', 'personalidad', 'tono', 'saludo'];
        return required.every(k => this.fields[k]?.input.value.trim());
      },

      onSave: async ({ comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId');

        const v = (id) => document.getElementById(id)?.value || '';

        const raw = {
          aiConfig: {
            identidad: {
              nombre:       v('aiName'),
              idioma:       v('aiLanguage'),
              personalidad: v('aiPersonality'),
              tono:         v('aiTone'),
              saludo:       v('aiGreeting')
            },
            comportamiento: {
              proactividad:      v('proactividad'),
              formatoRespuestas: v('formatoRespuestas')
            },
            contingencias: {
              sinPrecio:    v('sinPrecio'),
              sinStock:     v('sinStock'),
              localCerrado: v('localCerrado')
            }
          }
        };

        // cleanPayload elimina vacíos antes de persistir
        await updateDoc(doc(db, 'comercios', comercioId), {
          ...cleanPayload(raw),
          fechaActualizacion: serverTimestamp()
        });

        return { success: true, stepMarked: false };
      },

      onSuccess: () => showToast('Guardado', 'Configuración actualizada correctamente', 'success'),

      onError: (err) => {
        console.error('[ia-config] Error guardando:', err);
        showToast('Error', 'No se pudo guardar la configuración', 'error');
      },

      redirectTo: '/dashboard.html'
    });
  },

  // ──────────────────────────────────────────────────────────
  // DIRTY STATE
  // ──────────────────────────────────────────────────────────
  getCurrentData() {
    const v = (id) => document.getElementById(id)?.value || '';
    return structuredClone({
      nombre:            v('aiName'),
      idioma:            v('aiLanguage'),
      personalidad:      v('aiPersonality'),
      tono:              v('aiTone'),
      saludo:            v('aiGreeting'),
      proactividad:      v('proactividad'),
      formatoRespuestas: v('formatoRespuestas'),
      sinPrecio:         v('sinPrecio'),
      sinStock:          v('sinStock'),
      localCerrado:      v('localCerrado')
    });
  },

  isFormValid() {
    const required = ['nombre', 'personalidad', 'tono', 'saludo'];
    return required.every(k => this.fields[k]?.input.value.trim());
  }
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando configuración IA...' }
});
