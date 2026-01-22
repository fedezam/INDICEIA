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

  if (Object.keys(enabledCaps).length === 0) {
    return { level };
  }

  return {
    level,
    capabilities: enabledCaps
  };
}

// ==================== MÓDULO ====================
const iaConfigModule = {
  // 1️⃣ LOAD
  async load({ comercioData }) {
    aiConfig = comercioData.aiConfig || getDefaultAIConfig();
    aiCognition = comercioData.aiCognition || getDefaultAICognition();
    console.log('✅ IA + Cognición cargadas');
  },

  // 2️⃣ RENDER
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

  // 3️⃣ SNAPSHOT
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

  // 4️⃣ SAVE
  async save({ currentComercioId }) {
    const required = ['aiName', 'aiPersonality', 'aiTone', 'aiGreeting'];
    const missing = required.filter(id => !getValue(id));

    if (missing.length) {
      showToast('Faltan datos', 'Completá los campos requeridos', 'warning');
      throw new Error('Validación fallida');
    }

    showLoading('Guardando configuración de IA...');

    try {
      const updates = {
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
        aiCognition: getCognitionFromForm(),
        'onboardingSteps.ia-config': true,
        fechaActualizacion: new Date()
      };

      await updateDoc(doc(db, 'comercios', currentComercioId), updates);

      hideLoading();
      showToast('Éxito', 'Configuración guardada correctamente', 'success');

    } catch (err) {
      hideLoading();
      showToast('Error', err.message, 'error');
      throw err;
    }
  },

  // 5️⃣ VALIDACIÓN
  isFormValid() {
    return ['aiName', 'aiPersonality', 'aiTone', 'aiGreeting']
      .every(id => getValue(id));
  }
};

// ==================== UI ====================

function loadAIConfigToForm() {
  setValue('aiName', aiConfig.aiName);
  setValue('aiLanguage', aiConfig.aiLanguage || 'es-AR');
  setValue('aiPersonality', aiConfig.aiPersonality);
  setValue('aiTone', aiConfig.aiTone);
  setValue('aiGreeting', aiConfig.aiGreeting);
  setValue('sinPrecio', aiConfig.sinPrecio);
  setValue('sinStock', aiConfig.sinStock);
  setValue('localCerrado', aiConfig.localCerrado);
  setValue('proactividad', aiConfig.proactividad);
  setValue('formatoRespuestas', aiConfig.formatoRespuestas);
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
}
// 👇 NUEVO: cognitive permissions trigger dirty
  Object.values(COGNITIVE_CAPABILITIES)
    .flat()
    .forEach(cap => {
      const checkbox = document.getElementById(`cap_${cap}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          document.dispatchEvent(new Event('dataPage:changed'));
        });
      }
    });

  const levelSelect = $('aiCognitionLevel');
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      document.dispatchEvent(new Event('dataPage:changed'));
    });
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
      <p>Elegí qué tan inteligente querés que sea tu asistente. Siempre responde con información real de tu negocio.</p>
      <small>Podés cambiar esto cuando quieras</small>
    </div>
  `;
  container.insertBefore(card, container.firstChild);
}

// ==================== BOOT ====================
runDataPage(iaConfigModule);
