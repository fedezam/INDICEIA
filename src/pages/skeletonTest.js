// pages/ia-config/ia-config.js
import './ia-config.css';
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

const COGNITIVE_CAPABILITIES = {
  basico: [
    {
      id: 'examples_simple',
      title: 'Dar ejemplos simples',
      icon: 'fa-lightbulb',
      description: 'Usa ejemplos fáciles y de todos los días para que el cliente entienda rápido. Ej: "Es como cuando vas al supermercado y pedís algo parecido a esto..."'
    },
    {
      id: 'anticipate_common_questions',
      title: 'Anticipar preguntas comunes',
      icon: 'fa-question-circle',
      description: 'Responde dudas típicas antes de que las pregunten. Ej: Si preguntan por un producto, ya dice "sí tiene garantía de 6 meses" o "el envío tarda 2-4 días".'
    }
  ],
  recomendado: [
    {
      id: 'explain_implicit_services',
      title: 'Explicar servicios aunque no estén escritos al pie de la letra',
      icon: 'fa-comment-alt',
      description: 'Da ejemplos, analogías y explica beneficios reales de forma natural y convincente.'
    },
    {
      id: 'domain_knowledge',
      title: 'Conocer el rubro y el contexto de tu negocio',
      icon: 'fa-store',
      description: 'Entiende cómo funciona tu industria (precios habituales, temporadas altas, competencia, etc.) sin que tengas que explicárselo todo cada vez.'
    },
    {
      id: 'causal_explanations',
      title: 'Explicar el “por qué” de las recomendaciones',
      icon: 'fa-balance-scale',
      description: 'No solo dice “comprá esto”, sino que cuenta por qué conviene. Ej: “es más barato a largo plazo porque dura más”.'
    }
  ],
  avanzado: [
    {
      id: 'infer_missing_details',
      title: 'Inferir necesidades aunque no lo digan directamente',
      icon: 'fa-search',
      description: 'Deduce qué busca el cliente según lo que pregunta. Ej: Pregunta por algo barato → entiende que quiere ahorrar y sugiere opciones reales sin asumir.'
    },
    {
      id: 'contextual_adaptation',
      title: 'Adaptarse al tono y momento de la charla',
      icon: 'fa-user-friends',
      description: 'Habla más relajado con chicos, más formal con mayores, detecta si está apurado o dudando y ajusta el estilo.'
    },
    {
      id: 'guided_suggestions',
      title: 'Sugerir próximos pasos o alternativas lógicas',
      icon: 'fa-arrow-right',
      description: 'Propone qué hacer después o qué otra cosa podría gustarle. Ej: “Si este no te convence por el precio, mirá este que es parecido pero más económico”.'
    }
  ]
};

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

function getDefaultAICognition() {
  return {
    level: 'basico',
    capabilities: {}
  };
}

