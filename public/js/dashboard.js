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
  orderBy,
  writeBatch
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
    this.csvData = [];
    this.csvHeaders = [];
    this.currentProductType = "producto"; // producto | servicio
    this.init();
  }

  init() {
    this.setupAuth();
    this.setupTabs();
    this.setupForms();
    this.setupEventListeners();
    this.renderInitialContent();
    this.setupEnterpriseCSV();
  }

  // ============================================
  // ENTERPRISE CSV SYSTEM
  // ============================================
  
  setupEnterpriseCSV() {
    const fileUploadSection = document.querySelector("#fileUpload");
    if (!fileUploadSection) return;

    // Agregar elementos del sistema enterprise
    const existingButton = fileUploadSection.querySelector("button");
    const existingInput = fileUploadSection.querySelector("#excelFile");
    
    // Crear contenedor de preview
    const previewContainer = document.createElement("div");
    previewContainer.id = "csvPreviewContainer";
    previewContainer.className = "csv-preview-container hidden";
    previewContainer.innerHTML = `
      <div class="csv-preview-header">
        <h4><i class="fas fa-table"></i> Vista Previa y Mapeo de Columnas</h4>
        <p>Selecciona qué columnas corresponden a cada campo de tu inventario</p>
      </div>
      <div class="csv-preview-content" id="csvPreviewContent"></div>
      <div class="csv-preview-actions">
        <button type="button" class="btn btn-secondary" id="cancelCsvImport">
          <i class="fas fa-times"></i> Cancelar
        </button>
        <button type="button" class="btn btn-success" id="importCsvData" disabled>
          <i class="fas fa-upload"></i> Importar Datos
        </button>
      </div>
    `;
    
    fileUploadSection.appendChild(previewContainer);

    // Configurar eventos
    existingButton?.addEventListener("click", () => existingInput?.click());
    existingInput?.addEventListener("change", (e) => this.handleCSVFile(e));
    
    // Drag & Drop mejorado
    fileUploadSection.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileUploadSection.classList.add("dragover");
    });
    
    fileUploadSection.addEventListener("dragleave", () => {
      fileUploadSection.classList.remove("dragover");
    });
    
    fileUploadSection.addEventListener("drop", (e) => {
      e.preventDefault();
      fileUploadSection.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file) this.processCSVFile(file);
    });

    // Eventos de preview
    document.getElementById("cancelCsvImport")?.addEventListener("click", () => {
      this.hideCSVPreview();
    });
    
    document.getElementById("importCsvData")?.addEventListener("click", () => {
      this.importMappedCSV();
    });
  }

  async handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (file) {
      await this.processCSVFile(file);
    }
  }

  async processCSVFile(file) {
    try {
      this.showLoading("Procesando archivo CSV...");
      
      const text = await file.text();
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      
      if (lines.length < 2) {
        throw new Error("El archivo debe tener al menos una fila de encabezados y una de datos");
      }

      this.csvHeaders = this.parseCSVLine(lines[0]);
      this.csvData = lines.slice(1).map(line => this.parseCSVLine(line));
      
      this.hideLoading();
      this.showCSVPreview();
      
    } catch (error) {
      this.hideLoading();
      console.error("Error processing CSV:", error);
      this.showToast("Error", "No se pudo procesar el archivo CSV", "error");
    }
  }

  parseCSVLine(line) {
    // Parser CSV mejorado que maneja comillas
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  showCSVPreview() {
    const container = document.getElementById("csvPreviewContainer");
    const content = document.getElementById("csvPreviewContent");
    if (!container || !content) return;

    // Campos disponibles para mapeo
    const availableFields = [
      { key: "", label: "--Ignorar Columna--" },
      { key: "nombre", label: "Nombre/Título" },
      { key: "codigo", label: "Código/SKU" },
      { key: "categoria", label: "Categoría" },
      { key: "subcategoria", label: "Subcategoría" },
      { key: "descripcion", label: "Descripción" },
      { key: "imagen", label: "Imagen (URL)" },
      { key: "precio_valor", label: "Precio (Valor)" },
      { key: "precio_moneda", label: "Moneda" },
      { key: "stock", label: "Stock/Cantidad" },
      { key: "color", label: "Color" },
      { key: "talle", label: "Talle/Tamaño" },
      { key: "largo_cm", label: "Largo (cm)" },
      { key: "ancho_cm", label: "Ancho (cm)" },
      { key: "alto_cm", label: "Alto (cm)" },
      { key: "peso_kg", label: "Peso (kg)" },
      { key: "origen", label: "Origen" },
      { key: "contacto_telefono", label: "Teléfono Contacto" },
      { key: "contacto_email", label: "Email Contacto" },
      { key: "disponibilidad", label: "Disponibilidad" },
      { key: "duracion", label: "Duración" }
    ];

    // Crear tabla de mapeo
    const sampleRows = this.csvData.slice(0, 5);
    let html = `
      <div class="csv-mapping-table">
        <table class="table table-bordered">
          <thead>
            <tr>
              ${this.csvHeaders.map((header, idx) => `
                <th>
                  <div class="column-mapping">
                    <select class="form-select mapping-select" data-col-index="${idx}">
                      ${availableFields.map(field => `
                        <option value="${field.key}">${field.label}</option>
                      `).join("")}
                    </select>
                    <div class="original-header">${header}</div>
                  </div>
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${sampleRows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell || ""}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="csv-stats">
        <div class="stat-item">
          <i class="fas fa-table"></i>
          <span>Columnas: ${this.csvHeaders.length}</span>
        </div>
        <div class="stat-item">
          <i class="fas fa-list"></i>
          <span>Filas: ${this.csvData.length}</span>
        </div>
        <div class="stat-item">
          <i class="fas fa-eye"></i>
          <span>Mostrando primeras 5 filas</span>
        </div>
      </div>
    `;

    content.innerHTML = html;
    container.classList.remove("hidden");

    // Auto-mapeo inteligente
    this.autoMapColumns();

    // Configurar eventos de mapeo
    content.addEventListener("change", (e) => {
      if (e.target.classList.contains("mapping-select")) {
        this.validateMapping();
      }
    });
  }

  autoMapColumns() {
    // Auto-mapeo inteligente basado en nombres comunes
    const mappings = {
      nombre: ["nombre", "producto", "articulo", "item", "titulo", "servicio"],
      codigo: ["codigo", "sku", "id", "referencia", "ref"],
      categoria: ["categoria", "rubro", "tipo", "clase"],
      descripcion: ["descripcion", "detalle", "info", "observaciones"],
      imagen: ["imagen", "photo", "foto", "pic", "picture", "url", "link"],
      precio_valor: ["precio", "valor", "importe", "costo", "$", "price"],
      stock: ["stock", "cantidad", "cant", "qty", "existencia"],
      color: ["color", "colour"],
      talle: ["talle", "talla", "size", "tamaño"],
      telefono: ["telefono", "tel", "phone", "contacto"],
      email: ["email", "mail", "correo"]
    };

    document.querySelectorAll(".mapping-select").forEach(select => {
      const colIndex = parseInt(select.dataset.colIndex);
      const header = this.csvHeaders[colIndex].toLowerCase();
      
      // Buscar coincidencia
      for (const [field, keywords] of Object.entries(mappings)) {
        if (keywords.some(keyword => header.includes(keyword))) {
          select.value = field;
          break;
        }
      }
    });

    this.validateMapping();
  }

  validateMapping() {
    const selects = document.querySelectorAll(".mapping-select");
    const mappedFields = Array.from(selects)
      .map(s => s.value)
      .filter(v => v !== "");
    
    const hasRequiredField = mappedFields.includes("nombre");
    const importBtn = document.getElementById("importCsvData");
    
    if (importBtn) {
      importBtn.disabled = !hasRequiredField;
      
      if (hasRequiredField) {
        importBtn.innerHTML = `<i class="fas fa-upload"></i> Importar ${this.csvData.length} registros`;
      } else {
        importBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Debe mapear al menos "Nombre"`;
      }
    }
  }

  async importMappedCSV() {
    try {
      this.showLoading("Importando datos...");
      
      // Obtener mapeo de columnas
      const selects = document.querySelectorAll(".mapping-select");
      const mapping = {};
      selects.forEach(select => {
        const field = select.value;
        const colIndex = parseInt(select.dataset.colIndex);
        if (field) {
          mapping[field] = colIndex;
        }
      });

      // Procesar datos
      const processedData = this.csvData.map(row => {
        const item = {
          fechaCreacion: new Date(),
          estado: "activo" // activo | pausado
        };

        // Campos básicos
        ["nombre", "codigo", "categoria", "subcategoria", "descripcion", "imagen", "color", "talle", "origen"].forEach(field => {
          if (mapping[field] !== undefined) {
            item[field] = row[mapping[field]] || null;
          }
        });

        // Stock (numérico)
        if (mapping.stock !== undefined) {
          const stockValue = row[mapping.stock];
          item.stock = stockValue ? parseInt(stockValue) || 0 : null;
        }

        // Precio (objeto con validación)
        const precio = {};
        if (mapping.precio_valor !== undefined) {
          const precioValue = row[mapping.precio_valor];
          precio.valor = precioValue ? parseFloat(precioValue.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0 : 0;
        }
        
        if (mapping.precio_moneda !== undefined) {
          let moneda = row[mapping.precio_moneda] || "ARS";
          moneda = ["ARS", "USD", "EUR", "CLP", "MXN", "COP", "PEN"].includes(moneda.toUpperCase()) ? moneda.toUpperCase() : "ARS";
          precio.moneda = moneda;
        } else {
          precio.moneda = "ARS";
        }
        
        item.precio = precio;

        // Medidas físicas
        const medidas = {};
        ["largo_cm", "ancho_cm", "alto_cm", "peso_kg"].forEach(field => {
          if (mapping[field] !== undefined) {
            const value = row[mapping[field]];
            medidas[field.replace('_', '')] = value ? parseFloat(value) || null : null;
          }
        });
        item.medidas = medidas;

        // Contacto (para servicios)
        const contacto = {};
        if (mapping.contacto_telefono !== undefined) {
          contacto.telefono = row[mapping.contacto_telefono] || null;
        }
        if (mapping.contacto_email !== undefined) {
          contacto.email = row[mapping.contacto_email] || null;
        }
        if (Object.keys(contacto).length > 0) {
          item.contacto = contacto;
        }

        // Determinar tipo automáticamente
        item.tipo = (item.precio?.valor > 0) ? "producto" : "servicio";

        return item;
      });

      // Importar usando batch para eficiencia
      await this.batchImportData(processedData);
      
      // Actualizar UI
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      
      this.hideCSVPreview();
      this.hideLoading();
      
      const productos = processedData.filter(item => item.tipo === "producto").length;
      const servicios = processedData.filter(item => item.tipo === "servicio").length;
      
      this.showToast(
        "Importación completa", 
        `Importados: ${productos} productos y ${servicios} servicios`, 
        "success"
      );

    } catch (error) {
      this.hideLoading();
      console.error("Error importing CSV:", error);
      this.showToast("Error", "No se pudo completar la importación", "error");
    }
  }

  async batchImportData(data) {
    const batch = writeBatch(db);
    const collectionRef = collection(db, "usuarios", this.currentUser.uid, "productos");
    
    data.forEach(item => {
      const docRef = doc(collectionRef);
      batch.set(docRef, item);
    });
    
    await batch.commit();
  }

  hideCSVPreview() {
    const container = document.getElementById("csvPreviewContainer");
    if (container) {
      container.classList.add("hidden");
    }
    
    // Limpiar input file
    const fileInput = document.getElementById("excelFile");
    if (fileInput) {
      fileInput.value = "";
    }
    
    this.csvData = [];
    this.csvHeaders = [];
  }

  // ============================================
  // ENHANCED PRODUCT/SERVICE FORM
  // ============================================

  renderProductForm() {
    const container = document.getElementById("productFields");
    if (!container) return;

    // Selector de tipo
    const typeSelector = `
      <div class="form-section">
        <h4><i class="fas fa-toggle-on"></i> Tipo de registro</h4>
        <div class="type-selector">
          <label class="type-option ${this.currentProductType === 'producto' ? 'active' : ''}">
            <input type="radio" name="itemType" value="producto" ${this.currentProductType === 'producto' ? 'checked' : ''}>
            <div class="type-content">
              <i class="fas fa-box"></i>
              <span>Producto</span>
              <small>Con precio, stock, medidas</small>
            </div>
          </label>
          <label class="type-option ${this.currentProductType === 'servicio' ? 'active' : ''}">
            <input type="radio" name="itemType" value="servicio" ${this.currentProductType === 'servicio' ? 'checked' : ''}>
            <div class="type-content">
              <i class="fas fa-handshake"></i>
              <span>Servicio</span>
              <small>Con contacto, disponibilidad</small>
            </div>
          </label>
        </div>
      </div>
    `;

    // Campos comunes
    const commonFields = [
      { id: "itemName", label: "Nombre", type: "text", required: true },
      { id: "itemCode", label: "Código/SKU", type: "text", required: false },
      { id: "itemCategory", label: "Categoría", type: "select", required: true, options: this.selectedCategories },
      { id: "itemSubcategory", label: "Subcategoría", type: "text", required: false },
      { id: "itemDescription", label: "Descripción", type: "textarea", required: false },
      { id: "itemImage", label: "Imagen (URL)", type: "url", required: false, placeholder: "https://ejemplo.com/imagen.jpg o enlace a Instagram/catálogo" }
    ];

    // Campos específicos para productos
    const productFields = [
      { id: "itemPrice", label: "Precio", type: "number", required: false, step: "0.01" },
      { id: "itemCurrency", label: "Moneda", type: "select", required: false, options: ["ARS","USD","EUR","CLP","MXN","COP","PEN"] },
      { id: "itemStock", label: "Stock", type: "number", required: false },
      { id: "itemColor", label: "Color", type: "text", required: false },
      { id: "itemSize", label: "Talle/Tamaño", type: "text", required: false },
      { id: "itemLength", label: "Largo (cm)", type: "number", required: false, step: "0.1" },
      { id: "itemWidth", label: "Ancho (cm)", type: "number", required: false, step: "0.1" },
      { id: "itemHeight", label: "Alto (cm)", type: "number", required: false, step: "0.1" },
      { id: "itemWeight", label: "Peso (kg)", type: "number", required: false, step: "0.1" }
    ];

    // Campos específicos para servicios
    const serviceFields = [
      { id: "servicePhone", label: "Teléfono de contacto", type: "tel", required: false },
      { id: "serviceEmail", label: "Email de contacto", type: "email", required: false },
      { id: "serviceDuration", label: "Duración estimada", type: "text", required: false },
      { id: "serviceAvailability", label: "Disponibilidad", type: "text", required: false }
    ];

    let html = typeSelector + "<div class='form-fields'>";
    
    // Campos comunes
    html += commonFields.map(field => this.renderFormField(field)).join("");
    
    // Campos específicos
    if (this.currentProductType === "producto") {
      html += "<h4><i class='fas fa-tag'></i> Información del Producto</h4>";
      html += productFields.map(field => this.renderFormField(field)).join("");
    } else {
      html += "<h4><i class='fas fa-phone'></i> Información del Servicio</h4>";
      html += serviceFields.map(field => this.renderFormField(field)).join("");
    }

    // Control de estado
    html += `
      <h4><i class="fas fa-toggle-on"></i> Estado</h4>
      <div class="form-field">
        <label>Estado del registro</label>
        <select id="itemStatus">
          <option value="activo">Activo - IA puede mencionarlo</option>
          <option value="pausado">Pausado - IA no lo menciona</option>
        </select>
      </div>
    `;

    html += "</div>";
    container.innerHTML = html;

    // Configurar eventos para cambio de tipo
    container.addEventListener("change", (e) => {
      if (e.target.name === "itemType") {
        this.currentProductType = e.target.value;
        this.renderProductForm();
      }
    });
  }

  renderFormField(field) {
    const value = "";
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
  }

  // ============================================
  // ENHANCED PRODUCTS TABLE
  // ============================================

  renderProductsTable() {
    const head = document.getElementById("productsTableHead");
    const body = document.getElementById("productsTableBody");
    if (!head || !body) return;

    if (this.products.length === 0) {
      head.innerHTML = "";
      body.innerHTML = `<tr><td colspan="7" class="empty-state-row">No hay registros cargados</td></tr>`;
      return;
    }

    head.innerHTML = `
      <tr>
        <th>Imagen</th>
        <th>Tipo</th>
        <th>Nombre</th>
        <th>Categoría</th>
        <th>Precio/Contacto</th>
        <th>Stock</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    `;

    body.innerHTML = this.products.map(item => {
      const tipo = item.tipo || (item.precio?.valor > 0 ? "producto" : "servicio");
      const tipoIcon = tipo === "producto" ? "fas fa-box" : "fas fa-handshake";
      const estadoClass = item.estado === "pausado" ? "estado-pausado" : "estado-activo";
      
      let precioContacto = "";
      if (tipo === "producto" && item.precio?.valor) {
        precioContacto = `${item.precio.moneda || "ARS"} ${item.precio.valor}`;
      } else if (item.contacto?.telefono) {
        precioContacto = item.contacto.telefono;
      } else {
        precioContacto = "Ver contacto";
      }

      return `
        <tr data-product-id="${item.id}">
          <td>
            ${item.imagen ? 
              `<div class="item-image">
                <img src="${item.imagen}" alt="${item.nombre}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="image-placeholder" style="display:none;"><i class="fas fa-image"></i></div>
               </div>` : 
              `<div class="image-placeholder"><i class="fas fa-image"></i></div>`
            }
          </td>
          <td><i class="${tipoIcon}" title="${tipo}"></i></td>
          <td>
            <div class="item-name">${item.nombre || item.nombre}</div>
            ${item.codigo ? `<div class="item-code">${item.codigo}</div>` : ""}
          </td>
          <td>${item.categoria || ""}</td>
          <td>${precioContacto}</td>
          <td>${tipo === "producto" ? (item.stock ?? "N/A") : "-"}</td>
          <td>
            <span class="estado-badge ${estadoClass}">
              ${item.estado === "pausado" ? "Pausado" : "Activo"}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-outline edit-product" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm toggle-status" title="${item.estado === 'pausado' ? 'Activar' : 'Pausar'}">
                <i class="fas ${item.estado === 'pausado' ? 'fa-play' : 'fa-pause'}"></i>
              </button>
              <button class="btn btn-sm btn-danger delete-product" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Configurar eventos de tabla
    body.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const id = row.dataset.productId;
      
      if (e.target.closest(".edit-product")) {
        this.editProduct(id);
      } else if (e.target.closest(".delete-product")) {
        await this.deleteProduct(id);
      } else if (e.target.closest(".toggle-status")) {
        await this.toggleProductStatus(id);
      }
    });
  }

  async toggleProductStatus(id) {
    try {
      const product = this.products.find(p => p.id === id);
      if (!product) return;

      const newStatus = product.estado === "pausado" ? "activo" : "pausado";
      
      await updateDoc(doc(db, "usuarios", this.currentUser.uid, "productos", id), {
        estado: newStatus
      });

      await this.loadProducts();
      this.renderProductsTable();
      
      this.showToast(
        "Estado actualizado", 
        `Producto ${newStatus === "pausado" ? "pausado" : "activado"}`, 
        "success"
      );
      
    } catch (error) {
      console.error("Error toggling status:", error);
      this.showToast("Error", "No se pudo cambiar el estado", "error");
    }
  }

  // ============================================
  // ENHANCED AI CONFIGURATION
  // ============================================

  renderAIConfigForm() {
    const aiFields = [
      { id: "aiName", label: "Nombre del Asistente", type: "text", required: true, placeholder: "ej: Ana, tu asistente virtual" },
      { id: "aiPersonality", label: "Personalidad", type: "select", required: true, options: ["Amigable y cercano","Profesional","Divertido","Formal","Casual"] },
      { id: "aiTone", label: "Tono de Voz", type: "select", required: true, options: ["Entusiasta","Relajado","Serio","Jovial","Elegante"] },
      { id: "aiGreeting", label: "Saludo Inicial", type: "textarea", required: true, placeholder: "ej: ¡Hola! Soy Ana, tu asistente virtual. ¿En qué puedo ayudarte hoy?" }
    ];

    let html = this.renderFormFields("", aiFields);

    // Configuración de precios
    html += `
      <div class="form-section">
        <h4><i class="fas fa-dollar-sign"></i> Configuración de Precios</h4>
        <div class="price-config">
          <label class="checkbox-item">
            <input type="checkbox" id="aiPricesPaused" ${this.userData?.aiConfig?.pricesPaused ? "checked" : ""}>
            <span class="checkbox-text">Pausar todos los precios temporalmente</span>
            <small>La IA no mencionará precios, siempre derivará al contacto</small>
          </label>
        </div>
      </div>
    `;

    // Comportamientos específicos
    html += `
      <div class="form-section">
        <h4><i class="fas fa-cog"></i> Comportamientos</h4>
        <div class="form-field">
          <label>Cuando no hay precio disponible:</label>
          <select id="aiNoPriceBehavior">
            <option value="contact">Derivar al contacto del comercio</option>
            <option value="ask">Pedir que consulte por WhatsApp/teléfono</option>
            <option value="soon">Informar "precio próximamente disponible"</option>
          </select>
        </div>
        <div class="form-field">
          <label>Cuando un producto está pausado:</label>
          <select id="aiPausedBehavior">
            <option value="hide">No mencionarlo (como si no existiera)</option>
            <option value="unavailable">Decir "temporalmente no disponible"</option>
            <option value="contact">Derivar al contacto para consultar</option>
          </select>
        </div>
      </div>
    `;

    const container = document.getElementById("aiConfigFields");
    if (container) {
      container.innerHTML = html;
    }
  }

  // ============================================
  // AUTH Y RESTO DE FUNCIONES ORIGINALES
  // ============================================

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

  editProduct(id) {
    const p = this.products.find(x => x.id === id);
    if (!p) return;
    
    // Determinar tipo y configurar formulario
    this.currentProductType = p.tipo || (p.precio?.valor > 0 ? "producto" : "servicio");
    this.renderProductForm();
    
    // Llenar campos comunes
    const commonMap = {
      nombre: "itemName",
      codigo: "itemCode", 
      categoria: "itemCategory",
      subcategoria: "itemSubcategory",
      descripcion: "itemDescription",
      imagen: "itemImage"
    };
    
    Object.entries(commonMap).forEach(([key, fieldId]) => {
      const el = document.getElementById(fieldId);
      if (el) el.value = p[key] ?? "";
    });

    // Llenar campos específicos según tipo
    if (this.currentProductType === "producto") {
      const productMap = {
        "precio.valor": "itemPrice",
        "precio.moneda": "itemCurrency",
        stock: "itemStock",
        color: "itemColor",
        talle: "itemSize",
        "medidas.largocm": "itemLength",
        "medidas.anchocm": "itemWidth", 
        "medidas.altocm": "itemHeight",
        "medidas.pesokg": "itemWeight"
      };
      
      Object.entries(productMap).forEach(([path, fieldId]) => {
        const el = document.getElementById(fieldId);
        if (el) {
          const value = this.getNestedValue(p, path);
          el.value = value ?? "";
        }
      });
    } else {
      const serviceMap = {
        "contacto.telefono": "servicePhone",
        "contacto.email": "serviceEmail",
        duracion: "serviceDuration",
        disponibilidad: "serviceAvailability"
      };
      
      Object.entries(serviceMap).forEach(([path, fieldId]) => {
        const el = document.getElementById(fieldId);
        if (el) {
          const value = this.getNestedValue(p, path);
          el.value = value ?? "";
        }
      });
    }

    // Estado
    const statusEl = document.getElementById("itemStatus");
    if (statusEl) statusEl.value = p.estado || "activo";
    
    this.editingProductId = id;
    this.showToast("Edición", "Registro cargado en el formulario para editar", "info");
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async deleteProduct(id) {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      this.showLoading("Eliminando registro...");
      await deleteDoc(doc(db, "usuarios", this.currentUser.uid, "productos", id));
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast("Registro eliminado", "El registro ha sido eliminado correctamente", "success");
    } catch (error) {
      this.hideLoading();
      console.error(error);
      this.showToast("Error", "No se pudo eliminar el registro", "error");
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
    const msg = userMessage.toLowerCase();
    const pricesPaused = this.userData?.aiConfig?.pricesPaused;
    
    // Lógica de respuesta mejorada basada en configuración
    if (msg.includes("precio")) {
      if (pricesPaused) {
        return `Actualmente estamos actualizando nuestros precios. Te recomiendo contactarnos al ${this.userData?.telefono || "teléfono disponible"} para información actualizada.`;
      }
      return "Los precios varían según el producto. ¿Qué producto específico te interesa?";
    }
    
    if (msg.includes("horarios")) {
      return this.userData?.horarios ? this.formatScheduleForAI() : "Nuestros horarios están disponibles en la sección Horarios.";
    }
    
    if (msg.includes("productos")) {
      const activeProducts = this.products.filter(p => p.estado !== "pausado");
      return activeProducts.length > 0 ? 
        `Tenemos ${activeProducts.length} productos disponibles. Algunos ejemplos: ${activeProducts.slice(0,3).map(p=>p.nombre).join(", ")}` : 
        "Nuestro catálogo se está actualizando.";
    }
    
    if (msg.includes("contacto")) {
      return `Podés contactarnos al ${this.userData?.telefono || "teléfono disponible"}.`;
    }
    
    return "Gracias por tu consulta. ¿En qué más puedo ayudarte?";
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
    const activeProducts = this.products.filter(p => p.estado !== "pausado").length;
    const pausedProducts = this.products.filter(p => p.estado === "pausado").length;
    const stats = [
      { icon: "fas fa-comments", label: "Consultas Totales", value: this.userData?.stats?.consultas || "156" },
      { icon: "fas fa-users", label: "Clientes Únicos", value: this.userData?.stats?.clientes || "89" },
      { icon: "fas fa-box", label: "Productos Activos", value: activeProducts || 0 },
      { icon: "fas fa-pause", label: "Productos Pausados", value: pausedProducts || 0 },
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
      this.showToast("Info", "No hay registros para exportar", "info");
      return;
    }
    const headers = ["Tipo","Nombre","Código","Categoría","Subcategoría","Imagen","Precio","Moneda","Stock","Descripción","Estado"];
    const rows = this.products.map(p => [
      p.tipo || (p.precio?.valor > 0 ? "producto" : "servicio"),
      p.nombre || "",
      p.codigo || "",
      p.categoria || "",
      p.subcategoria || "",
      p.imagen || "",
      p.precio?.valor || "",
      p.precio?.moneda || "",
      p.stock ?? "",
      p.descripcion || "",
      p.estado || "activo"
    ]);
    const csv = [headers, ...rows].map(r => r.map(field => `"${String(field).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario_${(this.userData?.nombreComercio || "comercio").replace(/\s+/g,"_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast("Éxito", "Inventario exportado", "success");
  }

  async clearAllProducts() {
    if (!confirm("¿Eliminar todos los registros? Esta acción no puede deshacerse.")) return;
    try {
      this.showLoading("Eliminando registros...");
      const ref = collection(db, "usuarios", this.currentUser.uid, "productos");
      const snap = await getDocs(ref);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "usuarios", this.currentUser.uid, "productos", d.id))));
      await this.loadProducts();
      this.renderProductsTable();
      this.updateProgressIndicator();
      this.hideLoading();
      this.showToast("Éxito", "Todos los registros eliminados", "success");
    } catch (error) {
      this.hideLoading();
      console.error(error);
      this.showToast("Error", "No se pudieron eliminar los registros", "error");
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

    // Enhanced Product/Service form submit
    document.getElementById("productForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      
      // Campos comunes
      const data = {
        nombre: fd.get("itemName") || "",
        codigo: fd.get("itemCode") || "",
        categoria: fd.get("itemCategory") || "",
        subcategoria: fd.get("itemSubcategory") || "",
        descripcion: fd.get("itemDescription") || "",
        imagen: fd.get("itemImage") || null,
        tipo: this.currentProductType,
        estado: fd.get("itemStatus") || "activo",
        fechaCreacion: new Date()
      };

      // Campos específicos por tipo
      if (this.currentProductType === "producto") {
        // Precio
        const precioValor = parseFloat(fd.get("itemPrice")) || 0;
        const precioMoneda = fd.get("itemCurrency") || "ARS";
        data.precio = { valor: precioValor, moneda: precioMoneda };
        
        // Stock y características
        data.stock = fd.get("itemStock") ? parseInt(fd.get("itemStock")) : null;
        data.color = fd.get("itemColor") || null;
        data.talle = fd.get("itemSize") || null;
        
        // Medidas
        const medidas = {
          largocm: fd.get("itemLength") ? parseFloat(fd.get("itemLength")) : null,
          anchocm: fd.get("itemWidth") ? parseFloat(fd.get("itemWidth")) : null,
          altocm: fd.get("itemHeight") ? parseFloat(fd.get("itemHeight")) : null,
          pesokg: fd.get("itemWeight") ? parseFloat(fd.get("itemWeight")) : null
        };
        data.medidas = medidas;
      } else {
        // Servicios
        const contacto = {
          telefono: fd.get("servicePhone") || null,
          email: fd.get("serviceEmail") || null
        };
        if (contacto.telefono || contacto.email) {
          data.contacto = contacto;
        }
        data.duracion = fd.get("serviceDuration") || null;
        data.disponibilidad = fd.get("serviceAvailability") || null;
      }

      if (!data.nombre || !data.categoria) {
        this.showToast("Error", "Complete los campos requeridos", "error");
        return;
      }

      try {
        this.showLoading("Guardando registro...");
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
        this.showToast("Éxito", `${this.currentProductType === "producto" ? "Producto" : "Servicio"} registrado`, "success");
      } catch (err) {
        this.hideLoading();
        console.error(err);
        this.showToast("Error", "No se pudo guardar el registro", "error");
      }
    });

    // Clear product form
    document.getElementById("clearProduct")?.addEventListener("click", () => {
      document.getElementById("productForm")?.reset();
      this.editingProductId = null;
      this.showToast("Acción", "Formulario limpiado", "info");
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

  // Generar IA con configuración avanzada
  async generateAI(formData) {
    if (!this.userData?.nombreComercio || this.products.length === 0) {
      this.showToast("Advertencia", "Completa la info del comercio y agrega productos/servicios", "warning");
      return;
    }
    try {
      this.showLoading("Generando tu IA personalizada...");
      
      const aiConfig = {
        aiName: formData.get("aiName"),
        aiPersonality: formData.get("aiPersonality"),
        aiTone: formData.get("aiTone"),
        aiGreeting: formData.get("aiGreeting"),
        pricesPaused: document.getElementById("aiPricesPaused")?.checked || false,
        noPriceBehavior: document.getElementById("aiNoPriceBehavior")?.value || "contact",
        pausedBehavior: document.getElementById("aiPausedBehavior")?.value || "hide",
        aiGenerated: true,
        fechaGeneracion: new Date()
      };
      
      const updateData = {
        aiConfig,
        aiGenerated: true,
        aiName: aiConfig.aiName,
        aiGreeting: aiConfig.aiGreeting
      };
      
      await updateDoc(doc(db, "usuarios", this.currentUser.uid), updateData);
      this.userData = { ...(this.userData || {}), ...updateData };
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
