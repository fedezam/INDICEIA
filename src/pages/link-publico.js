// ============================================================
// src/pages/link-publico/link-publico.js
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';

// ==================== COMPONENTES ====================
import { createCard }   from '/src/skeleton/components/card/index.js';
import { createButton } from '/src/skeleton/components/button/index.js';
import { showToast }    from '/src/skeleton/components/toast/index.js';

// ==================== CARTEL ====================
import {
  generateQR,
  renderPreview,
  getExportFormats,
  exportCartel,
} from '../../lib/cartel/index.js';

import './link-publico.css';

const PUBLIC_BASE_URL = 'https://indiceia-public.vercel.app';

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando tu link público...' },

  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const slug = ctx.comercioData?.landing?.slug;

  if (!slug) {
    console.warn('[link-publico] sin slug en landing');
    return { publicUrl: null, qrCanvas: null, formats: [] };
  }

  const publicUrl = `${PUBLIC_BASE_URL}/c/${slug}`;
  const formats   = getExportFormats();
  const qrCanvas  = await generateQR(publicUrl);

  return { publicUrl, qrCanvas, formats };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  if (!state.publicUrl) {
    page.appendChild(renderSinSlug());
    return;
  }

  page.appendChild(renderHeader());
  page.appendChild(renderLinkCard(state));
  page.appendChild(renderPreviewCard(state));
  page.appendChild(renderDescargasCard(state));
}

// ============================================================
// SIN SLUG — Patrón 3: solo botón de navegación
// ============================================================
function renderSinSlug() {
  const container = document.createElement('div');
  container.className = 'empty-state';
  container.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <h2>Tu comercio no tiene un link público todavía</h2>
    <p>Generá la entidad desde el dashboard para obtener tu link y QR.</p>
  `;
  container.appendChild(createButton({
    label:   'Ir al dashboard',
    variant: 'primary',
    icon:    'fa-arrow-left',
    onClick: () => window.location.href = '/dashboard.html'
  }));
  return container;
}

// ============================================================
// HEADER
// ============================================================
function renderHeader() {
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h1><i class="fas fa-link"></i> Link público</h1>
    <p>Este es el acceso directo a tu comercio en ÍndiceIA</p>
  `;
  return header;
}

// ============================================================
// LINK CARD
// ============================================================
function renderLinkCard(state) {
  const container = document.createElement('div');

  const linkBox = document.createElement('div');
  linkBox.className = 'link-box';
  linkBox.innerHTML = `<span class="public-url">${state.publicUrl}</span>`;

  linkBox.appendChild(createButton({
    label:   'Copiar',
    variant: 'secondary',
    icon:    'fa-copy',
    onClick: () => {
      navigator.clipboard.writeText(state.publicUrl);
      showToast('Link copiado', 'success');
    }
  }));

  container.appendChild(linkBox);

  return createCard({
    title:     'Link público',
    icon:      'fa-link',
    variant:   'primary',
    highlight: true,
    content:   container
  });
}

// ============================================================
// PREVIEW CARD
// ============================================================
function renderPreviewCard(state) {
  const container = document.createElement('div');

  const descripcion = document.createElement('p');
  descripcion.textContent = 'Este es el cartel que pueden escanear tus clientes para acceder directamente a tu comercio.';
  container.appendChild(descripcion);

  const previewArea = document.createElement('div');
  previewArea.className = 'cartel-preview';
  container.appendChild(previewArea);

  requestAnimationFrame(() => {
    if (!state.qrCanvas) {
      console.warn('[link-publico] qrCanvas null al renderizar preview');
      return;
    }
    const previewCanvas = renderPreview({ qrCanvas: state.qrCanvas });
    previewCanvas.style.maxWidth = '100%';
    previewCanvas.style.height   = 'auto';
    previewCanvas.style.display  = 'block';
    previewArea.appendChild(previewCanvas);
  });

  return createCard({
    title:   'Tu cartel con QR',
    icon:    'fa-qrcode',
    content: container
  });
}

// ============================================================
// DESCARGAS CARD
// ============================================================
function renderDescargasCard(state) {
  const container = document.createElement('div');

  const descripcion = document.createElement('p');
  descripcion.textContent = 'Elegí el formato según dónde lo vayas a usar.';
  container.appendChild(descripcion);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'carteles-actions';

  state.formats.forEach((format) => {
    const btn = createButton({
      label:   `Descargar ${format.label}`,
      variant: 'secondary',
      icon:    'fa-download',
      onClick: async () => {
        if (!state.qrCanvas) {
          showToast('El QR todavía no está listo', 'warning');
          return;
        }
        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando…';
        try {
          const result = exportCartel({ formatId: format.id, qrCanvas: state.qrCanvas });
          result.download({ name: `indiceia-${format.id}` });
          showToast('Cartel descargado', 'success');
        } catch (err) {
          console.error('[link-publico] error exportando:', err);
          showToast('Error al generar cartel', 'error');
        } finally {
          btn.disabled  = false;
          btn.innerHTML = `<i class="fas fa-download"></i> Descargar ${format.label}`;
        }
      }
    });
    actionsDiv.appendChild(btn);
  });

  container.appendChild(actionsDiv);

  return createCard({
    title:   'Descargar cartel',
    icon:    'fa-file-image',
    content: container
  });
}
