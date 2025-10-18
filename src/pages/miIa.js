// src/pages/miIa.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { updateCommerceJSON } from '../shared/updateCommerceJSON.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];
let productosDestacados = []; // Array de objetos completos
let hasUnsavedChanges = false;
let originalAIConfig = null;
let searchTimeout = null;

// ==================== HELPERS ====================
const $ = (id) => document.getElementById(id);

const safeSet = (id, value, defaultValue = '') => {
  const el = $(id);
  if (!el) {
    console.warn(`⚠️ Elemento no encontrado: ${id}`);
    return;
  }
  el.value = value ?? defaultValue;
};

const safeGet = (id) => {
  const el = $(id);
  return el ? el.value.trim() : '';
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando mi-ia.js (production)');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      currentUser = user;
      await initializePage();
    } else {
      console.log('❌ Usuario no autenticado, redirigiendo...');
      window.location.href = '/index.html';
    }
  });
});

async function initializePage() {
  try {
    showLoading('Cargando configuración de IA...');

    // Obtener comercioId
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || !userDoc.data()?.comercioId) {
      console.warn('⚠️ No existe comercioId en usuario → redirigir a mi-comercio');
      hideLoading();
      window.location.href = './mi-comercio.html';
      return;
    }

    currentComercioId = userDoc.data().comercioId;
    console.log('📍 Comercio ID:', currentComercioId);

    // Cargar datos del comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);

    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
      console.log('✅ Datos del comercio cargados:', comercioData.nombreComercio);
    } else {
      console.warn('⚠️ Comercio no existe en Firestore');
      comercioData = { id: currentComercioId };
    }

    // Cargar productos
    await loadProducts();

    // Inicializar UI
    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();
    renderContactosValidacion();
    setupEventListeners();
    createSaveButton();

    // Inicializar Navigation
    try {
      Navigation.init();
    } catch (e) {
      console.warn('⚠️ Navigation.init falló:', e);
    }

    // Validación para navegación
    window.validateCurrentPageData = async () => {
      // Solo validar campos OBLIGATORIOS (secciones 1 y 2)
      const aiName = safeGet('aiName');
      const aiPersonality = safeGet('aiPersonality');
      const aiTone = safeGet('aiTone');
      const aiLanguage = safeGet('aiLanguage');
      const aiGreeting = safeGet('aiGreeting');

      if (!aiName || !aiPersonality || !aiTone || !aiLanguage || !aiGreeting) {
        showToast('warning', 'Campos obligatorios incompletos', 
          'Completá todos los campos de Identidad del Asistente');
        return false;
      }

      const sinPrecio = safeGet('sinPrecio');
      const sinStock = safeGet('sinStock');
      const localCerrado = safeGet('localCerrado');
      const proactividad = safeGet('proactividad');
      const formatoRespuestas = safeGet('formatoRespuestas');

      if (!sinPrecio || !sinStock || !localCerrado || !proactividad || !formatoRespuestas) {
        showToast('warning', 'Campos obligator
