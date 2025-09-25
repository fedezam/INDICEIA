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
  deleteDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

class Dashboard {
  constructor() {
    this.currentUser = null;
    this.userData = {};
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

  // AUTH: solo comprobación + logout
  setupAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData();
        this.updateUserUI();
        this.updateProgressIndicator();
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

  // Carga de datos
  async loadUserData() {
    try {
      if (!this.currentUser) return;
      const userRef = doc(db, "usuarios", this.currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        this.userData = userDoc.data();
      } else {
        this.userData = {};
      }
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

  // Progress indicator
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

  // Tabs
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
      const tab = btn.dataset.tab;
      this.switchTab(tab);
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

  // Forms rendering
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
      { id: "telefono", label: "Teléfono", type: "tel", required: true },
      { id: "whatsapp", label: "WhatsApp", type: "tel", required: false },
      { id: "email", label: "Email de contacto", type: "email", required: false },
      { id: "website", label: "Sitio web", type: "url", required: false }
    ];
    this.renderFormFields("contactFields", contactFields);

    const paymentMethods = ["Efectivo","Tarjeta de débito","Tarjeta de crédito","Transferencia","MercadoPago","PayPal","Crypto","Cheque"];
    const paymentContainer = document.getElementById("paymentMethods");
    if (paymentContainer) {
      paymentContainer.innerHTML = paymentMethods.map(m => `
        <label class="checkbox-item">
          <input type="checkbox" name="paymentMethods" value="${m}" ${this.userData?.paymentMethods?.includes(m) ? "checked" : ""}>
          <span class="checkbox-text">${m}</span>
        </label>
      `).join("");
    }
  }

  renderScheduleForm() {
    const days = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
    const scheduleGrid = document.getElementById("scheduleGrid");
    if (!scheduleGrid) return;
    scheduleGrid.innerHTML = days.map(day => {
      const key = day.toLowerCase();
      const dayData = this.userData?.horarios?.[key] || {
        morning: { open: "08:00", close: "12:00" },
        afternoon: { open: "16:00", close: "20:00" },
        closed: false,
        continuous: false
      };
      return `
        <div class="schedule-day" data-day="${key}">
          <div class="day-header">
            <label class="day-toggle">
              <input type="checkbox" ${!dayData.closed ? "checked" : ""}>
              <span>${day}</span>
            </label>
          </div>
          <div class="day-hours ${dayData.closed ? "disabled" : ""}">
            <div class="schedule-mode">
              <label class="schedule-option">
                <input type="radio" name="${key}_mode" value="continuous" ${dayData.continuous ? "checked" : ""}>
                <span>Horario Continuo</span>
              </label>
              <label class="schedule-option">
                <input type="radio" name="${key}_mode" value="split" ${!dayData.continuous ? "checked" : ""}>
                <span>Horario Cortado</span>
              </label>
            </div>
            <div class="time-blocks">
              <div class="time-block continuous-schedule ${dayData.continuous ? "" : "hidden"}">
                <label>Horario:</label>
                <div class="time-range">
                  <input type="time" value="${dayData.continuous ? (dayData.open || "09:00") : "09:00"}">
                  <span>a</span>
                  <input type="time" value="${dayData.continuous ? (dayData.close || "18:00") : "18:00"}">
                </div>
              </div>
              <div class="time-block split-schedule ${!dayData.continuous ? "" : "hidden"}">
                <div class="morning-hours">
                  <label>Mañana:</label>
                  <div class="time-range">
                    <input type="time" value="${dayData.morning?.open || "08:00"}">
                    <span>a</span>
                    <input type="time" value="${dayData.morning?.close || "12:00"}">
                  </div>
                </div>
                <div class="afternoon-hours">
                  <label>Tarde:</label>
                  <div class="time-range">
                    <input type="time" value="${dayData.afternoon?.open || "16:00"}">
                    <span>a</span>
                    <input type="time" value="${dayData.afternoon?.close || "20:00"}">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  renderProductForm() {
    const productFields = [
      { id: "productName", label: "Nombre del Producto", type: "text", required: true },
      { id: "productPrice", label: "Precio", type: "number", required: true, step: "0.01" },
      { id: "productCategory", label: "Categoría", type: "select", required: true, options: this.selectedCategories },
      { id: "productDescription", label: "Descripción", type: "textarea", required: false },
      { id: "productStock", label: "Stock", type: "number", required: false },
      { id: "productCode", label: "Código", type: "text", required: false }
    ];
    this.renderFormFields("productFields", productFields);
  }

  renderAIConfigForm() {
    const aiFields = [
      { id: "aiName", label: "Nombre del Asistente", type: "text", required: true, placeholder: "ej: Ana, tu asistente virtual" },
      { id: "aiPersonality", label: "Personalidad", type: "select", required: true, options: ["Amigable y cercano","Profesional","Divertido","Formal","Casual"] },
      { id: "aiTone", label: "Tono de Voz", type: "select", required: true, options: ["Entusiasta","Relajado","Serio","Jovial","Elegante"] },
      { id: "aiGreeting", label: "Saludo Inicial", type: "textarea", required: true, placeholder: "ej: ¡Hola! Soy Ana, tu asistente virtual. ¿En qué puedo ayudarte hoy?" }
    ];
    this.renderFormFields("aiConfigFields", aiFields);
  }

  renderFormFields(containerId, fields) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = fields.map(field => {
      const value = this.userData?.[field.id] ?? "";
      let inputHtml = "";
      if (field.type === "textarea") {
        inputHtml = `<textarea id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""}>${value}</textarea>`;
      } else if (field.type === "select") {
        const options = Array.isArray(field.options) ? field.options : [];
        inputHtml = `<select id="${field.id}" name="${field.id}" ${field.required ? "required" : ""}>
          <option value="">Seleccionar...</option>
          ${options.map(o => `<option value="${o}" ${value === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>`;
      } else {
        inputHtml = `<input type="${field.type}" id="${field.id}" name="${field.id}" value="${value}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""} ${field.step ? `step="${field.step}"` : ""}>`;
      }
      return `
        <div class="form-field">
          <label for="${field.id}">${field.label}${field.required ? " *" : ""}</label>
          ${inputHtml}
          <div class="error-message">Este campo es requerido</div>
        </div>
      `;
    }).join("");
  }

  // PRODUCTS / CATEGORIES
  async loadProducts() {
    try {
      if (!this.currentUser) return;
      const productsRef = collection(db, "usuarios", this.currentUser.uid, "productos");
      const q = query(productsRef, orderBy("nombre"));
      const snap = await getDocs(q);
      this.products = [];
      snap.forEach(d => this.products.push({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }

  async loadCategories() {
    const predefined = [
      "Ropa y Moda","Calzado","Accesorios","Joyería","Relojes",
      "Electrónicos","Informática","Celulares y Tablets","Audio y Video","Gaming",
      "Hogar y Decoración","Muebles","Electrodomésticos","Jardín","Ferretería",
      "Belleza y Cosméticos","Salud","Farmacia","Perfumería","Cuidado Personal",
      "Alimentos","Bebidas","Panadería","Carnicería","Verdulería","Almacén",
      "Servicios Profesionales","Educación","Turismo","Transporte","Seguros",
      "Libros","Música","Películas","Juguetes","Deportes","Fitness",
      "Automotor","Mascotas","Bebés y Niños","Arte y Manualidades","Oficina",
      "Regalería","Marroquinería","Óptica","Fotografía","Instrumentos Musicales",
      "Papelería","Librería","Floristería","Cerrajería","Tapicería"
    ];
    const userCats = this.userData?.categories || [];
    const set = new Set([...predefined, ...userCats]);
    this.allCategories = Array.from(set).sort();
    this.selectedCategories = userCats.length > 0 ? userCats : [];
    this.renderCategoriesSelector();
  }

  renderCategoriesSelector() {
    const container = document.getElementById("categoriesGrid");
    if (!container) return;
    container.innerHTML = `
      <div class="categories-section">
        <div class="categories-selector">
          <h4><i class="fas fa-list"></i> Seleccionar Categorías para tu Negocio</h4>
          <div class="category-dropdown">
            <select id="categorySelect" class="category-select">
              <option value="">Seleccionar categoría...</option>
              ${this.allCategories.map(cat => `<option value="${cat}" ${this.selectedCategories.includes(cat) ? "disabled" : ""}>${cat}</option>`).join("")}
            </select>
            <button type="button" class="btn btn-success" id="addSelectedCategory"><i class="fas fa-plus"></i> Agregar</button>
          </div>
          <div class="custom-category">
            <input type="text" id="customCategory" placeholder="¿No encuentras tu rubro? Escríbelo aquí...">
            <button type="button" class="btn btn-secondary" id="addCustomCategory"><i class="fas fa-plus"></i> Agregar Personalizada</button>
          </div>
        </div>
        <div class="selected-categories">
          <h4><i class="fas fa-check-circle"></i> Categorías de tu Negocio</h4>
          <div class="selected-categories-grid" id="selectedCategoriesGrid">
            ${this.selectedCategories.map((cat, idx) => `<div class="selected-category-tag" data-index="${idx}"><span>${cat}</span><button class="remove-btn"><i class="fas fa-times"></i></button></div>`).join("")}
          </div>
          ${this.selectedCategories.length === 0 ? `<p class="empty-categories">No has seleccionado categorías aún</p>` : ""}
        </div>
      </div>
    `;

    const section = container.querySelector(".categories-section");
    section?.addEventListener("click", async (e) => {
      if (e.target.closest("#addSelectedCategory")) {
        const sel = document.getElementById("categorySelect");
        const cat = sel?.value;
        if (cat && !this.selectedCategories.includes(cat)) {
          this.selectedCategories.push(cat);
          await this.updateUserField("categories", this.selectedCategories);
          this.renderCategoriesSelector();
          this.renderProductForm();
          this.showToast("Categoría agregada", `"${cat}" ha sido agregada`, "success");
        }
      } else if (e.target.closest("#addCustomCategory")) {
        const input = document.getElementById("customCategory");
        const cat = input?.value.trim();
        if (cat && !this.selectedCategories.includes(cat)) {
          this.selectedCategories.push(cat);
          if (!this.allCategories.includes(cat)) this.allCategories.push(cat);
          await this.updateUserField("categories", this.selectedCategories);
          this.renderCategoriesSelector();
          this.renderProductForm();
          input.value = "";
          this.showToast("Categoría personalizada agregada", `"${cat}" ha sido agregada`, "success");
        }
      } else if (e.target.closest(".remove-btn")) {
        const tag = e.target.closest(".selected-category-tag");
        const idx = Number(tag.dataset.index);
        this.selectedCategories.splice(idx, 1);
        await this.updateUserField("categories", this.selectedCategories);
        this.renderCategoriesSelector();
        this.renderProductForm();
      }
    });
  }

  renderProductsTable() {
    const head = document.getElementById("productsTableHead");
    const body = document.getElementById("productsTableBody");
    if (!head || !body) return;

    if (this.products.length === 0) {
      head.innerHTML = "";
      body.innerHTML = `<tr><td colspan="5" class="empty-state-row">No hay productos registrados</td></tr>`;
      return;
    }

    head.innerHTML = `
      <tr>
        <th>Nombre</th>
        <th>Categoría</th>
        <th>Precio</th>
        <th>Stock</th>
        <th>Acciones</th>
      </tr>
    `;

    body.innerHTML = this.products.map(p => `
      <tr data-product-id="${p.id}">
        <td>${p.nombre}</td>
        <td>${p.categoria || ""}</td>
        <td>$${p.precio ?? ""}</td>
        <td>${p.stock ?? "N/A"}</td>
        <td>
          <button class="btn btn-sm btn-outline edit-product" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger delete-product" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join("");

    // CORRIGIDO: Removido { once: true }
    body.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const id = row.dataset.productId;
      if (e.target.closest(".edit-product")) {
        this.editProduct(id);
      } else if (e.target.closest(".delete-product")) {
        await this.deleteProduct(id);
      }
    });
  }

  editProduct(id) {
    const p = this.products.find(x => x.id === id);
    if (!p) return;
    const map = { nombre: "productName", precio: "productPrice", categoria: "productCategory", descripcion: "productDescription", stock: "productStock", codigo: "productCode" };
    Object.entries(map).forEach(([key, fieldId]) => {
      const el = document.getElementById(fieldId);
      if (el) el.value = p[key] ?? "";
    });
    this.editingProductId = id;
    this.showToast("Edición", "Producto cargado en el formulario para editar", "info");
  }

  async deleteProduct(id) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      this.showLoading("Eliminando producto...");
      await deleteDoc(doc(db, "usuarios", this.currentUser.uid, "productos", id));
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast("Producto eliminado", "El producto ha sido eliminado correctamente", "success");
    } catch (error) {
      this.hideLoading();
      console.error(error);
      this.showToast("Error", "No se pudo eliminar el producto", "error");
    }
  }

  // AI: vista previa y probador
  renderAISection() {
    const hasRequired = this.userData?.nombreComercio && this.products.length > 0;
    const noAIMessage = document.getElementById("noAIMessage");
    const aiPreviewSection = document.getElementById("aiPreviewSection");
    const aiTestSection = document.getElementById("aiTestSection");

    if (!hasRequired) {
      noAIMessage?.classList.remove("hidden");
      aiPreviewSection?.classList.add("hidden");
      aiTestSection?.classList.add("hidden");
      return;
    }

    if (this.userData?.aiGenerated) {
      noAIMessage?.classList.add("hidden");
      aiPreviewSection?.classList.remove("hidden");
      aiTestSection?.classList.remove("hidden");
      this.renderAIPreview();
      this.setupChatTest();
    } else {
      noAIMessage?.classList.add("hidden");
      aiPreviewSection?.classList.add("hidden");
      aiTestSection?.classList.add("hidden");
    }
  }

  renderAIPreview() {
    const linkDisplay = document.getElementById("aiLinkDisplay");
    const actions = document.getElementById("aiActions");
    const aiLink = `https://indiceia.com/chat/${this.userData?.referralId || "demo"}`;

    if (linkDisplay) {
      linkDisplay.innerHTML = `
        <div class="link-box">
          <input type="text" value="${aiLink}" readonly>
          <button class="copy-link-btn btn btn-outline"><i class="fas fa-copy"></i></button>
        </div>
      `;
    }
    if (actions) {
      actions.innerHTML = `
        <button class="share-whatsapp-btn btn btn-primary"><i class="fab fa-whatsapp"></i> Compartir por WhatsApp</button>
        <button class="generate-qr-btn btn btn-secondary"><i class="fas fa-qrcode"></i> Generar QR</button>
      `;
    }

    // CORRIGIDO: Removido { once: true }
    const preview = document.getElementById("aiPreviewSection");
    preview?.addEventListener("click", (e) => {
      if (e.target.closest(".copy-link-btn")) {
        navigator.clipboard.writeText(aiLink).then(() => this.showToast("Copiado", "Link copiado al portapapeles", "success"));
      } else if (e.target.closest(".share-whatsapp-btn")) {
        const msg = `¡Hola! Puedes chatear con mi asistente de IA aquí: ${aiLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
      } else if (e.target.closest(".generate-qr-btn")) {
        this.showToast("QR", "Función de QR próximamente", "info");
      }
    });
  }

  setupChatTest() {
    const chatContainer = document.getElementById("chatContainer");
    if (!chatContainer) return;
    if (chatContainer.innerHTML.trim() === "") {
      this.addChatMessage("ai", this.userData?.aiGreeting || "¡Hola! ¿En qué puedo ayudarte?");
    }

    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("chatSendBtn");

    const sendMessage = () => {
      const message = (chatInput.value || "").trim();
      if (!message) return;
      this.addChatMessage("user", message);
      chatInput.value = "";
      setTimeout(() => {
        this.addChatMessage("ai", this.generateAIResponse(message));
      }, 700);
    };

    sendBtn?.addEventListener("click", sendMessage);
    chatInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  addChatMessage(type, content) {
    const chatContainer = document.getElementById("chatContainer");
    if (!chatContainer) return;
    const el = document.createElement("div");
    el.className = `chat-message ${type}`;
    el.innerHTML = `<div class="message-content">${content}</div><div class="message-time">${new Date().toLocaleTimeString()}</div>`;
    chatContainer.appendChild(el);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  generateAIResponse(userMessage) {
    const responses = {
      precio: `Los precios varían según el producto. ¿Qué producto te interesa?`,
      horarios: this.userData?.horarios ? this.formatScheduleForAI() : "Nuestros horarios están disponibles en la sección Horarios.",
      productos: this.products.length > 0 ? `Tenemos ${this.products.length} productos. Algunos ejemplos: ${this.products.slice(0,3).map(p=>p.nombre).join(", ")}` : "Nuestro catálogo se está cargando.",
      contacto: `Podés contactarnos al ${this.userData?.telefono || "teléfono disponible"}.`,
      default: "Gracias por tu consulta. ¿En qué más puedo ayudarte?"
    };
    const msg = userMessage.toLowerCase();
    for (const key of Object.keys(responses)) {
      if (msg.includes(key)) return responses[key];
    }
    return responses.default;
  }

  formatScheduleForAI() {
    if (!this.userData?.horarios) return "Horarios no disponibles.";
    const names = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };
    return Object.entries(this.userData.horarios || {})
      .filter(([_, h]) => !h.closed)
      .map(([d, h]) => {
        const name = names[d] || d;
        return h.continuous ? `${name}: ${h.open} a ${h.close}` : `${name}: ${h.morning.open} a ${h.morning.close} y ${h.afternoon.open} a ${h.afternoon.close}`;
      }).join(", ") || "Horarios no disponibles.";
  }

  // Estadísticas (placeholder visual)
  renderStats() {
    const grid = document.getElementById("statsGrid");
    if (!grid) return;
    const stats = [
      { icon: "fas fa-comments", label: "Consultas Totales", value: this.userData?.stats?.consultas || "156" },
      { icon: "fas fa-users", label: "Clientes Únicos", value: this.userData?.stats?.clientes || "89" },
      { icon: "fas fa-box", label: "Productos", value: this.products.length || 0 },
      { icon: "fas fa-robot", label: "IA Generada", value: this.userData?.aiGenerated ? "Sí" : "No" }
    ];
    grid.innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-icon"><i class="${s.icon}"></i></div>
        <div class="stat-body">
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
        </div>
      </div>
    `).join("");
  }

  // Export / import / clear productos
  exportProducts() {
    if (this.products.length === 0) {
      this.showToast("Info", "No hay productos para exportar", "info");
      return;
    }
    const headers = ["Nombre","Precio","Categoría","Descripción","Stock","Código"];
    const rows = this.products.map(p => [p.nombre, p.precio, p.categoria || "", p.descripcion || "", p.stock ?? "", p.codigo || ""]);
    const csv = [headers, ...rows].map(r => r.map(field => `"${String(field).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productos_${(this.userData?.nombreComercio || "comercio").replace(/\s+/g,"_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast("Éxito", "Productos exportados", "success");
  }

  async processExcelFile(file) {
    try {
      this.showLoading("Procesando archivo.");
      const text = await file.text();
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(s => s.trim());
        const [nombre, precioStr = "0", categoria = "Otros", descripcion = "", stockStr = "", codigo = ""] = parts;
        const precio = parseFloat(precioStr) || 0;
        if (!nombre || precio <= 0) continue;
        await addDoc(collection(db, "usuarios", this.currentUser.uid, "productos"), {
          nombre, precio, categoria, descripcion, stock: parseInt(stockStr) || null, codigo, fechaCreacion: new Date()
        });
        count++;
      }
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast("Éxito", `${count} productos importados`, "success");
    } catch (error) {
      this.hideLoading();
      console.error(error);
      this.showToast("Error", "No se pudo procesar el archivo", "error");
    }
  }

  async clearAllProducts() {
    if (!confirm("¿Eliminar todos los productos? Esta acción no puede deshacerse.")) return;
    try {
      this.showLoading("Eliminando productos.");
      const ref = collection(db, "usuarios", this.currentUser.uid, "productos");
      const snap = await getDocs(ref);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "usuarios", this.currentUser.uid, "productos", d.id))));
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast("Éxito", "Todos los productos eliminados", "success");
    } catch (error) {
      this.hideLoading();
      console.error(error);
      this.showToast("Error", "No se pudieron eliminar los productos", "error");
    }
  }

  // Helpers: update fields
  async updateUserField(field, value) {
    try {
      await updateDoc(doc(db, "usuarios", this.currentUser.uid), { [field]: value });
      this.userData = { ...(this.userData || {}), [field]: value };
      this.updateProgressIndicator();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      this.showToast("Error", `No se pudo actualizar ${field}`, "error");
    }
  }

  updateScheduleField(day, ...args) {
    if (!this.userData) this.userData = {};
    if (!this.userData.horarios) this.userData.horarios = {};
    if (!this.userData.horarios[day]) this.userData.horarios[day] = {};
    if (args.length === 2) {
      const [field, value] = args;
      this.userData.horarios[day][field] = value;
    } else if (args.length === 3) {
      const [period, field, value] = args;
      if (!this.userData.horarios[day][period]) this.userData.horarios[day][period] = {};
      this.userData.horarios[day][period][field] = value;
    }
  }

  // UI: loading + toast
  showLoading(text = "Cargando...") {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    if (!overlay) return;
    if (loadingText) loadingText.textContent = text;
    overlay.classList.add("show");
  }

  hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.classList.remove("show");
  }

  showToast(title, message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const icons = { success: "fas fa-check-circle", error: "fas fa-exclamation-circle", warning: "fas fa-exclamation-triangle", info: "fas fa-info-circle" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 50);
    const remove = () => {
      toast.classList.remove("show");
      setTimeout(() => container.contains(toast) && container.removeChild(toast), 300);
    };
    toast.querySelector(".toast-close")?.addEventListener("click", remove);
    setTimeout(remove, 5000);
  }

  renderInitialContent() {
    this.renderProgressSteps([]);
  }

  // EVENT LISTENERS: formularios y botones
  setupEventListeners() {
    // Comercio form (guardar)
    const comercioForm = document.getElementById("comercioForm");
    comercioForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(comercioForm);
        const basic = {
          nombreComercio: fd.get("nombreComercio") || "",
          descripcion: fd.get("descripcion") || "",
          direccion: fd.get("direccion") || "",
          ciudad: fd.get("ciudad") || "",
          pais: fd.get("pais") || ""
        };
        const contact = {
          telefono: fd.get("telefono") || "",
          whatsapp: fd.get("whatsapp") || "",
          email: fd.get("email") || "",
          website: fd.get("website") || ""
        };
        const payments = Array.from(document.querySelectorAll("input[name='paymentMethods']:checked")).map(i => i.value);
        const payload = { ...basic, ...contact, paymentMethods: payments };
        this.showLoading("Guardando información...");
        await updateDoc(doc(db, "usuarios", this.currentUser.uid), payload);
        this.userData = { ...(this.userData || {}), ...payload };
        this.hideLoading();
        this.updateUserUI();
        this.updateProgressIndicator();
        this.showToast("Éxito", "Información guardada", "success");
      } catch (error) {
        this.hideLoading();
        console.error(error);
        this.showToast("Error", "No se pudo guardar la información", "error");
      }
    });

    // Reset form
    document.getElementById("resetForm")?.addEventListener("click", () => {
      comercioForm?.reset();
      this.showToast("Acción", "Formulario limpiado", "info");
    });

    // Guardar horarios
    document.getElementById("saveSchedule")?.addEventListener("click", async () => {
      const grid = document.getElementById("scheduleGrid");
      if (!grid) return;
      const days = Array.from(grid.querySelectorAll(".schedule-day"));
      const horarios = {};
      days.forEach(dayEl => {
        const day = dayEl.dataset.day;
        const enabled = dayEl.querySelector(".day-toggle input[type='checkbox']")?.checked ?? true;
        if (!enabled) {
          horarios[day] = { closed: true };
          return;
        }
        const continuous = dayEl.querySelector(`input[name="${day}_mode"][value="continuous"]`)?.checked ?? false;
        if (continuous) {
          const inputs = dayEl.querySelectorAll(".continuous-schedule input[type='time']");
          horarios[day] = { closed: false, continuous: true, open: inputs[0]?.value || "09:00", close: inputs[1]?.value || "18:00" };
        } else {
          const mOpen = dayEl.querySelector(".morning-hours input[type='time']")?.value || "08:00";
          const mClose = dayEl.querySelectorAll(".morning-hours input[type='time']")[1]?.value || "12:00";
          const aOpen = dayEl.querySelector(".afternoon-hours input[type='time']")?.value || "16:00";
          const aClose = dayEl.querySelectorAll(".afternoon-hours input[type='time']")[1]?.value || "20:00";
          horarios[day] = {
            closed: false,
            continuous: false,
            morning: { open: mOpen, close: mClose },
            afternoon: { open: aOpen, close: aClose }
          };
        }
      });
      try {
        this.showLoading("Guardando horarios...");
        await updateDoc(doc(db, "usuarios", this.currentUser.uid), { horarios });
        this.userData = { ...(this.userData || {}), horarios };
        this.hideLoading();
        this.showToast("Éxito", "Horarios guardados", "success");
        this.updateProgressIndicator();
      } catch (error) {
        this.hideLoading();
        console.error(error);
        this.showToast("Error", "No se pudieron guardar los horarios", "error");
      }
    });

    // Product form submit
    document.getElementById("productForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {
        nombre: fd.get("productName"),
        precio: parseFloat(fd.get("productPrice")) || 0,
        categoria: fd.get("productCategory") || "",
        descripcion: fd.get("productDescription") || "",
        stock: fd.get("productStock") ? parseInt(fd.get("productStock")) : null,
        codigo: fd.get("productCode") || "",
        fechaCreacion: new Date()
      };
      if (!data.nombre || !data.precio || !data.categoria) {
        this.showToast("Error", "Complete los campos requeridos del producto", "error");
        return;
      }
      try {
        this.showLoading("Guardando producto.");
        if (this.editingProductId) {
          await updateDoc(doc(db, "usuarios", this.currentUser.uid, "productos", this.editingProductId), data);
          this.editingProductId = null;
        } else {
          await addDoc(collection(db, "usuarios", this.currentUser.uid, "productos"), data);
        }
        await this.loadProducts();
        this.renderProductsTable();
        this.updateProgressIndicator();
        form.reset();
        this.hideLoading();
        this.showToast("Éxito", "Producto registrado", "success");
      } catch (err) {
        this.hideLoading();
        console.error(err);
        this.showToast("Error", "No se pudo guardar el producto", "error");
      }
    });

    // Clear product form
    document.getElementById("clearProduct")?.addEventListener("click", () => {
      document.getElementById("productForm")?.reset();
      this.editingProductId = null;
    });

    // File upload (CSV)
    const excelInput = document.getElementById("excelFile");
    const fileUpload = document.getElementById("fileUpload");
    fileUpload?.addEventListener("click", () => excelInput?.click());
    excelInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (file) await this.processExcelFile(file);
    });

    // Drag & drop
    fileUpload?.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileUpload.classList.add("dragover");
    });
    fileUpload?.addEventListener("dragleave", () => fileUpload.classList.remove("dragover"));
    fileUpload?.addEventListener("drop", async (e) => {
      e.preventDefault();
      fileUpload.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file) await this.processExcelFile(file);
    });

    // Export / Clear products buttons
    document.getElementById("exportProducts")?.addEventListener("click", () => this.exportProducts());
    document.getElementById("clearProducts")?.addEventListener("click", () => this.clearAllProducts());

    // AI: generar
    const aiForm = document.getElementById("aiConfigForm");
    aiForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(aiForm);
      if (!fd.get("aiName") || !fd.get("aiPersonality") || !fd.get("aiTone") || !fd.get("aiGreeting")) {
        this.showToast("Error", "Complete los campos de configuración de la IA", "error");
        return;
      }
      await this.generateAI(fd);
    });
    document.getElementById("previewAI")?.addEventListener("click", () => {
      this.renderAISection();
      this.showToast("Vista previa", "Vista previa de la IA actualizada", "info");
    });
  }

  // Generar IA
  async generateAI(formData) {
    if (!this.userData?.nombreComercio || this.products.length === 0) {
      this.showToast("Advertencia", "Completa la info del comercio y agrega productos", "warning");
      return;
    }
    try {
      this.showLoading("Generando tu IA.");
      const config = {
        aiName: formData.get("aiName"),
        aiPersonality: formData.get("aiPersonality"),
        aiTone: formData.get("aiTone"),
        aiGreeting: formData.get("aiGreeting"),
        aiGenerated: true,
        fechaGeneracion: new Date()
      };
      await updateDoc(doc(db, "usuarios", this.currentUser.uid), config);
      this.userData = { ...(this.userData || {}), ...config };
      this.updateProgressIndicator();
      this.renderAISection();
      this.hideLoading();
      this.showToast("Éxito", "¡Tu asistente de IA está listo!", "success");
    } catch (error) {
      this.hideLoading();
      console.error(error);
      this.showToast("Error", "No se pudo generar la IA", "error");
    }
  }
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  new Dashboard();
});
