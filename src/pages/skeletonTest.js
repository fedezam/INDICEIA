// ============================================================
// src/pages/link-publico/link-publico.js
// ============================================================
// 🧠 CONTRATO ctx:
//   ctx.comercioData.slug  → slug del comercio
//   ctx.comercioId         → ID del comercio
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== COMPONENTES ====================
import { createButton } from '/src/skeleton/components/button/index.js';
import { showToast }    from '/src/shared/utils.js';

// ==================== API CARTEL (cerrada) ====================
import {
  generateQR,
  renderPreview,
  getExportFormats,
  exportCartel,
} from '/lib/cartel/index.js';

// ==================== CONSTANTE ÚNICA ====================
const PUBLIC_BASE_URL = 'https://indiceia-public.vercel.app';

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: {
    loadingMessage: 'Cargando link público...',
  },

  async onReady(ctx) {
    // 1️⃣ LAYOUT
    mountLayout(ctx);

    // 2️⃣ LOAD
    const state = await load(ctx);

    // 3️⃣ RENDER
    render(ctx, state);
  }
});

// ============================================================
// LOAD — solo datos, sin tocar el DOM
// ============================================================
async function load(ctx) {
  const { slug } = ctx.comercioData;

  if (!slug) {
    showToast('Este comercio no tiene slug', 'error');
    throw new Error('Slug no encontrado');
  }

  const publicUrl = `${PUBLIC_BASE_URL}/c/${slug}`;

  // QR se genera acá: es dato, no DOM
  const qrCanvas = await generateQR(publicUrl);

  return {
    publicUrl,
    qrCanvas,
  };
}

// ============================================================
// RENDER — solo DOM, sin lógica de negocio
// ============================================================
function render(ctx, state) {
  const { publicUrl, qrCanvas } = state;

  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  // ==================== LINK PÚBLICO ====================
  const linkSection = document.createElement('div');
  linkSection.className = 'page-content';
  linkSection.innerHTML = `
    <h1>Tu link público</h1>
    <p id="publicUrl" class="public-url">${publicUrl}</p>
  `;
  page.appendChild(linkSection);

  // Botón copiar link
  const copyButton = createButton({
    label: 'Copiar link',
    variant: 'outline-primary',
    icon: 'fa-copy',
    onClick: () => {
      navigator.clipboard.writeText(publicUrl);
      showToast('Link copiado', 'success');
    }
  });
  page.appendChild(copyButton);

  // ==================== PREVIEW CARTEL ====================
  const previewContainer = document.createElement('div');
  previewContainer.id = 'cartel-preview';
  page.appendChild(previewContainer);

  // requestAnimationFrame: garantiza que el canvas esté en el DOM
  requestAnimationFrame(() => {
    const previewCanvas = renderPreview({ qrCanvas });
    previewCanvas.style.maxWidth = '100%';
    previewCanvas.style.height = 'auto';
    previewCanvas.style.display = 'block';
    previewContainer.appendChild(previewCanvas);
  });

  // ==================== BOTONES DESCARGA ====================
  const cartelesContainer = document.createElement('div');
  cartelesContainer.id = 'carteles';
  page.appendChild(cartelesContainer);

  const formats = getExportFormats();

  formats.forEach((format) => {
    const downloadBtn = createButton({
      label: `Descargar ${format.label}`,
      variant: 'secondary',
      icon: 'fa-download',
      onClick: async () => {
        downloadBtn.setLoading(true);
        try {
          const result = exportCartel({
            formatId: format.id,
            qrCanvas,
          });
          result.download({ name: `indiceia-${format.id}` });
          showToast('Cartel descargado', 'success');
        } catch (err) {
          console.error(err);
          showToast('Error al generar cartel', 'error');
        } finally {
          downloadBtn.setLoading(false);
        }
      }
    });
    cartelesContainer.appendChild(downloadBtn);
  });

  // ==================== BOTÓN VOLVER ====================
  const backButton = createButton({
    label: 'Volver al dashboard',
    variant: 'outline-secondary',
    icon: 'fa-arrow-left',
    onClick: () => {
      window.location.href = '/src/pages/dashboard.html';
    }
  });
  page.appendChild(backButton);
}
