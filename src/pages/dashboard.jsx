// src/pages/dashboard.jsx
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { showLoading, hideLoading, showToast } from '../shared/utils.jsx';
import { PLANS } from '../shared/plans.js';

// ==================== ESTADO GLOBAL ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let usuarioData = {};
let productos = [];

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '/index.html';
      return;
    }
    currentUser = user;
    await initializeDashboard();
  });
});

async function initializeDashboard() {
  try {
    showLoading('Cargando dashboard...');

    // 1. Obtener comercioId del usuario
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data().comercioId) {
      window.location.href = './usuario.html';
      return;
    }

    usuarioData = { id: currentUser.uid, ...userDoc.data() };
    currentComercioId = userDoc.data().comercioId;

    // 2. Cargar datos del comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);
    
    if (!comercioDoc.exists()) {
      showToast('error', 'Error', 'Comercio no encontrado');
      return;
    }

    comercioData = { id: currentComercioId, ...comercioDoc.data() };

    // 3. Cargar productos (primeros 15)
    await loadProductos();

    // 4. Renderizar todo
    updateHeader();
    renderUsuarioCard();
    renderComercioCard();
    renderHorariosCard();
    renderProductosTable();
    renderIAConfigCard();
    
    // 5. ⏳ PLACEHOLDER: Cargar estado del bot desde Vercel Blob
    await renderBotStatus();

    // 6. Event listeners
    setupEventListeners();

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error inicializando dashboard:', error);
    showToast('error', 'Error', 'No se pudo cargar el dashboard: ' + error.message);
  }
}

// ==================== CARGAR PRODUCTOS ====================
async function loadProductos() {
  try {
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const snapshot = await getDocs(productosRef);
    productos = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => !p.paused) // Solo productos activos
      .slice(0, 15); // Primeros 15
  } catch (error) {
    console.error('Error cargando productos:', error);
    productos = [];
  }
}

