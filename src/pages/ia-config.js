// src/pages/ia-config.js
// ==================== VERSIÓN REFACTORIZADA ====================
// Usa dataPageSkeleton.js - SOLO lógica específica de configuración IA

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

// ==================== MÓDULO EXPORTADO ====================
const iaConfigModule = {
  // 1️⃣ LOAD - Cargar datos desde Firebase
  async load({ currentComercioId, comercioData }) {
    aiConfig = comercioData.aiConfig || getDefaultAIConfig();
    console.log('✅ Configuración de IA cargada');
  },

  // 2️⃣ RENDER - Dibujar UI específica
  render() {
    // Verificar que DOM esté listo
    const form = document.getElementById('iaConfigForm');
    if (!form) {
      console.error('❌ DOM no está listo, reintentando...');
      setTimeout(() => this.render(), 100);
      return;
    }

    console.log('🎨 Renderizando UI de IA config...');

    loadAIConfigToForm();
    setupEvents();
    insertAIHelperCard();

    console.log('✅ UI renderizada correctamente');
  },

  // 3️⃣ GET CURRENT DATA - Snapshot para dirty detection
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
      }
    };
  },

  // 4️⃣ SAVE - Guardar cambios
  async save({ currentComercioId, isEditMode }) {
    // Validaciones básicas
    const required = ['aiName', 'aiPersonality', 'aiTone', 'aiGreeting'];
    const missing = [];

    required.forEach(id => {
      const value = getValue(id);
      if (!value) missing.push(id);
    });

    if (missing.length > 0) {
      showToast('Faltan datos', 'Completá todos los campos requeridos', 'warning');
      throw new Error('Validación fallida');
    }

    showLoading('Guardando configuración de IA...');

    try {
      const configToSave = {
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
      };

      const updates = {
        aiConfig: configToSave,
        'onboardingSteps.ia-config': true,
        fechaActualizacion: new Date()
      };

      await updateDoc(doc(db, 'comercios', currentComercioId), updates);

      // Actualizar estado local
      aiConfig = configToSave;

      hideLoading();
      showToast('Éxito', 'Configuración de IA guardada correctamente', 'success');

    } catch (error) {
      hideLoading();
      console.error('❌ Error guardando:', error);
      showToast('Error', 'No se pudo guardar: ' + error.message, 'error');
      throw error;
    }
  },

  // 5️⃣ VALIDACIÓN - ¿Puede avanzar?
  isFormValid() {
    // Validar campos requeridos
    const required = ['aiName', 'aiPersonality', 'aiTone', 'aiGreeting'];
    
    return required.every(id => {
      const value = getValue(id);
      return value && value.length > 0;
    });
  }
};

// ==================== UI FUNCTIONS ====================

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
  // Character counters (si existen en el HTML)
  const fieldsWithCounter = [
    { id: 'aiPersonality', counterId: 'personalityCount', max: 500 },
    { id: 'aiGreeting', counterId: 'greetingCount', max: 200 },
    { id: 'sinPrecio', counterId: 'sinPrecioCount', max: 200 },
    { id: 'sinStock', counterId: 'sinStockCount', max: 200 },
    { id: 'localCerrado', counterId: 'localCerradoCount', max: 200 }
  ];

  fieldsWithCounter.forEach(({ id, counterId, max }) => {
    const field = $(id);
    const counter = $(counterId);
    
    if (field && counter) {
      const updateCounter = () => {
        const length = field.value.length;
        counter.textContent = `${length}/${max}`;
        
        if (length > max * 0.9) {
          counter.style.color = '#ef4444';
        } else {
          counter.style.color = '#6b7280';
        }
      };
      
      field.addEventListener('input', updateCounter);
      updateCounter(); // Initial update
    }
  });

  // Preview de saludo (si existe en el HTML)
  const greetingField = $('aiGreeting');
  const greetingPreview = $('greetingPreview');
  
  if (greetingField && greetingPreview) {
    greetingField.addEventListener('input', () => {
      const value = greetingField.value.trim();
      greetingPreview.textContent = value || 'Tu saludo aparecerá aquí...';
    });
    
    // Initial preview
    const initialValue = greetingField.value.trim();
    greetingPreview.textContent = initialValue || 'Tu saludo aparecerá aquí...';
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
      <h4>¡Configurá la personalidad de tu IA!</h4>
      <p>Definí cómo se comportará tu asistente virtual: su tono, estilo de respuesta y manejo de situaciones especiales.</p>
      <small>Una buena configuración mejora la experiencia del cliente</small>
    </div>
  `;
  container.insertBefore(card, container.firstChild);
}

// ==================== BOOT ====================
runDataPage(iaConfigModule);
