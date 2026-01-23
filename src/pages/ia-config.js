// src/pages/ia-config.js
// ==================== IA CONFIG + COGNITIVE PERMISSIONS ====================

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './ia-config.css';

// ==================== FIREBASE ====================
import { db } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';

// ==================== UTILS ====================
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

// ==================== ESTADO LOCAL ====================
let aiConfig = {};
let aiCognition = {};

// ==================== HELPERS ====================
const $ = (id) => document.getElementById(id);

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

function setValue(id, value) {
  const el = $(id);
  if (el && value !== undefined && value !== null) {
    el.value = value;
  }
}

function getValue(id) {
  const el = $(id);
  return el ? el.value.trim() : '';
}

function setChecked(id, value) {
  const el = $(id);
  if (el) el.checked = Boolean(value);
}

function getChecked(id) {
  const el = $(id);
  return el ? el.checked : false;
}

// ==================== COGNITION ====================

const COGNITIVE_CAPABILITIES = {
  basico: [
    'examples_simple',
    'anticipate_common_questions'
  ],
  recomendado: [
    'explain_implicit_services',
    'domain_knowledge',
    'causal_explanations'
  ],
  avanzado: [
    'infer_missing_details',
    'contextual_adaptation',
    'guided_suggestions'
  ]
};

function loadCognitionToForm() {
  if (!aiCognition?.capabilities) return;

  Object.values(COGNITIVE_CAPABILITIES)
    .flat()
    .forEach(cap => {
      setChecked(`cap_${cap}`, aiCognition.capabilities[cap]);
    });

  if (aiCognition.level) {
    setValue('aiCognitionLevel', aiCognition.level);
  }
}

function getCognitionFromForm() {
  const level = getValue('aiCognitionLevel') || 'basico';
  const enabledCaps = {};

  Object.values(COGNITIVE_CAPABILITIES)
    .flat()
    .forEach(cap => {
      if (getChecked(`cap_${cap}`)) {
        enabledCaps[cap] = true;
      }
    });

  return {
    level,
    capabilities: enabledCaps
  };
}

// ==================== MÓDULO ====================
const iaConfigModule = {
  async load({ comercioData }) {
    aiConfig = comercioData.aiConfig || getDefaultAIConfig();
    aiCognition = comercioData.aiCognition || getDefaultAICognition();
  },

  render() {
    const container = document.querySelector('main .container');
    if (!container || !document.getElementById('aiName')) {
      setTimeout(() => this.render(), 100);
      return;
    }

    loadAIConfigToForm();
    loadCognitionToForm();
    setupEvents();
    insertAIHelperCard();
  },

  getCurrentData() {
    return {
      aiConfig: {
        aiName: getValue('aiName'),
        aiLanguage: getValue('aiLanguage'),
        aiPersonality: getValue('aiPersonality'),
        aiTone: getValue('aiTone'),
        aiGreeting: getValue('aiGreeting'),
        sinPrecio: getValue('sinPrecio'),
        sinStock: getValue('sinStock'),
        localCerrado: getValue('localCerrado'),
        proactividad: getValue('proactividad'),
        formatoRespuestas: getValue('formatoRespuestas')
      },
      aiCognition: getCognitionFromForm()
    };
  },

  async save({ currentComercioId }) {
    showLoading('Guardando configuración de IA...');

    await updateDoc(doc(db, 'comercios', currentComercioId), {
      aiConfig: this.getCurrentData().aiConfig,
      aiCognition: this.getCurrentData().aiCognition,
      'onboardingSteps.ia-config': true,
      fechaActualizacion: new Date()
    });

    hideLoading();
    showToast('Éxito', 'Configuración guardada correctamente', 'success');
  },

  isFormValid() {
    return ['aiName', 'aiPersonality', 'aiTone', 'aiGreeting']
      .every(id => getValue(id));
  }
};

// ==================== UI ====================

function loadAIConfigToForm() {
  Object.keys(getDefaultAIConfig()).forEach(k => {
    setValue(k, aiConfig[k]);
  });
}

function setupEvents() {
  const greetingField = $('aiGreeting');
  const greetingPreview = $('greetingPreview');

  if (greetingField && greetingPreview) {
    greetingField.addEventListener('input', () => {
      greetingPreview.textContent =
        greetingField.value.trim() || 'Tu saludo aparecerá aquí...';
    });
  }

  // 👇 AHORA SÍ: listeners cognitivos en el lugar correcto
  Object.values(COGNITIVE_CAPABILITIES)
    .flat()
    .forEach(cap => {
      const checkbox = $(`cap_${cap}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => {});
      }
    });

  const levelSelect = $('aiCognitionLevel');
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {});
  }
}

function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;

  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">AI</div>
    <div class="ai-helper-content">
      <h4>Cómo piensa tu IA</h4>
      <p>Elegí qué tan inteligente querés que sea tu asistente.</p>
    </div>
  `;
  container.insertBefore(card, container.firstChild);
}

// ==================== BOOT ====================
runDataPage(iaConfigModule);
