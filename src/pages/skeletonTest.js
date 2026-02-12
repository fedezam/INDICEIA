// pages/ia-config/ia-config.js
import './skeletonTest.css';
import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createButton } from '../skeleton/components/button/index.js';
import { createCard } from '../skeleton/components/card/index.js';
import { showToast } from '../skeleton/components/toast/index.js';

// Firebase
import { db } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';

// ==================== DATOS ESTÁTICOS ====================
const IDIOMAS = [
  { value: 'es-AR', label: 'Español (Argentina)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'pt-BR', label: 'Português (Brasil)' }
];

const TONOS = [
  { value: 'informal', label: 'Informal' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'formal', label: 'Formal' }
];

const PERSONALIDADES = [
  { value: 'amigable', label: 'Amigable' },
  { value: 'formal', label: 'Formal' },
  { value: 'vendedor', label: 'Vendedor' }
];

// ==================== HELPERS ====================
function getDefaultAIConfig() {
  return {
    aiName: '',
    aiLanguage: 'es-AR',
    aiPersonality: '',
    aiTone: '',
    aiGreeting: '',
    sinPrecio: '',
    sinStock: '',
    localCerrado: '',
    proactividad: '',
    formatoRespuestas: ''
  };
}

// ==================== PÁGINA ====================
const iaConfigPage = {
  fields: {},
  greetingPreview: null,
  guardarBtn: null,

  aiConfig: {},

  async load(ctx) {
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.currentUser = ctx.currentUser;
    this.currentComercioId = ctx.currentComercioId;

    this.aiConfig = this.comercioData.aiConfig || getDefaultAIConfig();
  },

  render() {
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2><i class="fas fa-robot"></i> Configuración de IA</h2>
      <p>Personalizá el nombre, personalidad, saludo y reglas básicas de comportamiento</p>
    `;
    page.appendChild(header);

    // Intro
    page.appendChild(createCard({
      title: 'Tu asistente virtual',
      icon: 'fa-brain',
      variant: 'info',
      highlight: true,
      content:
        'Acá definís quién es tu asistente y cómo se comunica. La inteligencia avanzada y la forma en que toma decisiones se configuran más adelante.',
      compact: true
    }));

    // Config básica
    page.appendChild(this.renderBasicConfig());

    // Saludo
    page.appendChild(this.renderGreeting());

    // Comportamiento
    page.appendChild(this.renderBehaviors());

    // Botón Guardar
    this.guardarBtn = createButton({
      label: 'Guardar Configuración',
      icon: 'fa-save',
      variant: 'success',
      size: 'lg',
      block: true,
      onClick: () => this.handleGuardar()
    });

    const btnContainer = document.createElement('div');
    btnContainer.style.margin = '40px 15px 20px';
    btnContainer.appendChild(this.guardarBtn);
    page.appendChild(btnContainer);

    this.validateForm();
  },

  renderBasicConfig() {
    const content = document.createElement('div');

    this.fields.aiName = createFormField({
      label: 'Nombre de la IA',
      name: 'aiName',
      type: 'text',
      required: true,
      placeholder: 'Ej: JuancaBot, Sofi Asistente',
      value: this.aiConfig.aiName || ''
    });

    this.fields.aiLanguage = createFormField({
      label: 'Idioma',
      name: 'aiLanguage',
      type: 'select',
      required: true,
      options: IDIOMAS
    });
    this.fields.aiLanguage.input.value = this.aiConfig.aiLanguage || 'es-AR';

    this.fields.aiPersonality = createFormField({
      label: 'Personalidad',
      name: 'aiPersonality',
      type: 'select',
      required: true,
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        ...PERSONALIDADES
      ]
    });
    this.fields.aiPersonality.input.value = this.aiConfig.aiPersonality || '';

    this.fields.aiTone = createFormField({
      label: 'Tono de comunicación',
      name: 'aiTone',
      type: 'select',
      required: true,
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        ...TONOS
      ]
    });
    this.fields.aiTone.input.value = this.aiConfig.aiTone || '';

    content.append(
      this.fields.aiName,
      this.fields.aiLanguage,
      this.fields.aiPersonality,
      this.fields.aiTone
    );

    return createCard({
      title: 'Configuración Básica',
      icon: 'fa-sliders-h',
      content
    });
  },

  renderGreeting() {
    const content = document.createElement('div');

    this.fields.aiGreeting = createFormField({
      label: 'Saludo inicial',
      name: 'aiGreeting',
      type: 'textarea',
      required: true,
      rows: 4,
      placeholder: 'Ej: ¡Hola! Soy JuancaBot, ¿en qué te puedo ayudar?',
      value: this.aiConfig.aiGreeting || ''
    });

    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'greeting-preview-wrapper';

    const previewLabel = document.createElement('span');
    previewLabel.className = 'preview-label';
    previewLabel.textContent = 'Vista previa:';

    this.greetingPreview = document.createElement('div');
    this.greetingPreview.className = 'greeting-preview';
    this.greetingPreview.textContent = this.aiConfig.aiGreeting || '';

    previewWrapper.append(previewLabel, this.greetingPreview);

    this.fields.aiGreeting.input.addEventListener('input', () => {
      const val = this.fields.aiGreeting.input.value.trim();
      this.greetingPreview.textContent = val || 'Tu saludo aparecerá aquí...';
      this.validateForm();
    });

    content.append(this.fields.aiGreeting, previewWrapper);

    return createCard({
      title: 'Saludo Inicial',
      icon: 'fa-comment-dots',
      content
    });
  },

  renderBehaviors() {
    const content = document.createElement('div');

    this.fields.proactividad = createFormField({
      label: 'Nivel de proactividad',
      name: 'proactividad',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'bajo', label: 'Bajo' },
        { value: 'medio', label: 'Medio' },
        { value: 'alto', label: 'Alto' }
      ],
      helpText:
        'Define cuánto toma la iniciativa la IA (sugerencias, recordatorios, etc.).',
      value: this.aiConfig.proactividad || ''
    });

    this.fields.formatoRespuestas = createFormField({
      label: 'Formato de respuestas',
      name: 'formatoRespuestas',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'cortas', label: 'Cortas' },
        { value: 'detalladas', label: 'Detalladas' }
      ],
      helpText:
        'Elegí si preferís respuestas breves o más explicativas.',
      value: this.aiConfig.formatoRespuestas || ''
    });

    this.fields.sinPrecio = createFormField({
      label: 'Si no hay precio',
      name: 'sinPrecio',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar', label: 'Informar que no hay precio' },
        { value: 'consultar', label: 'Pedir consulta al dueño' }
      ],
      value: this.aiConfig.sinPrecio || ''
    });

    this.fields.sinStock = createFormField({
      label: 'Si no hay stock',
      name: 'sinStock',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar', label: 'Informar que no hay stock' },
        { value: 'ofrecerAlternativa', label: 'Ofrecer alternativa similar' }
      ],
      value: this.aiConfig.sinStock || ''
    });

    this.fields.localCerrado = createFormField({
      label: 'Si el local está cerrado',
      name: 'localCerrado',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar', label: 'Informar horario' },
        { value: 'tomarMensaje', label: 'Tomar mensaje' }
      ],
      value: this.aiConfig.localCerrado || ''
    });

    content.append(
      this.fields.proactividad,
      this.fields.formatoRespuestas,
      this.fields.sinPrecio,
      this.fields.sinStock,
      this.fields.localCerrado
    );

    return createCard({
      title: 'Comportamiento básico',
      icon: 'fa-cogs',
      content
    });
  },

  validateForm() {
    const required = ['aiName', 'aiPersonality', 'aiTone', 'aiGreeting'];
    const valid = required.every(id => this.fields[id]?.input.value.trim());
    if (this.guardarBtn) valid ? this.guardarBtn.enable() : this.guardarBtn.disable();
    return valid;
  },

  async handleGuardar() {
    if (!this.validateForm()) {
      showToast({
        title: 'Faltan datos',
        message: 'Completá los campos requeridos',
        variant: 'warning'
      });
      return;
    }

    this.guardarBtn.setLoading(true);

    try {
      const aiConfig = {
        aiName: this.fields.aiName.input.value.trim(),
        aiLanguage: this.fields.aiLanguage.input.value,
        aiPersonality: this.fields.aiPersonality.input.value,
        aiTone: this.fields.aiTone.input.value,
        aiGreeting: this.fields.aiGreeting.input.value.trim(),
        sinPrecio: this.fields.sinPrecio.input.value,
        sinStock: this.fields.sinStock.input.value,
        localCerrado: this.fields.localCerrado.input.value,
        proactividad: this.fields.proactividad.input.value,
        formatoRespuestas: this.fields.formatoRespuestas.input.value
      };

      await updateDoc(doc(db, 'comercios', this.currentComercioId), {
        aiConfig,
        'onboardingSteps.ia-config': true,
        fechaActualizacion: new Date()
      });

      showToast({
        title: 'Guardado',
        message: 'Configuración actualizada correctamente',
        variant: 'success'
      });

      setTimeout(() => (window.location.href = '/dashboard.html'), 800);
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Error',
        message: 'No se pudo guardar: ' + err.message,
        variant: 'error'
      });
    } finally {
      this.guardarBtn.setLoading(false);
    }
  }
};

// RUN
runSkeleton({
  page: iaConfigPage,
  adapter: createFirebaseAdapter,
  options: { debug: true }
});
