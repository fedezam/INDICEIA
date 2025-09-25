// dashboard.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

class Dashboard {
  constructor() {
    this.currentUser = null;
    this.userData = null;
    this.currentTab = "comercio";
    this.products = [];
    this.allCategories = [];
    this.selectedCategories = [];
    this.editingProductId = null;
    this.init();
  }

  init() {
    this.setupAuth();
    this.setupTabs();
    this.setupForms();
    this.setupEventListeners();
    this.renderInitialContent();
  }

  // -----------------------
  // AUTH: solo comprobación + logout
  // -----------------------
  setupAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData();
      } else {
        window.location.href = "index.html";
      }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (err) {
        this.showToast("Error", "No se pudo cerrar sesión", "error");
        console.error(err);
      }
    });
  }

  // -----------------------
  // Carga de datos
  // -----------------------
  async loadUserData() {
    try {
      if (!this.currentUser) return;
      const userRef = doc(db, "usuarios", this.currentUser.uid);
      const userDoc = await getDoc(userRef);
      this.userData = userDoc.exists() ? userDoc.data() : {};
      await this.loadProducts();
      await this.loadCategories();
      this.setupForms();
      this.updateUserUI();
      this.updateProgressIndicator();
    } catch (error) {
      console.error("Error loading user data:", error);
      this.showToast("Error", "No se pudo cargar la información del usuario", "error");
    }
  }

  updateUserUI() {
    if (!this.userData || !this.currentUser) return;
    const userAvatar = document.getElementById("userAvatar");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    if (userAvatar) {
      const display = (this.userData.nombre || this.currentUser.email || "U").charAt(0).toUpperCase();
      userAvatar.textContent = display;
    }
    if (userName) userName.textContent = this.userData.nombre || "Usuario";
    if (userEmail) userEmail.textContent = this.currentUser.email || "";
  }

  // -----------------------
  // Progress indicator
  // -----------------------
  updateProgressIndicator() {
    const steps = [
      { id: "plan", label: "Plan", completed: !!this.userData?.plan },
      { id: "info", label: "Información", completed: !!(this.userData?.nombreComercio && this.userData?.telefono) },
      { id: "horarios", label: "Horarios", completed: !!this.userData?.horarios },
      { id: "productos", label: "Productos", completed: this.products.length > 0 },
      { id: "ia", label: "IA", completed: !!this.userData?.aiGenerated }
    ];
    const completed = steps.filter(s => s.completed).length;
    const percentage = Math.round((completed / steps.length) * 100);

    const progressFill = document.getElementById("completionFill");
    const progressText = document.getElementById("completionText");
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}% completado`;

    this.renderProgressSteps(steps);
  }

  renderProgressSteps(steps) {
    const container = document.getElementById("progressSteps");
    if (!container) return;
    container.innerHTML = steps.map(step => `
      <div class="progress-step ${step.completed ? "completed" : ""}">
        <div class="step-icon"><i class="fas ${step.completed ? "fa-check" : "fa-circle"}"></i></div>
        <div class="step-label">${step.label}</div>
      </div>
    `).join("");
  }

  // -----------------------
  // Tabs
  // -----------------------
  setupTabs() {
    const tabs = [
      { id: "comercio", label: "Mi Comercio", icon: "fas fa-store" },
      { id: "horarios", label: "Horarios", icon: "fas fa-clock" },
      { id: "productos", label: "Productos", icon: "fas fa-box" },
      { id: "ia", label: "Mi IA", icon: "fas fa-robot" },
      { id: "estadisticas", label: "Estadísticas", icon: "fas fa-chart-line" }
    ];
    const tabNav = document.getElementById("tabNav");
    if (!tabNav) return;
    tabNav.innerHTML = tabs.map(t => `
      <button class="tab-btn ${t.id === this.currentTab ? "active" : ""}" data-tab="${t.id}">
        <i class="${t.icon}"></i> <span>${t.label}</span>
      </button>
    `).join("");

    tabNav.addEventListener("click", e => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      this.switchTab(btn.dataset.tab);
    });
  }

  switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add("active");
    document.getElementById(tabId)?.classList.add("active");
    this.currentTab = tabId;

    if (tabId === "productos") this.renderProductsTable();
    if (tabId === "ia") this.renderAISection();
    if (tabId === "estadisticas") this.renderStats();
  }

  // -----------------------
  // Forms rendering
  // -----------------------
  setupForms() {
    this.renderComercioForm();
    this.renderScheduleForm();
    this.renderProductForm();
    this.renderAIConfigForm();
  }

  renderComercioForm() {
    const planSelector = document.getElementById("planSelector");
    if (planSelector) {
      const plans = [
        { id: "basic", name: "Básico", price: "Gratis", features: ["50 consultas/mes", "Soporte básico"] },
        { id: "pro", name: "Pro", price: "$29/mes", features: ["500 consultas/mes", "Soporte prioritario", "Estadísticas avanzadas"] },
        { id: "premium", name: "Premium", price: "$59/mes", features: ["Consultas ilimitadas", "Soporte 24/7", "Integraciones"] }
      ];
      planSelector.innerHTML = plans.map(plan => `
        <div class="plan-card ${this.userData?.plan === plan.id ? "selected" : ""}" data-plan="${plan.id}">
          <div class="plan-header">
            <h4>${plan.name}</h4>
            <div class="plan-price">${plan.price}</div>
          </div>
          <div class="plan-features">
            ${plan.features.map(f => `<div class="feature"><i class="fas fa-check"></i> ${f}</div>`).join("")}
          </div>
        </div>
      `).join("");

      planSelector.addEventListener("click", e => {
        const card = e.target.closest(".plan-card");
        if (!card) return;
        document.querySelectorAll(".plan-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        this.updateUserField("plan", card.dataset.plan);
      });
    }

    const basicFields = [
      { id: "nombreComercio", label: "Nombre del Comercio", type: "text", required: true },
      { id: "descripcion", label: "Descripción", type: "textarea", required: true },
      { id: "direccion", label: "Dirección", type: "text", required: true },
      { id: "ciudad", label: "Ciudad", type: "text", required: true },
      { id: "pais", label: "País", type: "select", required: true, options: [
        "Argentina","México","Colombia","Chile","Perú","Ecuador","Uruguay","Paraguay","Bolivia",
        "España","Estados Unidos","Brasil","Venezuela","Guatemala","Costa Rica","Panamá","Honduras",
        "Nicaragua","El Salvador","República Dominicana","Cuba","Puerto Rico","Otro"
      ]}
    ];
    this.renderFormFields("basicInfoFields", basicFields);

    const contactFields = [
      { id: "telefono", label:
