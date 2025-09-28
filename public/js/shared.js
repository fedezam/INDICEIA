// shared.js - Funciones comunes extraídas del código existente
import { auth, db, provider } from "./firebase.js";
import { 
  doc, setDoc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ==========================================
// 🔧 UTILS CLASE (Ya funcionando)
// ==========================================
class Utils {
  static showLoading(text = "Cargando...") {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    if (overlay && loadingText) {
      loadingText.textContent = text;
      overlay.classList.add("show");
    }
  }

  static hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("show");
  }

  static showToast(title, message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };

    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="${icons[type]}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) container.removeChild(toast);
      }, 300);
    }, 5000);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) container.removeChild(toast);
      }, 300);
    });
  }

  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validatePassword(password) {
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
  }

  static generateReferralId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // 🆕 Generar comercioId único (UUID-like)
  static generateComercioId() {
    return 'comercio_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
}

// ==========================================
// 🗂️ LOCALSTORAGE HELPERS (Nuevos)
// ==========================================
class LocalData {
  static save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
      return false;
    }
  }

  static load(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error cargando de localStorage:', error);
      return defaultValue;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removiendo de localStorage:', error);
      return false;
    }
  }

  // Datos compartidos entre páginas
  static getSharedData() {
    return this.load('indiceia_shared', {
      comercioId: null,
      referralId: null,
      planId: 'basico',
      trialEndDate: null,
      subscriptionStatus: 'trial',
      currentStep: 'mi-comercio',
      completedSections: [],
      lastSave: null,
      userData: {}
    });
  }

  static updateSharedData(updates) {
    const current = this.getSharedData();
    const updated = { ...current, ...updates, lastSave: new Date().toISOString() };
    return this.save('indiceia_shared', updated);
  }
}

// ==========================================
// 🔥 FIREBASE HELPERS (Extraído + mejorado)
// ==========================================
class FirebaseHelpers {
  // Obtener usuario actual
  static getCurrentUser() {
    return auth.currentUser;
  }

  // Obtener datos del usuario desde Firestore
  static async getUserData(userId = null) {
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) throw new Error('No hay usuario autenticado');

      const userDoc = await getDoc(doc(db, "usuarios", uid));
      if (!userDoc.exists()) throw new Error('Usuario no encontrado');
      
      return { id: uid, ...userDoc.data() };
    } catch (error) {
      console.error('Error obteniendo datos usuario:', error);
      throw error;
    }
  }

  // Actualizar datos del usuario
  static async updateUserData(userData, userId = null) {
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) throw new Error('No hay usuario autenticado');

      await updateDoc(doc(db, "usuarios", uid), {
        ...userData,
        fechaActualizacion: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  // Obtener productos del usuario
  static async getProducts(userId = null) {
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) throw new Error('No hay usuario autenticado');

      const productosRef = collection(db, "usuarios", uid, "productos");
      const snapshot = await getDocs(productosRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  }

  // Agregar producto
  static async addProduct(productData, userId = null) {
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) throw new Error('No hay usuario autenticado');

      const productosRef = collection(db, "usuarios", uid, "productos");
      const docRef = await addDoc(productosRef, {
        ...productData,
        fechaCreacion: new Date()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error agregando producto:', error);
      throw error;
    }
  }

  // Actualizar producto
  static async updateProduct(productId, productData, userId = null) {
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) throw new Error('No hay usuario autenticado');

      await updateDoc(doc(db, "usuarios", uid, "productos", productId), {
        ...productData,
        fechaActualizacion: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  }

  // Eliminar producto
  static async deleteProduct(productId, userId = null) {
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) throw new Error('No hay usuario autenticado');

      await deleteDoc(doc(db, "usuarios", uid, "productos", productId));
      return true;
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  }

  // 🆕 Generar JSON del comercio (basado en tu exportJSON.js)
  static async generateCommerceJSON(userId = null) {
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) throw new Error('No hay usuario autenticado');

      // Datos del usuario/comercio
      const userData = await this.getUserData(uid);
      
      // Productos
      const productos = await this.getProducts(uid);

      const finalJSON = {
        comercio: {
          comercioId: userData.comercioId || Utils.generateComercioId(),
          referralId: userData.referralId || userData.comercioId,
          nombre: userData.nombreComercio || "",
          direccion: userData.direccion || "",
          telefono: userData.telefono || "",
          horarios: userData.horarios || [],
          descripcion: userData.descripcion || "",
          ciudad: userData.ciudad || "",
          provincia: userData.provincia || "",
          pais: userData.pais || "",
          barrio: userData.barrio || "",
          plan: userData.plan || "basico",
          estado: userData.estado || "trial",
          mediosPago: userData.paymentMethods || [],
          asistente_ia: {
            nombre: userData.aiName || "Asistente IA",
            personalidad: userData.personalidad || "amigable",
            tono: userData.tono || "profesional",
            saludo: userData.saludoInicial || "",
            entidad: userData.entidad || `Actúa como ${userData.aiName || "Asistente IA"}...`
          }
        },
        productos: productos.map(p => ({
          nombre: p.nombre || "",
          codigo: p.codigo || "",
          precio: p.precio || { valor: 0, moneda: "ARS" },
          stock: p.stock || null,
          talle: p.talle || "",
          color: p.color || "",
          categoria: p.categoria || "",
          activo: p.activo !== false
        })),
        lastUpdated: new Date().toISOString(),
        version: "1.0"
      };

      return finalJSON;
    } catch (error) {
      console.error('Error generando JSON comercio:', error);
      throw error;
    }
  }
}

