// dashboard.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

class Dashboard {
  constructor() {
    this.currentUser = null;
    this.userData = null;
    this.currentTab = 'comercio';
    this.products = [];
    this.categories = [];
    this.init();
  }

  init() {
    this.setupAuth();
    this.setupTabs();
    this.setupForms();
    this.setupEventListeners();
    this.renderInitialContent();
  }

  // 🔐 Autenticación
  setupAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData();
        this.updateUserUI();
        this.updateProgressIndicator();
      } else {
        window.location.href = 'index.html';
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = 'index.html';
      } catch (error) {
        this.showToast('Error', 'No se pudo cerrar sesión', 'error');
      }
    });
  }

  async loadUserData() {
    try {
      const userDoc = await getDoc(doc(db, "usuarios", this.currentUser.uid));
      if (userDoc.exists()) {
        this.userData = userDoc.data();
        await this.loadProducts();
        await this.loadCategories();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  updateUserUI() {
    if (!this.userData) return;
    
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');

    if (userAvatar) {
      userAvatar.textContent = (this.userData.nombre || this.currentUser.email).charAt(0).toUpperCase();
    }
    if (userName) {
      userName.textContent = this.userData.nombre || 'Usuario';
    }
    if (userEmail) {
      userEmail.textContent = this.currentUser.email;
    }
  }

  // 📊 Progress Indicator
  updateProgressIndicator() {
    const steps = [
      { id: 'plan', label: 'Plan', completed: !!this.userData?.plan },
      { id: 'info', label: 'Información', completed: !!(this.userData?.nombreComercio && this.userData?.telefono) },
      { id: 'horarios', label: 'Horarios', completed: !!this.userData?.horarios },
      { id: 'productos', label: 'Productos', completed: this.products.length > 0 },
      { id: 'ia', label: 'IA', completed: !!this.userData?.aiGenerated }
    ];

    const completed = steps.filter(step => step.completed).length;
    const percentage = Math.round((completed / steps.length) * 100);

    // Update progress bar
    const progressFill = document.getElementById('completionFill');
    const progressText = document.getElementById('completionText');
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}% completado`;

    // Render steps
    this.renderProgressSteps(steps);
  }

  renderProgressSteps(steps) {
    const container = document.getElementById('progressSteps');
    if (!container) return;

    container.innerHTML = steps.map(step => `
      <div class="progress-step ${step.completed ? 'completed' : ''}">
        <div class="step-icon">
          <i class="fas ${step.completed ? 'fa-check' : 'fa-circle'}"></i>
        </div>
        <div class="step-label">${step.label}</div>
      </div>
    `).join('');
  }

  // 🗂️ Tabs System
  setupTabs() {
    const tabs = [
      { id: 'comercio', label: 'Mi Comercio', icon: 'fas fa-store' },
      { id: 'horarios', label: 'Horarios', icon: 'fas fa-clock' },
      { id: 'productos', label: 'Productos', icon: 'fas fa-box' },
      { id: 'ia', label: 'Mi IA', icon: 'fas fa-robot' },
      { id: 'estadisticas', label: 'Estadísticas', icon: 'fas fa-chart-line' }
    ];

    const tabNav = document.getElementById('tabNav');
    if (tabNav) {
      tabNav.innerHTML = tabs.map(tab => `
        <button class="tab-btn ${tab.id === this.currentTab ? 'active' : ''}" data-tab="${tab.id}">
          <i class="${tab.icon}"></i>
          <span>${tab.label}</span>
        </button>
      `).join('');

      // Tab click handlers
      tabNav.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
          this.switchTab(tabBtn.dataset.tab);
        }
      });
    }
  }

  switchTab(tabId) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
    
    this.currentTab = tabId;

    // Load tab-specific content
    switch(tabId) {
      case 'productos':
        this.renderProductsTable();
        break;
      case 'ia':
        this.renderAISection();
        break;
      case 'estadisticas':
        this.renderStats();
        break;
    }
  }

  // 📝 Forms Setup
  setupForms() {
    this.renderComercioForm();
    this.renderScheduleForm();
    this.renderProductForm();
    this.renderAIConfigForm();
  }

  renderComercioForm() {
    // Plan selector
    const planSelector = document.getElementById('planSelector');
    if (planSelector) {
      const plans = [
        { id: 'basic', name: 'Básico', price: 'Gratis', features: ['50 consultas/mes', 'Soporte básico'] },
        { id: 'pro', name: 'Pro', price: '$29/mes', features: ['500 consultas/mes', 'Soporte prioritario', 'Estadísticas avanzadas'] },
        { id: 'premium', name: 'Premium', price: '$59/mes', features: ['Consultas ilimitadas', 'Soporte 24/7', 'Integraciones'] }
      ];

      planSelector.innerHTML = plans.map(plan => `
        <div class="plan-card ${this.userData?.plan === plan.id ? 'selected' : ''}" data-plan="${plan.id}">
          <div class="plan-header">
            <h4>${plan.name}</h4>
            <div class="plan-price">${plan.price}</div>
          </div>
          <div class="plan-features">
            ${plan.features.map(feature => `<div class="feature"><i class="fas fa-check"></i> ${feature}</div>`).join('')}
          </div>
        </div>
      `).join('');

      planSelector.addEventListener('click', (e) => {
        const card = e.target.closest('.plan-card');
        if (card) {
          document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.updateUserField('plan', card.dataset.plan);
        }
      });
    }

    // Basic info fields
    const basicFields = [
      { id: 'nombreComercio', label: 'Nombre del Comercio', type: 'text', required: true },
      { id: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: true },
      { id: 'ciudad', label: 'Ciudad', type: 'text', required: true }
    ];

    this.renderFormFields('basicInfoFields', basicFields);

    // Contact fields
    const contactFields = [
      { id: 'telefono', label: 'Teléfono', type: 'tel', required: true },
      { id: 'whatsapp', label: 'WhatsApp', type: 'tel', required: false },
      { id: 'email', label: 'Email de contacto', type: 'email', required: false },
      { id: 'website', label: 'Sitio web', type: 'url', required: false }
    ];

    this.renderFormFields('contactFields', contactFields);

    // Payment methods
    const paymentMethods = [
      'Efectivo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Transferencia',
      'MercadoPago', 'PayPal', 'Crypto', 'Cheque'
    ];

    const paymentContainer = document.getElementById('paymentMethods');
    if (paymentContainer) {
      paymentContainer.innerHTML = paymentMethods.map(method => `
        <label class="checkbox-item">
          <input type="checkbox" name="paymentMethods" value="${method}" 
                 ${this.userData?.paymentMethods?.includes(method) ? 'checked' : ''}>
          <span class="checkbox-text">${method}</span>
        </label>
      `).join('');
    }
  }

  renderScheduleForm() {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const scheduleGrid = document.getElementById('scheduleGrid');
    
    if (scheduleGrid) {
      scheduleGrid.innerHTML = days.map(day => {
        const dayData = this.userData?.horarios?.[day.toLowerCase()] || { open: '09:00', close: '18:00', closed: false };
        
        return `
          <div class="schedule-day">
            <div class="day-header">
              <label class="day-toggle">
                <input type="checkbox" ${dayData.closed ? '' : 'checked'} onchange="toggleDay('${day.toLowerCase()}', this)">
                <span>${day}</span>
              </label>
            </div>
            <div class="day-hours ${dayData.closed ? 'disabled' : ''}">
              <div class="time-input">
                <label>Abre:</label>
                <input type="time" value="${dayData.open}" onchange="updateSchedule('${day.toLowerCase()}', 'open', this.value)">
              </div>
              <div class="time-input">
                <label>Cierra:</label>
                <input type="time" value="${dayData.close}" onchange="updateSchedule('${day.toLowerCase()}', 'close', this.value)">
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Global functions for schedule
    window.toggleDay = (day, checkbox) => {
      const dayHours = checkbox.closest('.schedule-day').querySelector('.day-hours');
      if (checkbox.checked) {
        dayHours.classList.remove('disabled');
      } else {
        dayHours.classList.add('disabled');
      }
      this.updateScheduleField(day, 'closed', !checkbox.checked);
    };

    window.updateSchedule = (day, field, value) => {
      this.updateScheduleField(day, field, value);
    };
  }

  renderProductForm() {
    const productFields = [
      { id: 'productName', label: 'Nombre del Producto', type: 'text', required: true },
      { id: 'productPrice', label: 'Precio', type: 'number', required: true, step: '0.01' },
      { id: 'productCategory', label: 'Categoría', type: 'select', required: true, options: this.categories },
      { id: 'productDescription', label: 'Descripción', type: 'textarea', required: false },
      { id: 'productStock', label: 'Stock', type: 'number', required: false },
      { id: 'productCode', label: 'Código', type: 'text', required: false }
    ];

    this.renderFormFields('productFields', productFields);
  }

  renderAIConfigForm() {
    const aiFields = [
      { id: 'aiName', label: 'Nombre del Asistente', type: 'text', required: true, placeholder: 'ej: Ana, tu asistente virtual' },
      { id: 'aiPersonality', label: 'Personalidad', type: 'select', required: true, options: [
        'Amigable y cercano', 'Profesional', 'Divertido', 'Formal', 'Casual'
      ]},
      { id: 'aiTone', label: 'Tono de Voz', type: 'select', required: true, options: [
        'Entusiasta', 'Relajado', 'Serio', 'Jovial', 'Elegante'
      ]},
      { id: 'aiGreeting', label: 'Saludo Inicial', type: 'textarea', required: true, 
        placeholder: 'ej: ¡Hola! Soy Ana, tu asistente virtual. ¿En qué puedo ayudarte hoy?' }
    ];

    this.renderFormFields('aiConfigFields', aiFields);
  }

  // 🎨 Form Rendering Helpers
  renderFormFields(containerId, fields) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = fields.map(field => {
      let fieldHTML = '';
      const value = this.userData?.[field.id] || '';

      switch(field.type) {
        case 'textarea':
          fieldHTML = `<textarea id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${value}</textarea>`;
          break;
        case 'select':
          const options = Array.isArray(field.options) ? field.options : [];
          fieldHTML = `
            <select id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
              <option value="">Seleccionar...</option>
              ${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          `;
          break;
        default:
          fieldHTML = `<input type="${field.type}" id="${field.id}" name="${field.id}" value="${value}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} ${field.step ? `step="${field.step}"` : ''}>`;
      }

      return `
        <div class="form-field">
          <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
          ${fieldHTML}
          <div class="error-message">Este campo es requerido</div>
        </div>
      `;
    }).join('');
  }

  // 📦 Products Management
  async loadProducts() {
    try {
      const productsRef = collection(db, "usuarios", this.currentUser.uid, "productos");
      const q = query(productsRef, orderBy("nombre"));
      const querySnapshot = await getDocs(q);
      
      this.products = [];
      querySnapshot.forEach((doc) => {
        this.products.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async loadCategories() {
    const defaultCategories = ['Electrónicos', 'Ropa', 'Hogar', 'Deportes', 'Libros', 'Otros'];
    this.categories = this.userData?.categories || defaultCategories;
    this.renderCategoriesGrid();
  }

  renderCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    grid.innerHTML = this.categories.map((category, index) => `
      <div class="category-tag">
        <span>${category}</span>
        <button onclick="removeCategory(${index})" class="remove-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    window.removeCategory = (index) => {
      this.categories.splice(index, 1);
      this.updateUserField('categories', this.categories);
      this.renderCategoriesGrid();
      this.renderProductForm();
    };
  }

  renderProductsTable() {
    const tableHead = document.getElementById('productsTableHead');
    const tableBody = document.getElementById('productsTableBody');
    
    if (!tableHead || !tableBody) return;

    if (this.products.length === 0) {
      tableHead.innerHTML = '';
      tableBody.innerHTML = '<tr><td colspan="100%" class="empty-state-row">No hay productos registrados</td></tr>';
      return;
    }

    tableHead.innerHTML = `
      <tr>
        <th>Nombre</th>
        <th>Categoría</th>
        <th>Precio</th>
        <th>Stock</th>
        <th>Acciones</th>
      </tr>
    `;

    tableBody.innerHTML = this.products.map(product => `
      <tr>
        <td>${product.nombre}</td>
        <td>${product.categoria}</td>
        <td>$${product.precio}</td>
        <td>${product.stock || 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editProduct('${product.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

    window.editProduct = (id) => {
      const product = this.products.find(p => p.id === id);
      if (product) {
        // Populate form with product data
        Object.keys(product).forEach(key => {
          const field = document.getElementById(`product${key.charAt(0).toUpperCase() + key.slice(1)}`);
          if (field) field.value = product[key];
        });
        this.showToast('Producto cargado', 'Datos cargados en el formulario para editar', 'info');
      }
    };

    window.deleteProduct = async (id) => {
      if (confirm('¿Estás seguro de eliminar este producto?')) {
        try {
          await deleteDoc(doc(db, "usuarios", this.currentUser.uid, "productos", id));
          await this.loadProducts();
          this.renderProductsTable();
          this.updateProgressIndicator();
          this.showToast('Producto eliminado', 'El producto ha sido eliminado correctamente', 'success');
        } catch (error) {
          this.showToast('Error', 'No se pudo eliminar el producto', 'error');
        }
      }
    };
  }

  // 🤖 AI Section
  renderAISection() {
    const hasRequiredData = this.userData?.nombreComercio && this.products.length > 0;
    const noAIMessage = document.getElementById('noAIMessage');
    const aiPreviewSection = document.getElementById('aiPreviewSection');
    const aiTestSection = document.getElementById('aiTestSection');

    if (!hasRequiredData) {
      noAIMessage?.classList.remove('hidden');
      aiPreviewSection?.classList.add('hidden');
      aiTestSection?.classList.add('hidden');
    } else if (this.userData?.aiGenerated) {
      noAIMessage?.classList.add('hidden');
      aiPreviewSection?.classList.remove('hidden');
      aiTestSection?.classList.remove('hidden');
      this.renderAIPreview();
      this.setupChatTest();
    } else {
      noAIMessage?.classList.add('hidden');
      aiPreviewSection?.classList.add('hidden');
      aiTestSection?.classList.add('hidden');
    }
  }

  renderAIPreview() {
    const linkDisplay = document.getElementById('aiLinkDisplay');
    const actions = document.getElementById('aiActions');
    
    if (linkDisplay) {
      const aiLink = `https://indiceia.com/chat/${this.userData.referralId}`;
      linkDisplay.innerHTML = `
        <div class="link-box">
          <input type="text" value="${aiLink}" readonly>
          <button onclick="copyToClipboard('${aiLink}')" class="btn btn-outline">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      `;
    }

    if (actions) {
      actions.innerHTML = `
        <button class="btn btn-primary" onclick="shareWhatsApp()">
          <i class="fab fa-whatsapp"></i> Compartir por WhatsApp
        </button>
        <button class="btn btn-secondary" onclick="generateQR()">
          <i class="fas fa-qrcode"></i> Generar QR
        </button>
      `;
    }

    // Global functions
    window.copyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('Copiado', 'Link copiado al portapapeles', 'success');
      });
    };

    window.shareWhatsApp = () => {
      const message = `¡Hola! Puedes chatear con mi asistente de IA aquí: https://indiceia.com/chat/${this.userData.referralId}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    window.generateQR = () => {
      this.showToast('QR', 'Función de QR próximamente', 'info');
    };
  }

  setupChatTest() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const chatContainer = document.getElementById('chatContainer');

    if (!chatContainer) return;

    // Initial message
    if (!chatContainer.innerHTML.trim()) {
      this.addChatMessage('ai', this.userData.aiGreeting || '¡Hola! ¿En qué puedo ayudarte?');
    }

    const sendMessage = () => {
      const message = chatInput.value.trim();
      if (!message) return;

      this.addChatMessage('user', message);
      chatInput.value = '';

      // Simulate AI response
      setTimeout(() => {
        const response = this.generateAIResponse(message);
        this.addChatMessage('ai', response);
      }, 1000);
    };

    sendBtn?.addEventListener('click', sendMessage);
    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  addChatMessage(type, content) {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    messageDiv.innerHTML = `
      <div class="message-content">${content}</div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  generateAIResponse(userMessage) {
    const responses = {
      precio: `Los precios de nuestros productos varían. ¿Hay algún producto específico que te interese?`,
      horarios: this.userData?.horarios ? `Nuestros horarios son: ${Object.entries(this.userData.horarios).map(([day, hours]) => 
        hours.closed ? '' : `${day}: ${hours.open}-${hours.close}`).filter(Boolean).join(', ')}` : 'Consulta nuestros horarios de atención.',
      productos: this.products.length > 0 ? `Tenemos ${this.products.length} productos disponibles. Algunos de nuestros productos son: ${this.products.slice(0, 3).map(p => p.nombre).join(', ')}.` : 'Estamos actualizando nuestro catálogo.',
      contacto: `Puedes contactarnos al ${this.userData?.telefono || 'teléfono disponible en nuestra información'}.`,
      default: 'Gracias por tu consulta. ¿En qué más puedo ayudarte?'
    };

    const message = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (message.includes(key)) return response;
    }
    return responses.default;
  }

  // 📊 Statistics
  renderStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const stats = [
      { icon: 'fas fa-comments', label: 'Consultas Totales', value: '156', color: 'blue' },
      { icon: 'fas fa-users', label: 'Clientes Únicos', value: '89', color: 'green' },
      { icon: 'fas fa-chart-line', label: 'Conversiones', value: '23', color: 'orange' },
      { icon: 'fas fa-star', label: 'Satisfacción', value: '4.8', color: 'purple' }
    ];

    statsGrid.innerHTML = stats.map(stat => `
      <div class="stat-card ${stat.color}">
        <div class="stat-icon">
          <i class="${stat.icon}"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">${stat.value}</div>
          <div class="stat-label">${stat.label}</div>
        </div>
      </div>
    `).join('');
  }

  // 📝 Event Listeners
  setupEventListeners() {
    // Comercio form
    document.getElementById('comercioForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveComercioData(new FormData(e.target));
    });

    // Reset form
    document.getElementById('resetForm')?.addEventListener('click', () => {
      document.getElementById('comercioForm')?.reset();
      this.showToast('Formulario limpiado', 'Los campos han sido restablecidos', 'info');
    });

    // Save schedule
    document.getElementById('saveSchedule')?.addEventListener('click', async () => {
      await this.saveScheduleData();
    });

    // Category management
    document.getElementById('addCategory')?.addEventListener('click', () => {
      const input = document.getElementById('newCategory');
      const category = input?.value.trim();
      if (category && !this.categories.includes(category)) {
        this.categories.push(category);
        this.updateUserField('categories', this.categories);
        this.renderCategoriesGrid();
        this.renderProductForm();
        input.value = '';
        this.showToast('Categoría agregada', `"${category}" ha sido agregada`, 'success');
      }
    });

    // Product form
    document.getElementById('productForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveProduct(new FormData(e.target));
    });

    // Clear product form
    document.getElementById('clearProduct')?.addEventListener('click', () => {
      document.getElementById('productForm')?.reset();
    });

    // AI Config form
    document.getElementById('aiConfigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.generateAI(new FormData(e.target));
    });

    // File upload
    this.setupFileUpload();

    // Export products
    document.getElementById('exportProducts')?.addEventListener('click', () => {
      this.exportProducts();
    });

    // Clear all products
    document.getElementById('clearProducts')?.addEventListener('click', async () => {
      if (confirm('¿Estás seguro de eliminar todos los productos?')) {
        await this.clearAllProducts();
      }
    });
  }

  setupFileUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('excelFile');

    fileUpload?.addEventListener('click', () => fileInput?.click());
    fileUpload?.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUpload.classList.add('dragover');
    });
    fileUpload?.addEventListener('dragleave', () => {
      fileUpload.classList.remove('dragover');
    });
    fileUpload?.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUpload.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processExcelFile(files[0]);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.processExcelFile(e.target.files[0]);
      }
    });
  }

  // 💾 Data Management
  async saveComercioData(formData) {
    try {
      this.showLoading('Guardando información...');
      
      const updateData = {};
      for (let [key, value] of formData.entries()) {
        updateData[key] = value;
      }

      // Handle payment methods
      const paymentMethods = formData.getAll('paymentMethods');
      updateData.paymentMethods = paymentMethods;

      await updateDoc(doc(db, "usuarios", this.currentUser.uid), updateData);
      this.userData = { ...this.userData, ...updateData };
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast('Información guardada', 'Los datos del comercio han sido actualizados', 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('Error', 'No se pudo guardar la información', 'error');
      console.error('Error saving comercio data:', error);
    }
  }

  async saveScheduleData() {
    try {
      this.showLoading('Guardando horarios...');
      
      const scheduleData = {};
      const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
      
      days.forEach(day => {
        const dayElement = document.querySelector(`[onchange*="${day}"]`)?.closest('.schedule-day');
        if (dayElement) {
          const checkbox = dayElement.querySelector('input[type="checkbox"]');
          const openTime = dayElement.querySelector('input[type="time"]:first-of-type')?.value;
          const closeTime = dayElement.querySelector('input[type="time"]:last-of-type')?.value;
          
          scheduleData[day] = {
            closed: !checkbox?.checked,
            open: openTime || '09:00',
            close: closeTime || '18:00'
          };
        }
      });

      await updateDoc(doc(db, "usuarios", this.currentUser.uid), { horarios: scheduleData });
      this.userData.horarios = scheduleData;
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast('Horarios guardados', 'Los horarios de atención han sido actualizados', 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('Error', 'No se pudieron guardar los horarios', 'error');
      console.error('Error saving schedule:', error);
    }
  }

  async saveProduct(formData) {
    try {
      this.showLoading('Guardando producto...');
      
      const productData = {
        nombre: formData.get('productName'),
        precio: parseFloat(formData.get('productPrice')),
        categoria: formData.get('productCategory'),
        descripcion: formData.get('productDescription') || '',
        stock: parseInt(formData.get('productStock')) || null,
        codigo: formData.get('productCode') || '',
        fechaCreacion: new Date()
      };

      // Validate required fields
      if (!productData.nombre || !productData.precio || !productData.categoria) {
        throw new Error('Campos requeridos faltantes');
      }

      await addDoc(collection(db, "usuarios", this.currentUser.uid, "productos"), productData);
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      document.getElementById('productForm')?.reset();
      this.hideLoading();
      this.showToast('Producto agregado', 'El producto ha sido registrado correctamente', 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('Error', 'No se pudo guardar el producto', 'error');
      console.error('Error saving product:', error);
    }
  }

  async generateAI(formData) {
    try {
      if (!this.userData?.nombreComercio || this.products.length === 0) {
        this.showToast('Información incompleta', 'Completa la información del comercio y agrega productos primero', 'warning');
        return;
      }

      this.showLoading('Generando tu IA...');
      
      const aiConfig = {
        aiName: formData.get('aiName'),
        aiPersonality: formData.get('aiPersonality'),
        aiTone: formData.get('aiTone'),
        aiGreeting: formData.get('aiGreeting'),
        aiGenerated: true,
        fechaGeneracion: new Date()
      };

      await updateDoc(doc(db, "usuarios", this.currentUser.uid), aiConfig);
      this.userData = { ...this.userData, ...aiConfig };
      this.updateProgressIndicator();
      this.renderAISection();
      this.hideLoading();
      this.showToast('IA Generada', '¡Tu asistente de IA está listo! Puedes probarlo abajo', 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('Error', 'No se pudo generar la IA', 'error');
      console.error('Error generating AI:', error);
    }
  }

  // 📁 File Processing
  async processExcelFile(file) {
    try {
      this.showLoading('Procesando archivo Excel...');
      
      // Simple CSV/Excel processing simulation
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      let processedCount = 0;
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const productData = {
          nombre: values[0] || '',
          precio: parseFloat(values[1]) || 0,
          categoria: values[2] || 'Otros',
          descripcion: values[3] || '',
          stock: parseInt(values[4]) || null,
          codigo: values[5] || '',
          fechaCreacion: new Date()
        };

        if (productData.nombre && productData.precio > 0) {
          try {
            await addDoc(collection(db, "usuarios", this.currentUser.uid, "productos"), productData);
            processedCount++;
          } catch (error) {
            errors.push(`Línea ${i + 1}: ${error.message}`);
          }
        } else {
          errors.push(`Línea ${i + 1}: Datos inválidos`);
        }
      }

      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      this.hideLoading();

      if (processedCount > 0) {
        this.showToast('Productos importados', `${processedCount} productos importados correctamente`, 'success');
      }
      
      if (errors.length > 0) {
        console.warn('Import errors:', errors);
        this.showToast('Errores en importación', `${errors.length} errores encontrados`, 'warning');
      }
    } catch (error) {
      this.hideLoading();
      this.showToast('Error', 'No se pudo procesar el archivo', 'error');
      console.error('Error processing file:', error);
    }
  }

  // 📤 Export Functions
  exportProducts() {
    if (this.products.length === 0) {
      this.showToast('Sin productos', 'No hay productos para exportar', 'info');
      return;
    }

    const headers = ['Nombre', 'Precio', 'Categoría', 'Descripción', 'Stock', 'Código'];
    const csvContent = [
      headers.join(','),
      ...this.products.map(product => [
        product.nombre,
        product.precio,
        product.categoria,
        product.descripcion,
        product.stock || '',
        product.codigo
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos_${this.userData?.nombreComercio || 'comercio'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.showToast('Exportación completada', 'Los productos han sido exportados', 'success');
  }

  async clearAllProducts() {
    try {
      this.showLoading('Eliminando productos...');
      
      const productsRef = collection(db, "usuarios", this.currentUser.uid, "productos");
      const querySnapshot = await getDocs(productsRef);
      
      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast('Productos eliminados', 'Todos los productos han sido eliminados', 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('Error', 'No se pudieron eliminar los productos', 'error');
      console.error('Error clearing products:', error);
    }
  }

  // 🔧 Helper Functions
  async updateUserField(field, value) {
    try {
      await updateDoc(doc(db, "usuarios", this.currentUser.uid), { [field]: value });
      this.userData[field] = value;
      this.updateProgressIndicator();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  }

  updateScheduleField(day, field, value) {
    if (!this.userData.horarios) this.userData.horarios = {};
    if (!this.userData.horarios[day]) this.userData.horarios[day] = {};
    this.userData.horarios[day][field] = value;
  }

  showLoading(text = 'Cargando...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay && loadingText) {
      loadingText.textContent = text;
      overlay.classList.add('show');
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
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

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, 5000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    });
  }

  renderInitialContent() {
    // Pre-render content that doesn't depend on user data
    this.renderProgressSteps([]);
  }
}

// 🚀 Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new Dashboard();
});

// 🔧 Additional Global Functions (for backward compatibility)
window.toggleDay = function(day, checkbox) {
  if (window.dashboard) {
    const dayHours = checkbox.closest('.schedule-day').querySelector('.day-hours');
    if (checkbox.checked) {
      dayHours.classList.remove('disabled');
    } else {
      dayHours.classList.add('disabled');
    }
    window.dashboard.updateScheduleField(day, 'closed', !checkbox.checked);
  }
};

window.updateSchedule = function(day, field, value) {
  if (window.dashboard) {
    window.dashboard.updateScheduleField(day, field, value);
  }
};

window.removeCategory = function(index) {
  if (window.dashboard) {
    window.dashboard.categories.splice(index, 1);
    window.dashboard.updateUserField('categories', window.dashboard.categories);
    window.dashboard.renderCategoriesGrid();
    window.dashboard.renderProductForm();
  }
};

window.editProduct = function(id) {
  if (window.dashboard) {
    const product = window.dashboard.products.find(p => p.id === id);
    if (product) {
      // Populate form with product data
      Object.keys(product).forEach(key => {
        const fieldMap = {
          nombre: 'productName',
          precio: 'productPrice',
          categoria: 'productCategory',
          descripcion: 'productDescription',
          stock: 'productStock',
          codigo: 'productCode'
        };
        const fieldId = fieldMap[key];
        const field = document.getElementById(fieldId);
        if (field) field.value = product[key];
      });
      window.dashboard.showToast('Producto cargado', 'Datos cargados en el formulario para editar', 'info');
    }
  }
};

window.deleteProduct = async function(id) {
  if (window.dashboard && confirm('¿Estás seguro de eliminar este producto?')) {
    try {
      const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
      const { db } = await import("./firebase.js");
      
      await deleteDoc(doc(db, "usuarios", window.dashboard.currentUser.uid, "productos", id));
      await window.dashboard.loadProducts();
      window.dashboard.renderProductsTable();
      window.dashboard.updateProgressIndicator();
      window.dashboard.showToast('Producto eliminado', 'El producto ha sido eliminado correctamente', 'success');
    } catch (error) {
      window.dashboard.showToast('Error', 'No se pudo eliminar el producto', 'error');
    }
  }
};

window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    if (window.dashboard) {
      window.dashboard.showToast('Copiado', 'Link copiado al portapapeles', 'success');
    }
  });
};

window.shareWhatsApp = function() {
  if (window.dashboard && window.dashboard.userData) {
    const message = `¡Hola! Puedes chatear con mi asistente de IA aquí: https://indiceia.com/chat/${window.dashboard.userData.referralId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }
};

window.generateQR = function() {
  if (window.dashboard) {
    window.dashboard.showToast('QR', 'Función de QR próximamente', 'info');
  }
};