// ==================== HEADER ====================
function updateHeader() {
  const nameEl = document.getElementById('commerceName');
  const badgeEl = document.getElementById('planBadge');

  if (nameEl) {
    nameEl.textContent = comercioData.nombreComercio || 'Mi Comercio';
  }

  if (badgeEl) {
    const plan = PLANS[comercioData.plan || 'trial'];
    if (plan) {
      // Calcular días restantes si es trial
      if (comercioData.plan === 'trial' && comercioData.fechaInicioTrial) {
        const trialStart = new Date(comercioData.fechaInicioTrial);
        const trialEnd = new Date(trialStart.getTime() + 5 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        badgeEl.textContent = `${plan.emoji} ${plan.nombre} (${daysLeft} días)`;
      } else {
        badgeEl.textContent = `${plan.emoji} ${plan.nombre}`;
      }
    } else {
      badgeEl.textContent = 'Trial';
    }
  }
}

// ==================== RESUMEN USUARIO ====================
function renderUsuarioCard() {
  const container = document.getElementById('usuarioContent');
  if (!container) return;

  const html = `
    <p><strong>Nombre:</strong> ${usuarioData.nombre || ''} ${usuarioData.apellido || ''}</p>
    <p><strong>Email:</strong> ${usuarioData.mail || currentUser.email}</p>
    <p><strong>Teléfono:</strong> ${usuarioData.telefono || 'No especificado'}</p>
    <p><strong>Ubicación:</strong> ${usuarioData.localidad || ''}, ${usuarioData.provincia || ''}</p>
  `;

  container.innerHTML = html;
}

// ==================== RESUMEN COMERCIO ====================
function renderComercioCard() {
  const container = document.getElementById('comercioContent');
  if (!container) return;

  const categories = Array.isArray(comercioData.categories) 
    ? comercioData.categories.slice(0, 2).join(', ') 
    : 'No especificado';

  const html = `
    <p><strong>Nombre:</strong> ${comercioData.nombreComercio || 'Sin nombre'}</p>
    <p><strong>Rubro:</strong> ${categories}</p>
    <p><strong>Dirección:</strong> ${comercioData.direccion || 'No especificada'}</p>
    <p><strong>Ciudad:</strong> ${comercioData.ciudad || ''}, ${comercioData.provincia || ''}</p>
  `;

  container.innerHTML = html;
}

// ==================== RESUMEN HORARIOS ====================
function renderHorariosCard() {
  const container = document.getElementById('horariosContent');
  if (!container) return;

  const horarios = comercioData.horarios || {};
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  
  // Agrupar días con horarios similares
  const grupos = [];
  let grupoActual = null;

  dias.forEach(dia => {
    const horario = horarios[dia];
    if (!horario || horario.closed) return;

    const horarioStr = horario.continuous 
      ? `${horario.open} - ${horario.close}`
      : `${horario.morning?.enabled ? horario.morning.open + ' - ' + horario.morning.close : ''} / ${horario.afternoon?.enabled ? horario.afternoon.open + ' - ' + horario.afternoon.close : ''}`;

    if (grupoActual && grupoActual.horario === horarioStr) {
      grupoActual.dias.push(dia);
    } else {
      grupoActual = { dias: [dia], horario: horarioStr };
      grupos.push(grupoActual);
    }
  });

  const html = grupos.length > 0 
    ? grupos.map(g => {
        const diasStr = g.dias.length > 1 
          ? `${capitalize(g.dias[0])} a ${capitalize(g.dias[g.dias.length - 1])}`
          : capitalize(g.dias[0]);
        return `<p><strong>${diasStr}:</strong> ${g.horario}</p>`;
      }).join('')
    : '<p style="color: #f59e0b;">⚠️ No hay horarios configurados</p>';

  container.innerHTML = html;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== TABLA DE PRODUCTOS ====================
function renderProductosTable() {
  const tbody = document.getElementById('productosTableBody');
  const countEl = document.getElementById('productCount');

  if (!tbody) return;

  // Actualizar contador total
  if (countEl) {
    countEl.textContent = productos.length;
  }

  if (productos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: #f59e0b; padding: 2rem;">
          ⚠️ No hay productos activos. <a href="productos.html" style="color: #667eea;">Agregar productos</a>
        </td>
      </tr>
    `;
    return;
  }

  const html = productos.map(p => {
    const precio = p.precio_final > 0 
      ? `$${Number(p.precio_final).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` 
      : 'Sin precio';
    
    return `
      <tr>
        <td>${p.nombre || 'Sin nombre'}</td>
        <td>${precio}</td>
        <td>${p.categoria || 'Sin categoría'}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
}

// ==================== RESUMEN IA CONFIG ====================
function renderIAConfigCard() {
  const container = document.getElementById('iaConfigContent');
  if (!container) return;

  const config = comercioData.aiConfig || {};

  const html = `
    <div class="config-item">
      <strong>Nombre</strong>
      <span>${config.aiName || 'No configurado'}</span>
    </div>
    <div class="config-item">
      <strong>Personalidad</strong>
      <span>${config.aiPersonality || 'No configurada'}</span>
    </div>
    <div class="config-item">
      <strong>Tono</strong>
      <span>${config.aiTone || 'No configurado'}</span>
    </div>
    <div class="config-item">
      <strong>Idioma</strong>
      <span>${config.aiLanguage || 'No configurado'}</span>
    </div>
  `;

  container.innerHTML = html;
}

// ==================== ⏳ PLACEHOLDER: BOT STATUS (VERCEL BLOB) ====================
async function renderBotStatus() {
  const statusBox = document.getElementById('iaStatusBox');
  const shareBox = document.getElementById('iaShareBox');
  const statusGrid = document.getElementById('statusGrid');
  const statusBadge = statusBox?.querySelector('.status-badge');
  const botLinkInput = document.getElementById('botLinkInput');

  if (!statusBox || !statusGrid) return;

  try {
    // ⏳ TODO: IMPLEMENTAR CUANDO ESTÉ LA API DE VERCEL BLOB
    // =========================================================
    // const blobUrl = `https://[TU_VERCEL_STORAGE_URL]/bots/${currentComercioId}.json`;
    // 
    // // 1. Obtener metadata del blob (HEAD request)
    // const headResponse = await fetch(blobUrl, { method: 'HEAD' });
    // 
    // if (!headResponse.ok) {
    //   throw new Error('Bot no generado aún');
    // }
    //
    // const lastModified = new Date(headResponse.headers.get('last-modified'));
    // const contentLength = parseInt(headResponse.headers.get('content-length'));
    // const size = Math.round(contentLength / 1024); // KB
    //
    // // 2. Descargar el JSON completo
    // const botResponse = await fetch(blobUrl);
    // const botData = await botResponse.json();
    // const metadata = botData.metadata || {};
    //
    // // 3. Calcular estadísticas
    // const activeProducts = botData.products?.filter(p => !p.paused).length || 0;
    // const totalProducts = botData.products?.length || 0;
    // const categories = [...new Set(botData.products?.map(p => p.categoria).filter(Boolean))];
    //
    // // 4. Actualizar UI con datos reales
    // if (statusBadge) {
    //   statusBadge.textContent = '✅ Activo y sincronizado';
    //   statusBadge.className = 'status-badge';
    // }
    //
    // statusGrid.innerHTML = `
    //   <div class="status-item">
    //     <strong>Última generación</strong>
    //     <span>${lastModified.toLocaleString('es-AR', { 
    //       day: '2-digit', 
    //       month: '2-digit', 
    //       year: 'numeric',
    //       hour: '2-digit',
    //       minute: '2-digit'
    //     })}</span>
    //   </div>
    //   <div class="status-item">
    //     <strong>Versión</strong>
    //     <span>${metadata.version || '1.0.0'}</span>
    //   </div>
    //   <div class="status-item">
    //     <strong>Tamaño</strong>
    //     <span>${size} KB</span>
    //   </div>
    //   <div class="status-item">
    //     <strong>Productos activos</strong>
    //     <span>${activeProducts} de ${totalProducts}</span>
    //   </div>
    //   <div class="status-item">
    //     <strong>Categorías</strong>
    //     <span>${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '...' : ''}</span>
    //   </div>
    // `;
    //
    // // 5. Habilitar link del bot
    // if (botLinkInput) {
    //   botLinkInput.value = `https://indice.ai/bot/${currentComercioId}`;
    // }
    //
    // // 6. Habilitar botones de compartir
    // enableShareButtons();
    // =========================================================

    // 🔹 MIENTRAS TANTO: Mostrar mensaje de "próximamente"
    if (statusBadge) {
      statusBadge.textContent = '⏳ Próximamente disponible';
      statusBadge.className = 'status-badge loading';
    }

    statusGrid.innerHTML = `
      <div class="status-item">
        <strong>Estado</strong>
        <span>En desarrollo</span>
      </div>
      <div class="status-item">
        <strong>Nota</strong>
        <span style="font-size: 0.875rem;">La generación automática del bot se implementará próximamente</span>
      </div>
    `;

    // Deshabilitar botones de compartir temporalmente
    if (botLinkInput) {
      botLinkInput.value = 'El link se generará automáticamente cuando esté disponible';
    }

    disableShareButtons();

  } catch (error) {
    console.error('Error cargando estado del bot:', error);
    
    if (statusBadge) {
      statusBadge.textContent = '⚠️ No disponible';
      statusBadge.className = 'status-badge error';
    }

    statusGrid.innerHTML = `
      <div class="status-item">
        <strong>Estado</strong>
        <span style="font-size: 0.875rem;">Funcionalidad en desarrollo</span>
      </div>
    `;

    disableShareButtons();
  }
}

// ==================== HABILITAR/DESHABILITAR BOTONES ====================
function disableShareButtons() {
  ['copyLinkBtn', 'generateQRBtn', 'shareWhatsAppBtn', 'embedCodeBtn', 'previewBotBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
  });
}

function enableShareButtons() {
  ['copyLinkBtn', 'generateQRBtn', 'shareWhatsAppBtn', 'embedCodeBtn', 'previewBotBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('¿Cerrar sesión?')) {
        try {
          showLoading('Cerrando sesión...');
          await signOut(auth);
          window.location.href = '/index.html';
        } catch (error) {
          hideLoading();
          showToast('error', 'Error', 'No se pudo cerrar sesión');
        }
      }
    });
  }

  // Búsqueda de productos
  const searchInput = document.getElementById('searchProducts');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterProductos(e.target.value);
    });
  }

  // Botones de compartir
  setupBotShareButtons();
}