// ==========================================
// 🎯 PLANES Y SUSCRIPCIONES (Nuevos)
// ==========================================
class PlansManager {
  static plans = {
    basico: { nombre: "Básico", precio: 15, maxProductos: 50, descripcion: "Ideal para servicios" },
    pro: { nombre: "Pro", precio: 35, maxProductos: 500, descripcion: "Pequeños comercios" },
    premium: { nombre: "Premium", precio: 60, maxProductos: -1, descripcion: "Productos ilimitados" }
  };

  static getPlan(planId) {
    return this.plans[planId] || this.plans.basico;
  }

  static getAllPlans() {
    return Object.entries(this.plans).map(([id, plan]) => ({ id, ...plan }));
  }

  // Validar límite de productos
  static validateProductLimit(planId, currentCount) {
    const plan = this.getPlan(planId);
    if (plan.maxProductos === -1) return { valid: true, message: '' };
    
    const isValid = currentCount < plan.maxProductos;
    const message = isValid ? 
      `${currentCount}/${plan.maxProductos} productos cargados` :
      `Tu plan permite hasta ${plan.maxProductos} productos. Para cargar más, actualiza tu plan`;
    
    return { valid: isValid, message, remaining: plan.maxProductos - currentCount };
  }

  // Verificar trial
  static isTrialValid(trialEndDate) {
    if (!trialEndDate) return false;
    return new Date() < new Date(trialEndDate);
  }

  // Calcular fecha fin de trial (5 días)
  static calculateTrialEnd() {
    const now = new Date();
    now.setDate(now.getDate() + 5);
    return now.toISOString();
  }
}

// ==========================================
// 🔍 AUTH HELPERS (Extraído)
// ==========================================
class AuthHelpers {
  // Obtener usuario actual
  static getCurrentUser() {
    return auth.currentUser;
  }

  // Verificar si usuario está logueado
  static isLoggedIn() {
    return !!auth.currentUser;
  }

  // Redirigir si no está logueado
  static requireAuth(redirectTo = '/index.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  // Logout
  static async logout() {
    try {
      await auth.signOut();
      LocalData.remove('indiceia_shared');
      return true;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }
}

// ==========================================
// 🎯 INITIALIZATION (Nuevo)
// ==========================================
class AppInit {
  // Inicializar datos compartidos al cargar página
  static async initSharedData() {
    try {
      if (!AuthHelpers.isLoggedIn()) return null;

      const userData = await FirebaseHelpers.getUserData();
      const sharedData = LocalData.getSharedData();
      
      // Si no tiene comercioId, generarlo
      if (!userData.comercioId) {
        const comercioId = Utils.generateComercioId();
        const referralId = comercioId; // Mismo valor
        
        await FirebaseHelpers.updateUserData({
          comercioId,
          referralId
        });
        
        userData.comercioId = comercioId;
        userData.referralId = referralId;
      }

      // Actualizar localStorage con datos frescos
      LocalData.updateSharedData({
        comercioId: userData.comercioId,
        referralId: userData.referralId,
        planId: userData.plan || 'basico',
        trialEndDate: userData.trialEndDate || PlansManager.calculateTrialEnd(),
        subscriptionStatus: userData.estado || 'trial',
        userData: userData
      });

      return userData;
    } catch (error) {
      console.error('Error inicializando datos compartidos:', error);
      return null;
    }
  }

  // Verificar suscripción activa
  static validateSubscription() {
    const shared = LocalData.getSharedData();
    const isTrialValid = PlansManager.isTrialValid(shared.trialEndDate);
    const hasActiveSubscription = shared.subscriptionStatus === 'active';
    
    return {
      hasAccess: isTrialValid || hasActiveSubscription,
      status: shared.subscriptionStatus,
      trialEnd: shared.trialEndDate,
      isTrialExpired: !isTrialValid && shared.subscriptionStatus === 'trial'
    };
  }
}

// ==========================================
// 📤 EXPORTS
// ==========================================
export {
  Utils,
  LocalData,
  FirebaseHelpers,
  PlansManager,
  AuthHelpers,
  AppInit,
  // Firebase re-exports
  auth,
  db,
  provider
};
