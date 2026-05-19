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
  _aiConfig: {},
  _nombreEntidad: '',
  _entityType: '',
  _tieneProductos: false,

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    const raw = ctx.comercioData?.aiConfig || {};

    this._nombreEntidad = ctx.comercioData?.nombre || '';
    this._entityType    = ctx.comercioData?.entityType || 'comercio';

    const capacidades = ctx.comercioData?.capacidades || [];
    this._tieneProductos =
      this._entityType === 'comercio' ||
      capacidades.includes('productos');

    // Normaliza estructura — soporta legacy plano y nueva estructura anidada
    this._aiConfig = {
      identidad: {
        nombre:        raw.identidad?.nombre       || raw.aiName        || '',
        idioma:        raw.identidad?.idioma        || raw.aiLanguage    || 'es-AR',
        personalidad:  raw.identidad?.personalidad  || raw.aiPersonality || '',
        tono:          raw.identidad?.tono          || raw.aiTone        || '',
        saludoPrefix:  raw.identidad?.saludoPrefix  || ''
      },
      comportamiento: {
        proactividad:      raw.comportamiento?.proactividad      || raw.proactividad      || '',
        formatoRespuestas: raw.comportamiento?.formatoRespuestas || raw.formatoRespuestas || ''
      },
      contingencias: {
        sinPrecio:    raw.contingencias?.sinPrecio    || raw.sinPrecio    || '',
        sinStock:     raw.contingencias?.sinStock     || raw.sinStock     || '',
        localCerrado: raw.contingencias?.localCerrado || raw.localCerrado || ''
      },
      contexto: {
        global_ai_context: raw.contexto?.global_ai_context || [] // ← NEW
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
    root.appendChild(this._renderContextoCard()); // ← NEW
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

    const saludoField = this._renderSaludoPartido(id.saludoPrefix);
    this.fields.saludoPartido = saludoField;

    container.append(
      this.fields.nombre,
      this.fields.idioma,
      this.fields.personalidad,
      this.fields.tono,
      saludoField.wrapper
    );

    return createCard({ title: 'Identidad', icon: 'fa-id-card', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // SALUDO PARTIDO
  // [ prefijo editable ] [ nombre — locked ] [ sufijo negocio — locked ]
  // ──────────────────────────────────────────────────────────
  _renderSaludoPartido(saludoPrefixValue = '') {
    const nombreIA = this._aiConfig.identidad.nombre;

    const sufijo = this._nombreEntidad
      ? `, el asistente de ${this._nombreEntidad}`
      : '';

    if (!saludoPrefixValue) {
      saludoPrefixValue = '¡Hola! Soy';
    }

    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field';

    const label = document.createElement('label');
    label.className = 's-label';
    label.htmlFor = 'aiSaludoPrefix';
    label.textContent = 'Saludo inicial';

    const help = document.createElement('small');
    help.className = 's-help';
    help.textContent = 'Editá el saludo. El nombre de tu asistente se incluye automáticamente.';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'aiSaludoPrefix';
    input.className = 's-input ia-saludo-prefix';
    input.placeholder = '¡Hola! Soy';
    input.maxLength = 80;
    input.value = saludoPrefixValue;

    const nombreChip = document.createElement('span');
    nombreChip.className = 'ia-saludo-locked ia-saludo-nombre';
    nombreChip.textContent = nombreIA || 'Tu asistente';

    const sufijoEl = document.createElement('span');
    sufijoEl.className = 'ia-saludo-locked ia-saludo-sufijo';
    sufijoEl.textContent = sufijo;

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 's-input-wrapper ia-saludo-wrapper';
    inputWrapper.append(input, nombreChip);
    if (sufijo) inputWrapper.appendChild(sufijoEl);

    const preview = document.createElement('div');
    preview.className = 'ia-greeting-preview';

    const updatePreview = () => {
      const prefix = input.value.trim() || '¡Hola! Soy';
      const name = this.fields.nombre?.input?.value.trim() || nombreIA || 'Tu asistente';
      preview.textContent = `${prefix} ${name}${sufijo}`;
    };
    updatePreview();

    input.addEventListener('input', updatePreview);

    if (this.fields.nombre?.input) {
      this.fields.nombre.input.addEventListener('input', () => {
        const newName = this.fields.nombre.input.value.trim();
        nombreChip.textContent = newName || 'Tu asistente';
        updatePreview();
      });
    }

    wrapper.append(label, inputWrapper, help, preview);

    return {
      wrapper,
      input,
      getValue: () => input.value.trim()
    };
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
  // CONTINGENCIAS — condicional según entityType
  // ──────────────────────────────────────────────────────────
  _renderContingenciasCard() {
    const container = document.createElement('div');
    container.className = 'ia-grid';
    const c = this._aiConfig.contingencias;

    // Todos los tipos: ¿qué hacer si no hay precio?
    this.fields.sinPrecio = createFormField({
      id: 'sinPrecio', label: 'Si no hay precio',
      type: 'select',
      helpText: 'Aplica a productos y servicios sin precio cargado.',
      options: [
        { value: '',          label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar',  label: 'Informar que no hay precio disponible' },
        { value: 'consultar', label: 'Pedir consulta al dueño' }
      ],
      value: c.sinPrecio
    });

    container.appendChild(this.fields.sinPrecio);

    // Solo si tiene productos (comercio o prestador con productos)
    if (this._tieneProductos) {
      this.fields.sinStock = createFormField({
        id: 'sinStock', label: 'Si no hay stock',
        type: 'select',
        options: [
          { value: '',                   label: 'Seleccionar', disabled: true, hidden: true },
          { value: 'informar',           label: 'Informar que no hay stock' },
          { value: 'ofrecerAlternativa', label: 'Ofrecer alternativa similar' }
        ],
        value: c.sinStock
      });
      container.appendChild(this.fields.sinStock);
    }

    // Solo comercio
    if (this._entityType === 'comercio') {
      this.fields.localCerrado = createFormField({
        id: 'localCerrado', label: 'Si el local está cerrado',
        type: 'select',
        options: [
          { value: '',             label: 'Seleccionar', disabled: true, hidden: true },
          { value: 'informar',     label: 'Informar horario' },
          { value: 'tomarMensaje', label: 'Tomar mensaje' }
        ],
        value: c.localCerrado
      });
      container.appendChild(this.fields.localCerrado);
    }

    return createCard({ title: 'Contingencias', icon: 'fa-exclamation-triangle', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // ← NEW: CONTEXTO OPERATIVO GLOBAL
  // ──────────────────────────────────────────────────────────
  _renderContextoCard() {
    const container = document.createElement('div');
    const ctx = this._aiConfig.contexto;

    // Convertir array → string para el textarea
    const draftValue = ctx.global_ai_context?.join('\n') || '';

    this.fields.globalContext = createFormField({
      id: 'globalAiContext',
      label: 'Instrucciones generales para la IA',
      type: 'textarea',
      rows: 5,
      value: draftValue,
      helpText: 'Escribí una idea por línea. Estas reglas aplican a TODOS los servicios.\nEj:\n• Cada cuerpo responde de manera distinta\n• Los resultados dependen de hábitos y constancia\n• La edad y genética influyen en los tiempos',
      actions: {
        onChange: (v) => {
          // string → array limpio, sin vacíos
          const lines = v.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            this._aiConfig.contexto.global_ai_context = lines;
          } else {
            delete this._aiConfig.contexto.global_ai_context;
          }
        }
      }
    });

    container.appendChild(this.fields.globalContext);

    return createCard({
      title: 'Contexto operativo',
      icon: 'fa-compass',
      variant: 'secondary',
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    return createOnboardingButton({
      stepName: 'ia-config',

      validate: () => {
        const requiredFields = ['nombre', 'personalidad', 'tono'];
        const fieldsOk = requiredFields.every(k => this.fields[k]?.input.value.trim());
        const saludoOk = this.fields.saludoPartido?.getValue().length > 0;
        console.log('[ia-config] validate:', {
          nombre:       this.fields.nombre?.input?.value,
          personalidad: this.fields.personalidad?.input?.value,
          tono:         this.fields.tono?.input?.value,
          saludo:       this.fields.saludoPartido?.getValue(),
          fieldsOk,
          saludoOk,
          result: fieldsOk && saludoOk
        });
        return fieldsOk && saludoOk;
      },

      onSave: async ({ comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId');

        const v = (id) => document.getElementById(id)?.value || '';

        // Contingencias — solo incluye los campos que aplican a este entityType
        const contingencias = {
          sinPrecio: v('sinPrecio') || ''
        };

        if (this._tieneProductos) {
          contingencias.sinStock = v('sinStock') || '';
        }

        if (this._entityType === 'comercio') {
          contingencias.localCerrado = v('localCerrado') || '';
        }

        // ← NEW: contexto global (solo si existe)
        const contexto = {};
        if (this._aiConfig.contexto?.global_ai_context?.length) {
          contexto.global_ai_context = this._aiConfig.contexto.global_ai_context;
        }

        const raw = {
          aiConfig: {
            identidad: {
              nombre:        v('aiName'),
              idioma:        v('aiLanguage'),
              personalidad:  v('aiPersonality'),
              tono:          v('aiTone'),
              saludoPrefix:  this.fields.saludoPartido?.getValue() || ''
            },
            comportamiento: {
              proactividad:      v('proactividad'),
              formatoRespuestas: v('formatoRespuestas')
            },
            contingencias,
            ...(Object.keys(contexto).length > 0 && { contexto }) // ← solo si hay datos
          }
        };

        await updateDoc(doc(db, 'entidades', comercioId), {
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
      saludoPrefix:      this.fields.saludoPartido?.getValue() || '',
      proactividad:      v('proactividad'),
      formatoRespuestas: v('formatoRespuestas'),
      sinPrecio:         v('sinPrecio'),
      sinStock:          v('sinStock'),
      localCerrado:      v('localCerrado'),
      globalContext:     this._aiConfig.contexto?.global_ai_context?.join('\n') || ''
    });
  },

  isFormValid() {
    const required = ['nombre', 'personalidad', 'tono'];
    const fieldsOk = required.every(k => this.fields[k]?.input.value.trim());
    const saludoOk = this.fields.saludoPartido?.getValue().length > 0;
    return fieldsOk && saludoOk;
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