// ==================== FILTRO DE PRODUCTOS ====================
function filterProductos(searchTerm) {
  const tbody = document.getElementById('productosTableBody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  const normalized = searchTerm.toLowerCase().trim();

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(normalized) ? '' : 'none';
  });
}

// ==================== ⏳ PLACEHOLDER: BOTONES DE COMPARTIR ====================
function setupBotShareButtons() {
  // Copiar link
  const copyBtn = document.getElementById('copyLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const input = document.getElementById('botLinkInput');
      if (!input || !input.value || input.disabled) {
        showToast('info', 'Próximamente', 'Esta funcionalidad estará disponible cuando esté la API');
        return;
      }

      // ⏳ TODO: Descomentar cuando esté la API
      // input.select();
      // document.execCommand('copy');
      // showToast('success', '¡Copiado!', 'Link copiado al portapapeles');
      
      // O usar la API moderna:
      // navigator.clipboard.writeText(input.value)
      //   .then(() => showToast('success', '¡Copiado!', 'Link copiado al portapapeles'))
      //   .catch(err => showToast('error', 'Error', 'No se pudo copiar el link'));
    });
  }

  // Generar QR
  const qrBtn = document.getElementById('generateQRBtn');
  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      const input = document.getElementById('botLinkInput');
      if (!input || !input.value || input.disabled) {
        showToast('info', 'Próximamente', 'Esta funcionalidad estará disponible cuando esté la API');
        return;
      }

      // ⏳ TODO: Descomentar cuando esté la API
      // const link = input.value;
      // const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;
      // window.open(qrUrl, '_blank', 'width=450,height=500');
    });
  }

  // WhatsApp
  const whatsappBtn = document.getElementById('shareWhatsAppBtn');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const input = document.getElementById('botLinkInput');
      if (!input || !input.value || input.disabled) {
        showToast('info', 'Próximamente', 'Esta funcionalidad estará disponible cuando esté la API');
        return;
      }

      // ⏳ TODO: Descomentar cuando esté la API
      // const link = input.value;
      // const text = `¡Hola! Hablá con mi asistente virtual para consultas: ${link}`;
      // const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      // window.open(whatsappUrl, '_blank');
    });
  }

  // Embed
  const embedBtn = document.getElementById('embedCodeBtn');
  if (embedBtn) {
    embedBtn.addEventListener('click', () => {
      const input = document.getElementById('botLinkInput');
      if (!input || !input.value || input.disabled) {
        showToast('info', 'Próximamente', 'Esta funcionalidad estará disponible cuando esté la API');
        return;
      }

      // ⏳ TODO: Descomentar cuando esté la API
      // const code = `<!-- ÍndiceIA Chatbot -->
      // <script>
      //   window.IndiceChatbot = {
      //     id: '${currentComercioId}',
      //     theme: 'light',
      //     position: 'bottom-right'
      //   };
      // </script>
      // <script src="https://indice.ai/embed.js" async></script>`;
      // 
      // navigator.clipboard.writeText(code)
      //   .then(() => showToast('success', 'Código copiado', 'Pegalo en tu sitio web'))
      //   .catch(err => showToast('error', 'Error', 'No se pudo copiar el código'));
    });
  }

  // Preview
  const previewBtn = document.getElementById('previewBotBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const input = document.getElementById('botLinkInput');
      if (!input || !input.value || input.disabled) {
        showToast('info', 'Próximamente', 'Esta funcionalidad estará disponible cuando esté la API');
        return;
      }

      // ⏳ TODO: Descomentar cuando esté la API
      // const link = input.value;
      // window.open(link, '_blank', 'width=400,height=600');
    });
  }
}
