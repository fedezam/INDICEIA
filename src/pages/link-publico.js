// ============================================================
// src/pages/link-publico.js
// ============================================================
import { runSkeleton }           from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }            from '/src/skeleton/components/card/index.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';
import {
  generateQR,
  renderPreview,
  getExportFormats,
  exportCartel,
} from '../../lib/cartel/index.js';
import './link-publico.css';

const PUBLIC_BASE_URL = 'https://indiceia-public.vercel.app';

// ============================================================
const page = {

  _data: {
    publicUrl: null,
    qrCanvas:  null,
    formats:   []
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    console.group('[link-publico] load()');
    console.log('comercioData:', ctx.comercioData);

    // FIX: el slug vive en landing.slug, no en la raíz
    const slug = ctx.comercioData?.landing?.slug;

    if (!slug) {
      console.warn('[link-publico] sin slug en landing');
      console.groupEnd();
      return;
    }

    this._data.publicUrl = `${PUBLIC_BASE_URL}/c/${slug}`;
    this._data.formats   = getExportFormats();

    console.log('publicUrl:', this._data.publicUrl);
    console.log('formatos:', this._data.formats.map(f => f.id));

    // Generamos el QR en load() para que esté listo al renderizar
    console.log('[link-publico] generando QR...');
    this._data.qrCanvas = await generateQR(this._data.publicUrl);
    console.log('[link-publico] QR generado:', this._data.qrCanvas);

    console.groupEnd();
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    console.log('[link-publico] render() | publicUrl:', this._data.publicUrl);

    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    if (!this._data.publicUrl) {
      root.appendChild(this._renderSinSlug());
      return;
    }

    root.appendChild(this._renderHeader());
    root.appendChild(this._renderLinkCard());
    root.appendChild(this._renderPreviewCard());
    root.appendChild(this._renderDescargasCard());
  },

  // ──────────────────────────────────────────────────────────
  // SIN SLUG
  // ──────────────────────────────────────────────────────────
  _renderSinSlug() {
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
  },

  // ──────────────────────────────────────────────────────────
  // HEADER
  // ──────────────────────────────────────────────────────────
  _renderHeader() {
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-link"></i> Link público</h1>
      <p>Este es el acceso directo a tu comercio en ÍndiceIA</p>
    `;
    return header;
  },

  // ──────────────────────────────────────────────────────────
  // LINK CARD
  // ──────────────────────────────────────────────────────────
  _renderLinkCard() {
    const container = document.createElement('div');

    const linkBox = document.createElement('div');
    linkBox.className = 'link-box';
    linkBox.innerHTML = `<span class="public-url">${this._data.publicUrl}</span>`;

    const btnCopiar = createButton({
      label:   'Copiar',
      variant: 'secondary',
      icon:    'fa-copy',
      onClick: () => {
        navigator.clipboard.writeText(this._data.publicUrl);
        showToast('Link copiado', 'success');
      }
    });

    linkBox.appendChild(btnCopiar);
    container.appendChild(linkBox);

    return createCard({
      title:   'Link público',
      icon:    'fa-link',
      variant: 'primary',
      highlight: true,
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // PREVIEW CARD
  // ──────────────────────────────────────────────────────────
  _renderPreviewCard() {
    const container = document.createElement('div');

    const descripcion = document.createElement('p');
    descripcion.textContent = 'Este es el cartel que pueden escanear tus clientes para acceder directamente a tu comercio.';
    container.appendChild(descripcion);

    const previewArea = document.createElement('div');
    previewArea.className = 'cartel-preview';
    container.appendChild(previewArea);

    // Renderizamos el preview en el próximo frame para que el DOM esté listo
    requestAnimationFrame(() => {
      if (!this._data.qrCanvas) {
        console.warn('[link-publico] qrCanvas null al renderizar preview');
        return;
      }
      const previewCanvas = renderPreview({ qrCanvas: this._data.qrCanvas });
      previewCanvas.style.maxWidth = '100%';
      previewCanvas.style.height   = 'auto';
      previewCanvas.style.display  = 'block';
      previewArea.appendChild(previewCanvas);
      console.log('[link-publico] preview renderizado OK');
    });

    return createCard({
      title:   'Tu cartel con QR',
      icon:    'fa-qrcode',
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // DESCARGAS CARD
  // ──────────────────────────────────────────────────────────
  _renderDescargasCard() {
    const container = document.createElement('div');

    const descripcion = document.createElement('p');
    descripcion.textContent = 'Elegí el formato según dónde lo vayas a usar.';
    container.appendChild(descripcion);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'carteles-actions';

    this._data.formats.forEach((format) => {
      const btn = createButton({
        label:   `Descargar ${format.label}`,
        variant: 'secondary',
        icon:    'fa-download',
        onClick: async () => {
          if (!this._data.qrCanvas) {
            showToast('El QR todavía no está listo', 'warning');
            return;
          }

          console.log('[link-publico] descargando formato:', format.id);
          btn.disabled   = true;
          btn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Generando…';

          try {
            const result = exportCartel({ formatId: format.id, qrCanvas: this._data.qrCanvas });
            result.download({ name: `indiceia-${format.id}` });
            showToast('Cartel descargado', 'success');
            console.log('[link-publico] descarga OK:', format.id);
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
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando tu link público...' }
});
