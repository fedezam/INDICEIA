// dashboard.js - Lógica principal del dashboard
import { auth, db } from './app.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, setDoc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'comercio';
        this.currentPlan = 'extended';
        this.productos = [];
        this.servicios = [];
        this.categorias = ['General'];
        this.steps = [
            { id: 'comercio', label: 'Comercio', icon: 'fas fa-store' },
            { id: 'productos', label: 'Productos', icon: 'fas fa-box' },
            { id: 'configuracion', label: 'Configuración', icon: 'fas fa-cog' },
            { id: 'ia', label: 'IA Lista', icon: 'fas fa-robot' }
        ];
        
        this.tabs = [
            { id: 'comercio', label: 'Mi Comercio', icon: 'fas fa-store' },
            { id: 'horarios', label: 'Horarios', icon: 'fas fa-clock' },
            { id: 'productos', label: 'Productos', icon: 'fas fa-box' },
            { id: 'ia', label: 'Mi IA', icon: 'fas fa-robot' },
            { id: 'estadisticas', label: 'Estadísticas', icon: 'fas fa-chart-line' }
        ];

        this.init();
    }

    init() {
        this.setupAuth();
        this.renderInitialLayout();
        this.setupEventListeners();
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.updateUserInfo();
                this.loadUserData();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    updateUserInfo() {
        const email = this.currentUser.email;
        const name = email.split('@')[0];
        
        document.getElementById('userName').textContent = name.charAt(0).toUpperCase() + name.slice(1);
        document.getElementById('userEmail').textContent = email;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
    }

    renderInitialLayout() {
        this.renderProgressSteps();
        this.renderTabs();
        this.renderPlans();
        this.renderComercioForm();
        this.renderScheduleGrid();
        this.renderProductForm();
        this.renderAIForm();
        this.updateProgress();
    }

    renderProgressSteps() {
        const container = document.getElementById('progressSteps');
        container.innerHTML = `
            <div class="progress-line" id="progressLine"></div>
            ${this.steps.map((step, index) => `
                <div class="step" data-step="${step.id}">
                    <div class="step-circle">${index + 1}</div>
                    <div class="step-label">${step.label}</div>
                </div>
            `).join('')}
        `;
    }

    renderTabs() {
        const nav = document.getElementById('tabNav');
        nav.innerHTML = this.tabs.map(tab => `
            <button class="tab-button ${tab.id === this.currentTab ? 'active' : ''}" 
                    data-tab="${tab.id}">
                <i class="${tab.icon}"></i> ${tab.label}
                ${tab.id === 'productos' ? '<span class="tab-notification hidden" id="productosNotif">0</span>' : ''}
            </button>
        `).join('');
    }

    renderPlans() {
        const plans = [
            {
                id: 'basic',
                name: 'BASIC',
                subtitle: 'Perfecto para empezar',
                price: 15,
                features: [
                    '50 productos máximo',
                    'IA básica de consultas',
                    'Soporte por email',
                    'Actualizaciones incluidas'
                ]
            },
            {
                id: 'extended',
                name: 'EXTENDED',
                subtitle: 'El más elegido',
                price: 25,
                popular: true,
                features: [
                    '100 productos máximo',
                    'IA + Estadísticas completas',
                    'Soporte prioritario',
                    'Personalización avanzada',
                    'Reportes semanales'
                ]
            },
            {
                id: 'mega',
                name: 'MEGA',
                subtitle: 'Sin límites',
                price: 75,
                features: [
                    'Productos ilimitados',
                    'Todo incluido',
                    'Soporte 24/7',
                    'Múltiples ubicaciones',
                    'Marca blanca disponible'
                ]
            }
        ];

        const container = document.getElementById('planSelector');
        container.innerHTML = plans.map(plan => `
            <div class="plan-card ${plan.popular ? 'popular' : ''} ${plan.id === this.currentPlan ? 'selected' : ''}" 
                 data-plan="${plan.id}">
                <h3>${plan.name}</h3>
                <div class="plan-subtitle">${plan.subtitle}</div>
                <div class="plan-price">
                    <span class="currency">$</span>${plan.price}<span class="period">/mes</span>
                </div>
                <ul class="plan-features">
                    ${plan.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }

    renderComercioForm() {
        const basicFields = [
            { name: 'nombreComercio', label: 'Nombre del Comercio', type: 'text', required: true, placeholder: 'Ej: Pastelería Dulce Vida' },
            { name: 'rubro', label: 'Rubro/Especialidad', type: 'select', required: true, options: [
                { value: '', label: 'Seleccionar rubro...' },
                { value: 'gastronomia', label: '🍽️ Gastronomía' },
                { value: 'belleza', label: '💄 Belleza y Estética' },
                { value: 'indumentaria', label: '👕 Indumentaria' },
                { value: 'ferreteria', label: '🔧 Ferretería' },
                { value: 'otro', label: '❓ Otro' }
            ]},
            { name: 'direccion', label: 'Dirección', type: 'text', placeholder: 'Ej: Av. San Martín 123' },
            { name: 'localidad', label: 'Localidad', type: 'text', placeholder: 'Ej: Rosario, Santa Fe' },
            { name: 'descripcion', label: 'Descripción del Negocio', type: 'textarea', required: true, placeholder: 'Describe tu negocio, especialidades...' }
        ];

        const contactFields = [
            { name: 'telefono', label: 'Teléfono', type: 'tel', icon: '📞', placeholder: '341-123-4567' },
            { name: 'whatsapp', label: 'WhatsApp', type: 'tel', required: true, icon: '📱', placeholder: '+54 9 341 123-4567' },
            { name: 'email', label: 'Email', type: 'email', icon: '📧', placeholder: 'contacto@minegocio.com' },
            { name: 'website', label: 'Sitio Web', type: 'url', icon: '🌐', placeholder: 'https://minegocio.com' }
        ];

        const paymentMethods = [
            { id: 'efectivo', label: 'Efectivo', icon: 'fas fa-money-bill' },
            { id: 'tarjeta', label: 'Tarjetas', icon: 'fas fa-credit-card' },
            { id: 'transferencia', label: 'Transferencia', icon: 'fas fa-university' },
            { id: 'mercadopago', label: 'Mercado Pago', icon: 'fas fa-mobile-alt' }
        ];

        document.getElementById('basicInfoFields').innerHTML = this.renderFormFields(basicFields);
        document.getElementById('contactFields').innerHTML = this.renderFormFields(contactFields);
        document.getElementById('paymentMethods').innerHTML = paymentMethods.map(method => `
            <div class="checkbox-item">
                <input type="checkbox" name="mediosPago" value="${method.id}" id="${method.id}">
                <label for="${method.id}"><i class="${method.icon}"></i> ${method.label}</label>
            </div>
        `).join('');
    }

    renderScheduleGrid() {
        const days = [
            { id: 'lunes', name: 'Lunes', defaultOpen: true },
            { id: 'martes', name: 'Martes', defaultOpen: true },
            { id: 'miercoles', name: 'Miércoles', defaultOpen: true },
            { id: 'jueves', name: 'Jueves', defaultOpen: true },
            { id: 'viernes', name: 'Viernes', defaultOpen: true },
            { id: 'sabado', name: 'Sábado', defaultOpen: true },
            { id: 'domingo', name: 'Domingo', defaultOpen: false }
        ];

        const container = document.getElementById('scheduleGrid');
        container.innerHTML = days.map(day => `
            <div class="schedule-day ${!day.defaultOpen ? 'disabled' : ''}" data-day="${day.id}">
                <div class="schedule-day-header">
                    <div class="schedule-day-name">${day.name}</div>
                    <div class="schedule-toggle">
                        <input type="checkbox" id="${day.id}_abierto" ${day.defaultOpen ? 'checked' : ''}>
                        <label for="${day.id}_abierto">Abierto</label>
                    </div>
                </div>
                <div class="schedule-times">
                    <div class="schedule-time-group">
                        <div class="schedule-time-label">Mañana</div>
                        <div class="schedule-time-inputs">
                            <input type="time" name="${day.id}_manana_inicio" value="08:00">
                            <span class="schedule-time-separator">a</span>
                            <input type="time" name="${day.id}_manana_fin" value="12:00">
                        </div>
                    </div>
                    <div class="schedule-time-group">
                        <div class="schedule-time-label">Tarde</div>
                        <div class="schedule-time-inputs">
                            <input type="time" name="${day.id}_tarde_inicio" value="16:00">
                            <span class="schedule-time-separator">a</span>
                            <input type="time" name="${day.id}_tarde_fin" value="20:00">
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderProductForm() {
        const productFields = [
            { name: 'codigo', label: 'Código', type: 'text', required: true, placeholder: 'SKU001' },
            { name: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Nombre del producto' },
            { name: 'categoria', label: 'Categoría', type: 'select', options: this.categorias.map(cat => ({ value: cat, label: cat })) },
            { name: 'precio', label: 'Precio', type: 'number', required: true, step: '0.01', icon: '$' },
            { name: 'stock', label: 'Stock', type: 'number', placeholder: 'Cantidad disponible' },
            { name: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Descripción detallada...' }
        ];

        document.getElementById('productFields').innerHTML = this.renderFormFields(productFields);
        
        // Render products table headers
        document.getElementById('productsTableHead').innerHTML = `
            <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        `;

        this.updateProductsTable();
        this.updateCategoriesGrid();
    }

    renderAIForm() {
        const aiFields = [
            { name: 'nombreIA', label: 'Nombre de tu IA', type: 'text', required: true, placeholder: 'Sofia IA' },
            { name: 'tonoIA', label: 'Personalidad/Tono', type: 'select', options: [
                { value: 'amigable', label: 'Amigable y cercano' },
                { value: 'profesional', label: 'Profesional' },
                { value: 'casual', label: 'Casual y relajado' },
                { value: 'elegante', label: 'Elegante y sofisticado' }
            ]},
            { name: 'mensajeBienvenida', label: 'Mensaje de Bienvenida', type: 'textarea', placeholder: '¡Hola! Soy [NOMBRE_IA] y estoy aquí para ayudarte...' },
            { name: 'logoURL', label: 'URL del Logo', type: 'url', placeholder: 'https://tu-logo.jpg' }
        ];

        document.getElementById('aiConfigFields').innerHTML = this.renderFormFields(aiFields);
    }

    renderFormFields(fields) {
        return fields.map(field => {
            const isRequired = field.required ? '<span class="required">*</span>' : '<span class="optional">(opcional)</span>';
            
            if (field.type === 'select') {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label} ${isRequired}</label>
                        <select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
                            ${field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                        </select>
                        ${field.required ? '<div class="error-message">Este campo es obligatorio</div>' : ''}
                    </div>
                `;
            } else if (field.type === 'textarea') {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label} ${isRequired}</label>
                        <textarea id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''} 
                                placeholder="${field.placeholder || ''}"></textarea>
                        ${field.required ? '<div class="error-message">Este campo es obligatorio</div>' : ''}
                    </div>
                `;
            } else if (field.icon) {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label} ${isRequired}</label>
                        <div class="input-group">
                            <div class="input-group-prepend">${field.icon}</div>
                            <input type="${field.type}" id="${field.name}" name="${field.name}" 
                                   ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"
                                   ${field.step ? `step="${field.step}"` : ''}>
                        </div>
                        ${field.required ? '<div class="error-message">Este campo es obligatorio</div>' : ''}
                    </div>
                `;
            } else {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label} ${isRequired}</label>
                        <input type="${field.type}" id="${field.name}" name="${field.name}" 
                               ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"
                               ${field.step ? `step="${field.step}"` : ''}>
                        ${field.required ? '<div class="error-message">Este campo es obligatorio</div>' : ''}
                    </div>
                `;
            }
        }).join('');
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            this.showLoading('Cerrando sesión...');
            try {
                await signOut(auth);
            } catch (error) {
                this.showToast('Error', 'No se pudo cerrar la sesión', 'error');
            } finally {
                this.hideLoading();
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        // Plan selection
        document.querySelectorAll('.plan-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.currentPlan = card.dataset.plan;
                this.showToast('Plan seleccionado', `Plan ${card.dataset.plan.toUpperCase()} seleccionado`, 'info');
            });
        });

        // Comercio form
        document.getElementById('comercioForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveComercioData();
        });

        // Schedule management
        document.querySelectorAll('[id$="_abierto"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const day = e.target.id.split('_')[0];
                const dayElement = document.querySelector(`[data-day="${day}"]`);
                dayElement.classList.toggle('disabled', !e.target.checked);
            });
        });

        document.getElementById('saveSchedule').addEventListener('click', () => {
            this.saveSchedule();
        });

        // Categories
        document.getElementById('addCategory').addEventListener('click', () => {
            this.addCategory();
        });

        // Products
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProduct();
        });

        document.getElementById('clearProduct').addEventListener('click', () => {
            document.getElementById('productForm').reset();
        });

        document.getElementById('exportProducts').addEventListener('click', () => {
            this.exportProducts();
        });

        document.getElementById('clearProducts').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar TODOS los productos?')) {
                this.productos = [];
                this.updateProductsTable();
                this.showToast('¡Limpiado!', 'Todos los productos han sido eliminados', 'success');
            }
        });

        // File upload
        document.getElementById('fileUpload').addEventListener('click', () => {
            document.getElementById('excelFile').click();
        });

        document.getElementById('excelFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processExcelFile(e.target.files[0]);
            }
        });

        // AI Configuration
        document.getElementById('aiConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateAI();
        });

        document.getElementById('previewAI').addEventListener('click', () => {
            this.previewAI();
        });
    }

    switchTab(tabId) {
        // Update navigation
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');

        this.currentTab = tabId;
    }

    async saveComercioData() {
        if (!this.validateForm('comercioForm')) {
            this.showToast('Campos incompletos', 'Por favor completa todos los campos obligatorios', 'warning');
            return;
        }

        this.showLoading('Guardando información...');

        try {
            const formData = new FormData(document.getElementById('comercioForm'));
            const data = Object.fromEntries(formData);
            data.plan = this.currentPlan;
            data.mediosPago = Array.from(formData.getAll('mediosPago'));
            data.updatedAt = new Date();

            await setDoc(doc(db, 'comercios', this.currentUser.uid), data, { merge: true });
            this.showToast('¡Guardado!', 'Información del comercio guardada correctamente', 'success');
            this.updateProgress();
        } catch (error) {
            this.showToast('Error', 'No se pudo guardar: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async saveSchedule() {
        this.showLoading('Guardando horarios...');
        
        try {
            const horarios = this.collectScheduleData();
            await setDoc(doc(db, 'comercios', this.currentUser.uid), {
                horarios: horarios,
                horariosUpdatedAt: new Date()
            }, { merge: true });
            
            this.showToast('¡Guardado!', 'Horarios guardados correctamente', 'success');
            this.updateProgress();
        } catch (error) {
            this.showToast('Error', 'No se pudieron guardar los horarios: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    collectScheduleData() {
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const horarios = {};
        
        dias.forEach(dia => {
            const abierto = document.querySelector(`#${dia}_abierto`)?.checked;
            if (abierto) {
                const mananaInicio = document.querySelector(`[name="${dia}_manana_inicio"]`)?.value;
                const mananaFin = document.querySelector(`[name="${dia}_manana_fin"]`)?.value;
                const tardeInicio = document.querySelector(`[name="${dia}_tarde_inicio"]`)?.value;
                const tardeFin = document.querySelector(`[name="${dia}_tarde_fin"]`)?.value;
                
                let horario = '';
                if (mananaInicio && mananaFin) {
                    horario += `${mananaInicio}-${mananaFin}`;
                }
                if (tardeInicio && tardeFin) {
                    horario += horario ? ` y ${tardeInicio}-${tardeFin}` : `${tardeInicio}-${tardeFin}`;
                }
                
                if (horario) {
                    horarios[dia] = horario;
                }
            }
        });
        
        return horarios;
    }

    addCategory() {
        const input = document.getElementById('newCategory');
        const categoria = input.value.trim();
        
        if (!categoria) {
            this.showToast('Error', 'Escribe un nombre para la categoría', 'warning');
            return;
        }
        
        if (this.categorias.includes(categoria)) {
            this.showToast('Error', 'Esta categoría ya existe', 'warning');
            return;
        }
        
        this.categorias.push(categoria);
        input.value = '';
        this.updateCategoriesGrid();
        this.updateCategorySelectors();
        this.showToast('¡Agregada!', `Categoría "${categoria}" agregada`, 'success');
    }

    removeCategory(categoryName) {
        if (categoryName === 'General') {
            this.showToast('Error', 'No puedes eliminar la categoría General', 'error');
            return;
        }
        
        if (confirm(`¿Eliminar la categoría "${categoryName}"?`)) {
            this.categorias = this.categorias.filter(cat => cat !== categoryName);
            this.updateCategoriesGrid();
            this.updateCategorySelectors();
            this.showToast('¡Eliminada!', `Categoría "${categoryName}" eliminada`, 'success');
        }
    }

    updateCategoriesGrid() {
        const container = document.getElementById('categoriesGrid');
        container.innerHTML = this.categorias.map(categoria => `
            <div class="category-item">
                ${categoria}
                <button class="category-remove" onclick="dashboard.removeCategory('${categoria}')" title="Eliminar categoría">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    updateCategorySelectors() {
        const selects = document.querySelectorAll('select[name="categoria"]');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = this.categorias.map(cat => 
                `<option value="${cat}" ${cat === currentValue ? 'selected' : ''}>${cat}</option>`
            ).join('');
        });
    }

    addProduct() {
        if (!this.validateForm('productForm')) {
            this.showToast('Campos incompletos', 'Por favor completa todos los campos obligatorios', 'warning');
            return;
        }
        
        const formData = new FormData(document.getElementById('productForm'));
        const producto = Object.fromEntries(formData);
        
        // Check if code already exists
        if (this.productos.some(p => p.codigo === producto.codigo)) {
            this.showToast('Error', 'Ya existe un producto con este código', 'error');
            return;
        }
        
        producto.id = Date.now().toString();
        producto.activo = true;
        
        this.productos.push(producto);
        this.updateProductsTable();
        
        document.getElementById('productForm').reset();
        
        this.showToast('¡Agregado!', `Producto "${producto.nombre}" agregado correctamente`, 'success');
        this.updateTabNotifications();
        this.updateProgress();
    }

    updateProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        
        if (this.productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <i class="fas fa-box-open"></i>
                            </div>
                            <h3>No hay productos cargados</h3>
                            <p>Agrega productos manualmente o sube un Excel para comenzar</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.productos.map(producto => `
            <tr data-product-id="${producto.id}">
                <td>${producto.codigo}</td>
                <td>${producto.nombre}</td>
                <td>${producto.categoria || 'General'}</td>
                <td>${this.formatCurrency(parseFloat(producto.precio || 0))}</td>
                <td>${producto.stock || '∞'}</td>
                <td>
                    <span class="status-badge status-active">Activo</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="dashboard.editProduct('${producto.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="dashboard.deleteProduct('${producto.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    editProduct(productId) {
        const product = this.productos.find(p => p.id === productId);
        if (!product) return;
        
        // Fill form with product data
        Object.keys(product).forEach(key => {
            const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (field) {
                field.value = product[key];
            }
        });
        
        // Remove product from array (will be re-added on form submit)
        this.productos = this.productos.filter(p => p.id !== productId);
        this.updateProductsTable();
        
        // Switch to productos tab and scroll to form
        this.switchTab('productos');
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
        
        this.showToast('Editando', `Editando producto "${product.nombre}"`, 'info');
    }

    deleteProduct(productId) {
        const product = this.productos.find(p => p.id === productId);
        if (!product) return;
        
        if (confirm(`¿Eliminar el producto "${product.nombre}"?`)) {
            this.productos = this.productos.filter(p => p.id !== productId);
            this.updateProductsTable();
            this.updateTabNotifications();
            this.showToast('¡Eliminado!', `Producto "${product.nombre}" eliminado`, 'success');
        }
    }

    processExcelFile(file) {
        this.showLoading('Procesando archivo...');
        
        // Simulate file processing (in real app, you'd use a library like SheetJS)
        setTimeout(() => {
            const mockProducts = [
                { 
                    codigo: 'EXCEL001', 
                    nombre: 'Producto desde Excel 1', 
                    categoria: 'General', 
                    precio: '150.00', 
                    stock: '10', 
                    id: Date.now().toString()
                },
                { 
                    codigo: 'EXCEL002', 
                    nombre: 'Producto desde Excel 2', 
                    categoria: 'General', 
                    precio: '200.00', 
                    stock: '5', 
                    id: (Date.now() + 1).toString()
                }
            ];
            
            mockProducts.forEach(producto => {
                if (!this.productos.some(p => p.codigo === producto.codigo)) {
                    this.productos.push(producto);
                }
            });
            
            this.updateProductsTable();
            this.showToast('¡Procesado!', `Excel procesado. Se agregaron ${mockProducts.length} productos.`, 'success');
            this.updateTabNotifications();
            this.updateProgress();
            this.hideLoading();
        }, 2000);
    }

    exportProducts() {
        if (this.productos.length === 0) {
            this.showToast('Sin datos', 'No hay productos para exportar', 'warning');
            return;
        }
        
        const csv = this.productos.map(producto => 
            Object.values(producto).join(',')
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'productos.csv';
        a.click();
        
        this.showToast('¡Exportado!', 'Productos exportados a CSV', 'success');
    }

    async generateAI() {
        if (!this.validateForm('aiConfigForm')) {
            this.showToast('Campos incompletos', 'Por favor completa todos los campos obligatorios', 'warning');
            return;
        }

        if (this.productos.length === 0) {
            this.showToast('Sin productos', 'Agrega al menos un producto antes de generar la IA', 'warning');
            return;
        }

        this.showLoading('Generando tu IA...');

        try {
            const comercioData = await this.collectAllData();
            const fullJSON = this.generateFullJSON(comercioData);
            const prompt = this.generatePrompt(fullJSON);
            
            const aiLink = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;
            
            await setDoc(doc(db, 'comercios', this.currentUser.uid), {
                jsonData: fullJSON,
                aiLink: aiLink,
                aiGenerated: true,
                generatedAt: new Date()
            }, { merge: true });
            
            this.showAIResult(aiLink, comercioData.nombreComercio);
            this.showToast('¡IA generada!', 'Tu asistente inteligente está listo para usar', 'success');
            this.updateProgress();
        } catch (error) {
            this.showToast('Error', 'No se pudo generar la IA: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async collectAllData() {
        try {
            const docSnap = await getDoc(doc(db, 'comercios', this.currentUser.uid));
            return docSnap.exists() ? docSnap.data() : {};
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    generateFullJSON(data) {
        const horarios = this.collectScheduleData();
        
        return {
            comercio: {
                nombre: data.nombreComercio || '',
                rubro: data.rubro || '',
                direccion: data.direccion || '',
                telefono: data.telefono || '',
                whatsapp: data.whatsapp || '',
                email: data.email || '',
                horarios: horarios,
                medios_pago: data.mediosPago || [],
                descripcion: data.descripcion || ''
            },
            asistente_ia: {
                nombre: data.nombreIA || `${data.nombreComercio} IA`,
                tono: data.tonoIA || 'amigable',
                logo_url: data.logoURL || '',
                saludo_personalizado: data.mensajeBienvenida || `¡Hola! Soy ${data.nombreIA} 👋`
            },
            productos: this.productos,
            configuracion_ia: {
                plan: data.plan || this.currentPlan
            }
        };
    }

    generatePrompt(jsonData) {
        const comercio = jsonData.comercio;
        const ia = jsonData.asistente_ia;
        
        let prompt = `Eres ${ia.nombre}, la IA de ${comercio.nombre}`;
        if (comercio.rubro) prompt += `, especializada en ${comercio.rubro}`;
        prompt += `.\n\n`;

        prompt += `SALUDO INICIAL:\n"${ia.saludo_personalizado} ¿En qué te puedo ayudar?"\n\n`;
        prompt += `INFORMACIÓN COMPLETA DEL NEGOCIO:\n${JSON.stringify(jsonData, null, 2)}\n\n`;
        prompt += `INSTRUCCIONES:\n`;
        prompt += `- Personalidad: ${ia.tono}\n`;
        prompt += `- Solo usa información de este JSON\n`;
        prompt += `- Para reservas/pedidos deriva a: ${comercio.whatsapp || comercio.telefono}\n`;
        prompt += `- Si no tienes un dato exacto, deriva al contacto\n`;
        prompt += `- Nunca inventes precios ni información\n`;

        return prompt;
    }

    showAIResult(aiLink, nombreComercio) {
        document.getElementById('aiLinkDisplay').textContent = aiLink;
        document.getElementById('aiPreviewSection').classList.remove('hidden');
        document.getElementById('noAIMessage').style.display = 'none';

        // Setup AI actions
        const actions = document.getElementById('aiActions');
        actions.innerHTML = `
            <button class="btn btn-outline-white" onclick="dashboard.copyToClipboard('${aiLink}')">
                <i class="fas fa-copy"></i> Copiar Link
            </button>
            <button class="btn btn-outline-white" onclick="dashboard.testAI()">
                <i class="fas fa-play"></i> Probar IA
            </button>
            <button class="btn btn-outline-white" onclick="dashboard.shareAI('${aiLink}')">
                <i class="fas fa-share"></i> Compartir
            </button>
        `;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('¡Copiado!', 'Texto copiado al portapapeles', 'success');
        });
    }

    testAI() {
        const testSection = document.getElementById('aiTestSection');
        testSection.classList.toggle('hidden');
        if (!testSection.classList.contains('hidden')) {
            this.showToast('Modo test', 'Puedes probar tu IA aquí. Las respuestas son simuladas.', 'info');
        }
    }

    shareAI(link) {
        if (navigator.share) {
            navigator.share({
                title: 'Mi IA Comercial',
                text: '🤖 ¡Prueba nuestra IA las 24 horas!',
                url: link
            });
        } else {
            this.copyToClipboard(link);
            this.showToast('Link copiado', 'Compártelo en tus redes sociales', 'info');
        }
    }

    async loadUserData() {
        this.showLoading('Cargando datos...');
        
        try {
            const docSnap = await getDoc(doc(db, 'comercios', this.currentUser.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.fillFormsWithData(data);
                
                if (data.productos) {
                    this.productos = data.productos;
                    this.updateProductsTable();
                }
                
                if (data.aiLink) {
                    this.showAIResult(data.aiLink, data.nombreComercio);
                }
                
                if (data.plan) {
                    this.currentPlan = data.plan;
                    document.querySelectorAll('.plan-card').forEach(card => {
                        card.classList.toggle('selected', card.dataset.plan === data.plan);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error', 'No se pudieron cargar los datos', 'error');
        } finally {
            this.hideLoading();
            this.updateProgress();
            this.updateTabNotifications();
        }
    }

    fillFormsWithData(data) {
        Object.keys(data).forEach(key => {
            const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = data[key];
                } else {
                    field.value = data[key];
                }
            }
        });

        // Handle checkbox arrays
        if (data.mediosPago) {
            data.mediosPago.forEach(medio => {
                const checkbox = document.querySelector(`[name="mediosPago"][value="${medio}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    updateProgress() {
        const steps = document.querySelectorAll('.step');
        let completed = 0;
        
        // Check comercio data
        if (document.getElementById('nombreComercio')?.value) {
            steps[0].classList.add('completed');
            completed++;
        }

        // Check products
        if (this.productos.length > 0) {
            steps[1].classList.add('completed');
            completed++;
        }

        // Check horarios
        const hasHorarios = document.querySelectorAll('[id$="_abierto"]:checked').length > 0;
        if (hasHorarios) {
            steps[2].classList.add('completed');
            completed++;
        }

        // Check IA generation
        if (document.getElementById('aiPreviewSection').classList.contains('visible')) {
            steps[3].classList.add('completed');
            completed++;
        }

        // Update progress bar
        const percentage = (completed / 4) * 100;
        document.getElementById('progressLine').style.width = `${percentage}%`;
        document.getElementById('completionFill').style.width = `${percentage}%`;
        document.getElementById('completionText').textContent = `${percentage}% completado`;

        // Update active step
        steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index === completed && completed < 4) {
                step.classList.add('active');
            }
            
            const circle = step.querySelector('.step-circle');
            if (step.classList.contains('completed')) {
                circle.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                circle.textContent = index + 1;
            }
        });
    }

    updateTabNotifications() {
        const productosNotif = document.getElementById('productosNotif');
        if (productosNotif) {
            productosNotif.textContent = this.productos.length;
            productosNotif.classList.toggle('hidden', this.productos.length === 0);
        }
    }

    validateForm(formId) {
        const form = document.getElementById(formId);
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            const errorMsg = field.parentElement.querySelector('.error-message');
            
            if (!field.value.trim()) {
                field.classList.add('error');
                if (errorMsg) errorMsg.classList.add('show');
                isValid = false;
            } else {
                field.classList.remove('error');
                if (errorMsg) errorMsg.classList.remove('show');
            }
        });

        return isValid;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(value);
    }

    showLoading(text = 'Cargando...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        overlay.classList.add('show');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
    }

    showToast(title, message, type = 'success') {
        const container = document.getElementById('toastContainer');
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
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 5000);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        });
    }

    previewAI() {
        this.showToast('Vista previa', 'Funcionalidad de vista previa en desarrollo', 'info');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});

export default DashboardManager;
