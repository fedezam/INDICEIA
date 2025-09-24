// dashboard.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
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
    this.init();
  }

  init() {
    this.setupAuth();
    this.setupTabs();
    this.setupForms();
    this.renderInitialContent();
  }

  // 🔐 Autenticación (solo chequeo + logout)
  setupAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData();
        this.updateUserUI();
        this.updateProgressIndicator();
      } else {
        window.location.href = "index.html"; // vuelve al login
      }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (error) {
        this.showToast("Error", "No se pudo cerrar sesión", "error");
      }
    });
  }

  // 🔽 --- A partir de acá mantenemos solo lógica del dashboard ---

  async loadUserData() {
    try {
      const userDoc = await getDoc(doc(db, "usuarios", this.currentUser.uid));
      if (userDoc.exists()) {
        this.userData = userDoc.data();
        await this.loadProducts();
        await this.loadCategories();
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }

  updateUserUI() {
    if (!this.userData) return;
    const userAvatar = document.getElementById("userAvatar");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    if (userAvatar) {
      userAvatar.textContent = (this.userData.nombre || this.currentUser.email)
        .charAt(0)
        .toUpperCase();
    }
    if (userName) {
      userName.textContent = this.userData.nombre || "Usuario";
    }
    if (userEmail) {
      userEmail.textContent = this.currentUser.email;
    }
  }

  // 📊 Progreso
  updateProgressIndicator() {
    const steps = [
      { id: "plan", label: "Plan", completed: !!this.userData?.plan },
      {
        id: "info",
        label: "Información",
        completed: !!(
          this.userData?.nombreComercio && this.userData?.telefono
        ),
      },
      { id: "horarios", label: "Horarios", completed: !!this.userData?.horarios },
      { id: "productos", label: "Productos", completed: this.products.length > 0 },
      { id: "ia", label: "IA", completed: !!this.userData?.aiGenerated },
    ];
    const completed = steps.filter((s) => s.completed).length;
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
    container.innerHTML = steps
      .map(
        (step) => `
        <div class="progress-step ${step.completed ? "completed" : ""}">
          <div class="step-icon">
            <i class="fas ${step.completed ? "fa-check" : "fa-circle"}"></i>
          </div>
          <div class="step-label">${step.label}</div>
        </div>
      `
      )
      .join("");
  }

  // 🗂️ Tabs
  setupTabs() {
    const tabs = [
      { id: "comercio", label: "Mi Comercio", icon: "fas fa-store" },
      { id: "horarios", label: "Horarios", icon: "fas fa-clock" },
      { id: "productos", label: "Productos", icon: "fas fa-box" },
      { id: "ia", label: "Mi IA", icon: "fas fa-robot" },
      { id: "estadisticas", label: "Estadísticas", icon: "fas fa-chart-line" },
    ];
    const tabNav = document.getElementById("tabNav");
    if (tabNav) {
      tabNav.innerHTML = tabs
        .map(
          (tab) => `
          <button class="tab-btn ${
            tab.id === this.currentTab ? "active" : ""
          }" data-tab="${tab.id}">
            <i class="${tab.icon}"></i>
            <span>${tab.label}</span>
          </button>
        `
        )
        .join("");

      tabNav.addEventListener("click", (e) => {
        const tabBtn = e.target.closest(".tab-btn");
        if (tabBtn) this.switchTab(tabBtn.dataset.tab);
      });
    }
  }

  switchTab(tabId) {
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".tab-pane")
      .forEach((pane) => pane.classList.remove("active"));
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add("active");
    document.getElementById(tabId)?.classList.add("active");
    this.currentTab = tabId;

    switch (tabId) {
      case "productos":
        this.renderProductsTable();
        break;
      case "ia":
        this.renderAISection();
        break;
      case "estadisticas":
        this.renderStats();
        break;
    }
  }

  // 📝 Forms
  setupForms() {
    this.renderComercioForm();
    this.renderScheduleForm();
    this.renderProductForm();
    this.renderAIConfigForm();
  }

  // 🚨 IMPORTANTE: aquí seguirían todas tus funciones de render de formularios,
  // productos, IA, estadísticas, showToast(), etc.
  // No repito todo para no sobrecargar, pero se mantienen igual que en tu código original,
  // solo eliminamos duplicaciones de login/registro.

  // ...
}

// Inicializar Dashboard
document.addEventListener("DOMContentLoaded", () => {
  new Dashboard();
});
