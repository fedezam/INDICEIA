// pages/ia-config/ia-config.js
// ==================== MIGRACIÓN AL SISTEMA SKELETON ====================

import './ia-config.css'; // ← CSS custom de la página

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

const COGNITIVE_CAPABILITIES = {
  basico: [
    { id: 'examples_simple', label: 'Ejemplos simples', description: 'Puede dar ejemplos básicos' },
    { id: 'anticipate_common_questions', label: 'Anticipar preguntas', description: 'Responde preguntas frecuentes' }
  ],
  recomendado: [
    { id: 'explain_implicit_services', label: 'Explicar servicios implícitos', description: 'Entiende servicios no mencionados' },
    { id: 'domain_knowledge', label: 'Conocimiento de dominio', description: 'Conoce tu industria' },
    { id: 'causal_explanations', label: 'Explicaciones causales', description: 'Explica el porqué de las cosas' }
  ],
  avanzado: [
    { id: 'infer_missing_details', label: 'Inferir detalles', description: 'Completa info faltante' },
    { id: 'contextual_adaptation', label: 'Adaptación contextual', description: 'Se adapta al contexto' },
    { id: 'guided_suggestions', label: 'Sugerencias guiadas', description: 'Sugiere próximos pasos' }
  ]
};

const IDIOMAS = [
  { value: 'es-AR', label: 'Español (Argentina)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'pt-BR', label: 'Português (Brasil)' }
];

const TONOS = [
  { value: 'formal', label: 'Formal' },
  { value: 'amigable', label: 'Amigable' },
  { value: 'casual', label: 'Casual' },
  { value: 'profesional', label: 'Profesional' }
];

// ==================== HELPERS ====================

function getDefaultAIConfig() {
  return {
    aiName: '',
    aiLanguage: 'es-AR',
    aiPersonality: '',
    aiTone: 'amigable',
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
  // Referencias
  fields: {},
  levelCards: [],
  capabilityCheckboxes: {},
  greetingPreview: null,
  guardarBtn: null,
  
  // Estado
  aiConfig: {},
  aiCognition: {},
  
  async load(ctx) {
    console.log('🔵 [LOAD] Iniciando carga de IA Config...');
    
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.currentUser = ctx.currentUser;
    this.currentComercioId = ctx.currentComercioId;
    
    this.aiConfig = this.comercioData.aiConfig || getDefaultAIConfig();
    this.aiCognition = this.comercioData.aiCognition || getDefaultAICognition();
    
    console.log('✅ [LOAD] Configuración cargada:', {
      aiConfig: this.aiConfig,
      aiCognition: this.aiCognition
    });
  },
  
  render() {
    console.log('🎨 [RENDER] Iniciando render...');
    
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';
    
    // ==================== HEADER ====================
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2><i class="fas fa-robot"></i> Configuración de IA</h2>
      <p>Personalizá cómo piensa y se comporta tu asistente</p>
    `;
    page.appendChild(header);
    console.log('✅ [RENDER] Header creado');
    
    // ==================== AI HELPER CARD ====================
    const aiCard = this.renderAIHelper();
    page.appendChild(aiCard);
    console.log('✅ [RENDER] AI Helper creado');
    
    // ==================== SECCIÓN: CONFIGURACIÓN BÁSICA ====================
    const basicCard = this.renderBasicConfig();
    page.appendChild(basicCard);
    console.log('✅ [RENDER] Config básica creada');
    
    // ==================== SECCIÓN: SALUDO ====================
    const greetingCard = this.renderGreeting();
    page.appendChild(greetingCard);
    console.log('✅ [RENDER] Saludo creado');
    
    // ==================== SECCIÓN: COMPORTAMIENTOS ====================
    const behaviorsCard = this.renderBehaviors();
    page.appendChild(behaviorsCard);
    console.log('✅ [RENDER] Comportamientos creados');
    
    // ==================== SECCIÓN: NIVEL COGNITIVO ====================
    const levelCard = this.renderCognitiveLevel();
    page.appendChild(levelCard);
    console.log('✅ [RENDER] Nivel cognitivo creado');
    
    // ==================== SECCIÓN: CAPACIDADES ====================
    const capabilitiesCard = this.renderCapabilities();
    page.appendChild(capabilitiesCard);
    console.log('✅ [RENDER] Capacidades creadas');
    
    // ==================== BOTÓN GUARDAR ====================
    this.guardarBtn = createButton({
      label: 'Guardar Configuración',
      icon: 'fa-save',
      variant: 'success',
      size: 'lg',
      block: true,
      onClick: () => this.handleGuardar()
    });
    
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '30px';
    btnContainer.appendChild(this.guardarBtn);
    page.appendChild(btnContainer);
    console.log('✅ [RENDER] Botón guardar creado');
    
    // Validar inicial
    this.validateForm();
    console.log('✅ [RENDER] Render completo');
  },
  
  renderAIHelper() {
    return createCard({
      title: 'Cómo piensa tu IA',
      icon: 'fa-brain',
      variant: 'info',
      highlight: true,
      content: 'Elegí qué tan inteligente querés que sea tu asistente. A mayor nivel cognitivo, mejor entenderá a tus clientes.',
      compact: true
    });
  },
  
  renderBasicConfig() {
    const content = document.createElement('div');
    content.className = 'config-section';
    
    // Nombre
    this.fields.aiName = createFormField({
      label: 'Nombre de la IA',
      name: 'aiName',
      type: 'text',
      required: true,
      placeholder: 'Ej: Asistente Virtual',
      value: this.aiConfig.aiName || ''
    });
    
    this.fields.aiName.input.addEventListener('input', () => {
      console.log('🔵 [INPUT] Nombre IA:', this.fields.aiName.input.value);
      this.validateForm();
    });
    
    // Idioma
    this.fields.aiLanguage = createFormField({
      label: 'Idioma',
      name: 'aiLanguage',
      type: 'select',
      required: true,
      options: IDIOMAS
    });
    
    this.fields.aiLanguage.input.value = this.aiConfig.aiLanguage || 'es-AR';
    
    this.fields.aiLanguage.input.addEventListener('change', () => {
      console.log('🔵 [SELECT] Idioma:', this.fields.aiLanguage.input.value);
    });
    
    // Personalidad
    this.fields.aiPersonality = createFormField({
      label: 'Personalidad',
      name: 'aiPersonality',
      type: 'textarea',
      required: true,
      rows: 3,
      placeholder: 'Ej: Amable, servicial y con sentido del humor',
      value: this.aiConfig.aiPersonality || ''
    });
    
    this.fields.aiPersonality.input.addEventListener('input', () => {
      console.log('🔵 [INPUT] Personalidad:', this.fields.aiPersonality.input.value.substring(0, 30) + '...');
      this.validateForm();
    });
    
    // Tono
    this.fields.aiTone = createFormField({
      label: 'Tono de comunicación',
      name: 'aiTone',
      type: 'select',
      required: true,
      options: TONOS
    });
    
    this.fields.aiTone.input.value = this.aiConfig.aiTone || 'amigable';
    
    this.fields.aiTone.input.addEventListener('change', () => {
      console.log('🔵 [SELECT] Tono:', this.fields.aiTone.input.value);
    });
    
    content.append(
      this.fields.aiName,
      this.fields.aiLanguage,
      this.fields.aiPersonality,
      this.fields.aiTone
    );
    
    return createCard({
      title: 'Configuración Básica',
      icon: 'fa-sliders-h',
      content: content
    });
  },
  
  renderGreeting() {
    const content = document.createElement('div');
    content.className = 'greeting-section';
    
    // Campo de saludo
    this.fields.aiGreeting = createFormField({
      label: 'Saludo inicial',
      name: 'aiGreeting',
      type: 'textarea',
      required: true,
      rows: 3,
      placeholder: 'Ej: ¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
      value: this.aiConfig.aiGreeting || ''
    });
    
    // Preview en tiempo real
    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'greeting-preview-wrapper';
    
    const previewLabel = document.createElement('label');
    previewLabel.className = 'preview-label';
    previewLabel.textContent = 'Vista previa:';
    
    this.greetingPreview = document.createElement('div');
    this.greetingPreview.className = 'greeting-preview';
    this.greetingPreview.textContent = this.aiConfig.aiGreeting || 'Tu saludo aparecerá aquí...';
    
    previewWrapper.appendChild(previewLabel);
    previewWrapper.appendChild(this.greetingPreview);
    
    // Event listener para actualizar preview
    this.fields.aiGreeting.input.addEventListener('input', () => {
      const value = this.fields.aiGreeting.input.value.trim();
      this.greetingPreview.textContent = value || 'Tu saludo aparecerá aquí...';
      console.log('🔵 [PREVIEW] Saludo actualizado');
      this.validateForm();
    });
    
    content.appendChild(this.fields.aiGreeting);
    content.appendChild(previewWrapper);
    
    return createCard({
      title: 'Saludo',
      icon: 'fa-comment-dots',
      content: content
    });
  },
  
  renderBehaviors() {
    const content = document.createElement('div');
    content.className = 'behaviors-section';
    
    // Sin precio
    this.fields.sinPrecio = createFormField({
      label: 'Respuesta cuando no hay precio',
      name: 'sinPrecio',
      type: 'textarea',
      rows: 2,
      placeholder: 'Ej: Te contacto con ventas para cotizar',
      value: this.aiConfig.sinPrecio || ''
    });
    
    // Sin stock
    this.fields.sinStock = createFormField({
      label: 'Respuesta cuando no hay stock',
      name: 'sinStock',
      type: 'textarea',
      rows: 2,
      placeholder: 'Ej: Por el momento no tenemos stock disponible',
      value: this.aiConfig.sinStock || ''
    });
    
    // Local cerrado
    this.fields.localCerrado = createFormField({
      label: 'Respuesta cuando el local está cerrado',
      name: 'localCerrado',
      type: 'textarea',
      rows: 2,
      placeholder: 'Ej: Estamos cerrados ahora, volvemos mañana a las 9:00',
      value: this.aiConfig.localCerrado || ''
    });
    
    // Proactividad
    this.fields.proactividad = createFormField({
      label: 'Nivel de proactividad',
      name: 'proactividad',
      type: 'textarea',
      rows: 2,
      placeholder: 'Ej: Ofrecer productos relacionados, sugerir combos',
      value: this.aiConfig.proactividad || ''
    });
    
    // Formato respuestas
    this.fields.formatoRespuestas = createFormField({
      label: 'Formato de respuestas',
      name: 'formatoRespuestas',
      type: 'textarea',
      rows: 2,
      placeholder: 'Ej: Respuestas cortas y directas',
      value: this.aiConfig.formatoRespuestas || ''
    });
    
    content.append(
      this.fields.sinPrecio,
      this.fields.sinStock,
      this.fields.localCerrado,
      this.fields.proactividad,
      this.fields.formatoRespuestas
    );
    
    return createCard({
      title: 'Comportamientos Especiales',
      icon: 'fa-cogs',
      content: content
    });
  },
  
  renderCognitiveLevel() {
    const content = document.createElement('div');
    content.className = 'cognitive-level-section';
    
    const description = document.createElement('p');
    description.className = 'level-description';
    description.textContent = 'Seleccioná el nivel de inteligencia de tu asistente:';
    content.appendChild(description);
    
    const levelsGrid = document.createElement('div');
    levelsGrid.className = 'levels-grid';
    
    const levels = [
      { 
        id: 'basico', 
        label: 'Básico', 
        icon: 'fa-star',
        description: 'Respuestas simples y directas',
        capabilities: 2
      },
      { 
        id: 'recomendado', 
        label: 'Recomendado', 
        icon: 'fa-star-half-alt',
        description: 'Entiende contexto y anticipa necesidades',
        capabilities: 3,
        recommended: true
      },
      { 
        id: 'avanzado', 
        label: 'Avanzado', 
        icon: 'fa-brain',
        description: 'Máxima inteligencia y adaptación',
        capabilities: 3
      }
    ];
    
    this.levelCards = [];
    
    levels.forEach(level => {
      console.log(`🔵 [LEVEL] Creando card para nivel: ${level.id}`);
      
      const levelContent = document.createElement('div');
      levelContent.innerHTML = `
        <div class="level-info">
          <p class="level-desc">${level.description}</p>
          <small class="level-caps">${level.capabilities} capacidades</small>
          ${level.recommended ? '<span class="recommended-badge">⭐ Recomendado</span>' : ''}
        </div>
      `;
      
      const card = createCard({
        title: level.label,
        icon: level.icon,
        content: levelContent,
        selectable: true,
        selected: this.aiCognition.level === level.id,
        compact: true,
        variant: level.recommended ? 'success' : null
      });
      
      card.dataset.level = level.id;
      
      card.addEventListener('card-select', (e) => {
        if (e.detail.selected) {
          console.log(`🔵 [LEVEL] Nivel seleccionado: ${level.id}`);
          
          this.aiCognition.level = level.id;
          
          // Deseleccionar otras cards
          this.levelCards.forEach(c => {
            if (c !== card) {
              c.deselect();
            }
          });
          
          // Actualizar capacidades mostradas
          this.updateCapabilitiesVisibility();
        }
      });
      
      this.levelCards.push(card);
      levelsGrid.appendChild(card);
    });
    
    content.appendChild(levelsGrid);
    
    return createCard({
      title: 'Nivel Cognitivo',
      icon: 'fa-graduation-cap',
      content: content,
      highlight: true
    });
  },
  
  renderCapabilities() {
    const content = document.createElement('div');
    content.className = 'capabilities-section';
    
    const description = document.createElement('p');
    description.className = 'capabilities-description';
    description.textContent = 'Activá las capacidades específicas que querés que tenga tu IA:';
    content.appendChild(description);
    
    // Crear grupo por cada nivel
    Object.entries(COGNITIVE_CAPABILITIES).forEach(([level, capabilities]) => {
      const group = this.createCapabilityGroup(level, capabilities);
      content.appendChild(group);
    });
    
    return createCard({
      title: 'Capacidades Cognitivas',
      icon: 'fa-puzzle-piece',
      content: content
    });
  },
  
  createCapabilityGroup(level, capabilities) {
    const group = document.createElement('div');
    group.className = `capability-group capability-${level}`;
    group.dataset.level = level;
    
    // Header del grupo
    const header = document.createElement('div');
    header.className = 'group-header';
    
    const icons = {
      basico: 'fa-star',
      recomendado: 'fa-star-half-alt',
      avanzado: 'fa-brain'
    };
    
    const labels = {
      basico: 'Básico',
      recomendado: 'Recomendado',
      avanzado: 'Avanzado'
    };
    
    header.innerHTML = `
      <i class="fas ${icons[level]}"></i>
      <span>${labels[level]}</span>
    `;
    
    group.appendChild(header);
    
    // Checkboxes
    const checksWrapper = document.createElement('div');
    checksWrapper.className = 'capabilities-list';
    
    capabilities.forEach(cap => {
      const isEnabled = this.aiCognition.capabilities && this.aiCognition.capabilities[cap.id];
      
      const wrapper = document.createElement('div');
      wrapper.className = 'capability-item';
      
      const checkbox = createFormField({
        label: cap.label,
        name: `cap_${cap.id}`,
        type: 'checkbox',
        value: isEnabled
      });
      
      const description = document.createElement('small');
      description.className = 'capability-description';
      description.textContent = cap.description;
      
      checkbox.input.addEventListener('change', (e) => {
        console.log(`🔵 [CAPABILITY] ${cap.id}: ${e.target.checked ? 'HABILITADO' : 'DESHABILITADO'}`);
        
        if (!this.aiCognition.capabilities) {
          this.aiCognition.capabilities = {};
        }
        
        if (e.target.checked) {
          this.aiCognition.capabilities[cap.id] = true;
        } else {
          delete this.aiCognition.capabilities[cap.id];
        }
      });
      
      wrapper.appendChild(checkbox);
      wrapper.appendChild(description);
      
      checksWrapper.appendChild(wrapper);
      
      // Guardar referencia
      if (!this.capabilityCheckboxes[level]) {
        this.capabilityCheckboxes[level] = [];
      }
      this.capabilityCheckboxes[level].push(checkbox);
    });
    
    group.appendChild(checksWrapper);
    
    // Mostrar/ocultar según nivel seleccionado
    if (this.aiCognition.level !== level) {
      group.style.display = 'none';
    }
    
    return group;
  },
  
  updateCapabilitiesVisibility() {
    console.log('🔄 [UPDATE] Actualizando visibilidad de capacidades para nivel:', this.aiCognition.level);
    
    const groups = document.querySelectorAll('.capability-group');
    groups.forEach(group => {
      const groupLevel = group.dataset.level;
      if (groupLevel === this.aiCognition.level) {
        group.style.display = '';
      } else {
        group.style.display = 'none';
      }
    });
  },
  
  validateForm() {
    const hasName = this.fields.aiName?.input.value.trim();
    const hasPersonality = this.fields.aiPersonality?.input.value.trim();
    const hasTone = this.fields.aiTone?.input.value.trim();
    const hasGreeting = this.fields.aiGreeting?.input.value.trim();
    
    const isValid = hasName && hasPersonality && hasTone && hasGreeting;
    
    console.log('🔵 [VALIDATE] Validando formulario:', {
      hasName: !!hasName,
      hasPersonality: !!hasPersonality,
      hasTone: !!hasTone,
      hasGreeting: !!hasGreeting,
      isValid
    });
    
    if (this.guardarBtn) {
      if (isValid) {
        this.guardarBtn.enable();
      } else {
        this.guardarBtn.disable();
      }
    }
    
    return isValid;
  },
  
  async handleGuardar() {
    console.log('💾 [SAVE] Intentando guardar configuración...');
    
    if (!this.validateForm()) {
      console.log('❌ [SAVE] Validación fallida');
      showToast({
        title: 'Faltan datos',
        message: 'Completá todos los campos requeridos',
        variant: 'warning'
      });
      return;
    }
    
    this.guardarBtn.setLoading(true);
    console.log('🔵 [SAVE] Guardando en Firebase...');
    
    try {
      const aiConfig = {
        aiName: this.fields.aiName.input.value.trim(),
        aiLanguage: this.fields.aiLanguage.input.value,
        aiPersonality: this.fields.aiPersonality.input.value.trim(),
        aiTone: this.fields.aiTone.input.value,
        aiGreeting: this.fields.aiGreeting.input.value.trim(),
        sinPrecio: this.fields.sinPrecio.input.value.trim(),
        sinStock: this.fields.sinStock.input.value.trim(),
        localCerrado: this.fields.localCerrado.input.value.trim(),
        proactividad: this.fields.proactividad.input.value.trim(),
        formatoRespuestas: this.fields.formatoRespuestas.input.value.trim()
      };
      
      const updates = {
        aiConfig,
        aiCognition: this.aiCognition,
        'onboardingSteps.ia-config': true,
        fechaActualizacion: new Date()
      };
      
      console.log('🔵 [SAVE] Datos a guardar:', updates);
      
      await updateDoc(doc(db, 'comercios', this.currentComercioId), updates);
      
      console.log('✅ [SAVE] Guardado exitoso');
      
      showToast({
        title: 'Guardado',
        message: 'Configuración actualizada correctamente',
        variant: 'success'
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔵 [SAVE] Redirigiendo a dashboard...');
      window.location.href = "/dashboard.html";
      
    } catch (error) {
      console.error('❌ [SAVE] Error guardando:', error);
      showToast({
        title: 'Error',
        message: 'No se pudo guardar: ' + error.message,
        variant: 'error'
      });
    } finally {
      this.guardarBtn.setLoading(false);
    }
  }
};

// ==================== RUN ====================
console.log('🚀 Iniciando página de IA Config con Skeleton...');

runSkeleton({
  page: iaConfigPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: 'Cargando configuración de IA...'
  }
});