// ==================== PÁGINA ====================
const iaConfigPage = {
  fields: {},
  levelCards: [],
  capabilityCheckboxes: {},
  greetingPreview: null,
  guardarBtn: null,

  aiConfig: {},
  aiCognition: {},

  async load(ctx) {
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.currentUser = ctx.currentUser;
    this.currentComercioId = ctx.currentComercioId;

    this.aiConfig = this.comercioData.aiConfig || getDefaultAIConfig();
    this.aiCognition = this.comercioData.aiCognition || getDefaultAICognition();
  },

  render() {
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2><i class="fas fa-robot"></i> Configuración de IA</h2>
      <p>Personalizá cómo piensa y se comporta tu asistente</p>
    `;
    page.appendChild(header);

    // AI Helper Card
    page.appendChild(this.renderAIHelper());

    // Config Básica
    page.appendChild(this.renderBasicConfig());

    // Saludo
    page.appendChild(this.renderGreeting());

    // Comportamiento
    page.appendChild(this.renderBehaviors());

    // Nivel Cognitivo
    page.appendChild(this.renderCognitiveLevel());

    // Capacidades (siempre visibles las 3 secciones)
    page.appendChild(this.renderCapabilities());

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
    btnContainer.style.marginTop = '40px';
    btnContainer.style.padding = '0 15px';
    btnContainer.appendChild(this.guardarBtn);
    page.appendChild(btnContainer);

    this.validateForm();
  },

  renderAIHelper() {
    return createCard({
      title: 'Cómo piensa tu IA',
      icon: 'fa-brain',
      variant: 'info',
      highlight: true,
      content: 'Elegí qué tan inteligente querés que sea tu asistente. A mayor nivel cognitivo, mejor entenderá y ayudará a tus clientes.',
      compact: true
    });
  },

  renderBasicConfig() {
    const content = document.createElement('div');

    this.fields.aiName = createFormField({
      label: 'Nombre de la IA',
      name: 'aiName',
      type: 'text',
      required: true,
      placeholder: 'Ej: Asistente Virtual',
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
      placeholder: 'Ej: ¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy? 😊',
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
      title: 'Saludo',
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
      helpText: 'Define cuánto toma la iniciativa la IA sin que el cliente lo pida explícitamente.'
    });
    this.fields.proactividad.input.value = this.aiConfig.proactividad || '';

    this.fields.formatoRespuestas = createFormField({
      label: 'Formato de respuestas',
      name: 'formatoRespuestas',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'cortas', label: 'Cortas' },
        { value: 'detalladas', label: 'Detalladas' }
      ],
      helpText: 'Elige si preferís respuestas rápidas y directas o más completas y detalladas.'
    });
    this.fields.formatoRespuestas.input.value = this.aiConfig.formatoRespuestas || '';

    this.fields.sinPrecio = createFormField({
      label: 'Si no hay precio',
      name: 'sinPrecio',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar', label: 'Informar' },
        { value: 'consultar', label: 'Pedir consulta' }
      ],
      helpText: 'Qué debe hacer la IA cuando un cliente pregunta por un precio que no está cargado.'
    });
    this.fields.sinPrecio.input.value = this.aiConfig.sinPrecio || '';

    this.fields.sinStock = createFormField({
      label: 'Si no hay stock',
      name: 'sinStock',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar', label: 'Informar' },
        { value: 'ofrecerAlternativa', label: 'Ofrecer alternativa' }
      ],
      helpText: 'Cómo reaccionar cuando un producto está sin stock en el momento de la consulta.'
    });
    this.fields.sinStock.input.value = this.aiConfig.sinStock || '';

    this.fields.localCerrado = createFormField({
      label: 'Si el local está cerrado',
      name: 'localCerrado',
      type: 'select',
      options: [
        { value: '', label: 'Seleccionar', disabled: true, hidden: true },
        { value: 'informar', label: 'Informar horario' },
        { value: 'tomarMensaje', label: 'Tomar mensaje' }
      ],
      helpText: 'Qué responder cuando el cliente quiere comprar fuera del horario de atención.'
    });
    this.fields.localCerrado.input.value = this.aiConfig.localCerrado || '';

    content.append(
      this.fields.proactividad,
      this.fields.formatoRespuestas,
      this.fields.sinPrecio,
      this.fields.sinStock,
      this.fields.localCerrado
    );

    return createCard({
      title: 'Comportamiento',
      icon: 'fa-cogs',
      content
    });
  },

  renderCognitiveLevel() {
    const content = document.createElement('div');

    const desc = document.createElement('p');
    desc.className = 'capabilities-description';
    desc.textContent = 'Seleccioná el nivel de inteligencia base de tu asistente (esto guía las recomendaciones, pero podés activar capacidades de cualquier nivel):';
    content.appendChild(desc);

    const grid = document.createElement('div');
    grid.className = 'levels-grid'; // asumiendo que tenés grid en css skeleton o agregás

    const levels = [
      { id: 'basico', label: 'Básico', icon: 'fa-star', desc: 'Respuestas simples y directas', caps: 2 },
      { id: 'recomendado', label: 'Recomendado', icon: 'fa-star-half-alt', desc: 'Entiende contexto y anticipa necesidades', caps: 3, recommended: true },
      { id: 'avanzado', label: 'Avanzado', icon: 'fa-brain', desc: 'Máxima inteligencia y adaptación', caps: 3 }
    ];

    levels.forEach(lvl => {
      const cardContent = document.createElement('div');
      cardContent.innerHTML = `
        <p>${lvl.desc}</p>
        <small>${lvl.caps} capacidades</small>
        ${lvl.recommended ? '<span class="recommended-badge">⭐ Recomendado</span>' : ''}
      `;

      const card = createCard({
        title: lvl.label,
        icon: lvl.icon,
        content: cardContent,
        selectable: true,
        selected: this.aiCognition.level === lvl.id,
        compact: true,
        variant: lvl.recommended ? 'success' : null
      });

      card.dataset.level = lvl.id;

      card.addEventListener('card-select', e => {
        if (e.detail.selected) {
          this.aiCognition.level = lvl.id;
          this.levelCards.forEach(c => { if (c !== card) c.deselect(); });
        }
      });

      this.levelCards.push(card);
      grid.appendChild(card);
    });

    content.appendChild(grid);

    return createCard({
      title: 'Nivel Cognitivo',
      icon: 'fa-graduation-cap',
      content,
      highlight: true
    });
  },

  renderCapabilities() {
    const content = document.createElement('div');

    const desc = document.createElement('p');
    desc.className = 'capabilities-description';
    desc.textContent = 'Activá las que querés que tu asistente use para entender mejor a tus clientes y ayudar más. No cambian lo que vendés, solo cómo lo explica y sugiere.';
    content.appendChild(desc);

    Object.entries(COGNITIVE_CAPABILITIES).forEach(([level, caps]) => {
      const group = document.createElement('div');
      group.className = `capability-group ${level}`;

      const header = document.createElement('div');
      header.className = 'group-header';

      const icons = {
        basico: 'fa-star',
        recomendado: 'fa-star-half-alt',
        avanzado: 'fa-brain'
      };

      header.innerHTML = `
        <i class="fas ${icons[level]}"></i>
        <span>Nivel ${level.charAt(0).toUpperCase() + level.slice(1)}</span>
        ${level === 'recomendado' ? '<span class="recommended-badge">Recomendado</span>' : ''}
      `;

      group.appendChild(header);

      const list = document.createElement('div');
      list.className = 'capabilities-list';

      caps.forEach(cap => {
        const item = document.createElement('div');
        item.className = 'capability-item';

        const checkbox = createFormField({
          label: '', // label vacío porque lo ponemos manual
          name: `cap_${cap.id}`,
          type: 'checkbox',
          value: !!this.aiCognition.capabilities?.[cap.id]
        });

        const labelWrap = document.createElement('label');
        labelWrap.innerHTML = `
          <span class="capability-title"><i class="fas ${cap.icon}"></i> ${cap.title}</span>
          <span class="capability-description">${cap.description}</span>
        `;

        item.append(checkbox, labelWrap);
        list.appendChild(item);

        checkbox.input.addEventListener('change', e => {
          if (!this.aiCognition.capabilities) this.aiCognition.capabilities = {};
          if (e.target.checked) {
            this.aiCognition.capabilities[cap.id] = true;
          } else {
            delete this.aiCognition.capabilities[cap.id];
          }
        });
      });

      group.appendChild(list);
      content.appendChild(group);
    });

    const note = document.createElement('div');
    note.className = 'capabilities-note';
    note.innerHTML = `
      💡 Si no activás ninguna de estas capacidades, la IA funciona perfectamente bien: responde de forma correcta, educada y rápida.<br>
      Estas opciones solo la hacen más inteligente y útil para cerrar ventas o resolver dudas complicadas.
    `;
    content.appendChild(note);

    return createCard({
      title: 'Capacidades de la IA',
      icon: 'fa-puzzle-piece',
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
      showToast({ title: 'Faltan datos', message: 'Completá los campos requeridos', variant: 'warning' });
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
        aiCognition: this.aiCognition,
        'onboardingSteps.ia-config': true,
        fechaActualizacion: new Date()
      });

      showToast({ title: 'Guardado', message: 'Configuración actualizada', variant: 'success' });

      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 800);

    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'No se pudo guardar: ' + err.message, variant: 'error' });
    } finally {
      this.guardarBtn.setLoading(false);
    }
  }
};

// ==================== RUN ====================
runSkeleton({
  page: iaConfigPage,
  adapter: createFirebaseAdapter,
  options: { debug: true }
});
