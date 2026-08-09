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

const PUBLIC_BASE_URL = 'https://ia.indiceia.dev';

// Canales con sus metadatos para renderizar
const CANALES = [
  { id: 'qr',  label: 'QR / Vidriera', icon: 'fa-qrcode',         hint: 'Para imprimir y pegar en tu local. El QR ya incluye el rastreo.' },
  { id: 'ig',  label: 'Instagram',     icon: 'fa-instagram',       hint: 'Para tu bio o stories. Centralizá tu catálogo en un solo link.' },
  { id: 'fb',  label: 'Facebook',      icon: 'fa-facebook',        hint: 'Para tu página o publicaciones. Convertí visitas en pedidos reales.' },
  { id: 'wa',  label: 'WhatsApp',      icon: 'fa-whatsapp',        hint: 'Para tu firma, respuestas rápidas o estados. Tu menú se envía solo.' },
  { id: 'web', label: 'Sitio web',     icon: 'fa-globe',           hint: 'Para incrustar en tu web existente. Integrá tu catálogo sin programar.' },
];

// ============================================================
const page = {

  _data: {
    slug:      null,
    publicUrl: null,   // sin src — link limpio para referencia
    links:     {},     // { qr, ig, fb, wa, web }
    qrCanvas:  null,
    formats:   []
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    console.group('[link-publico] load()');
    console.log('comercioData:', ctx.comercioData);

    const slug = ctx.comercioData?.landing?.slug;

    if (!slug) {
      console.warn('[link-publico] sin slug en landing');
      console.groupEnd();
      return;
    }

    this._data.slug      = slug;
    this._data.publicUrl = `${PUBLIC_BASE_URL}/c/${slug}`;
    this._data.formats   = getExportFormats();

    // Generamos un link trackeado por canal
    CANALES.forEach(({ id }) => {
      this._data.links[id] = `${PUBLIC_BASE_URL}/c/${slug}?src=${id}`;
    });

    console.log('publicUrl:', this._data.publicUrl);
    console.log('links:', this._data.links);
    console.log('formatos:', this._data.formats.map(f => f.id));

    // El QR apunta al link con src=qr
    console.log('[link-publico] generando QR...');
    this._data.qrCanvas = await generateQR(this._data.links.qr);
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
    root.appendChild(this._renderLinksCard());
    root.appendChild(this._renderPreviewCard());
    root.appendChild(this._renderDescargasCard());
    root.appendChild(this._renderBotonVolver());
  },

  // ──────────────────────────────────────────────────────────
  // BOTÓN VOLVER
  // ──────────────────────────────────────────────────────────
  _renderBotonVolver() {
    const div = document.createElement('div');
    div.className = 'page-footer-action';
    div.appendChild(createButton({
      label:   'Volver al dashboard',
      variant: 'secondary',
      icon:    'fa-arrow-left',
      onClick: () => window.location.href = '/dashboard.html'
    }));
    return div;
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
  // LINKS CARD — uno por canal (EXCLUYENDO QR)
  // ──────────────────────────────────────────────────────────
  _renderLinksCard() {
    const container = document.createElement('div');
    container.className = 'links-list';

    // ── TEXTO EXPLICATIVO ────────────────────────────────
    const intro = document.createElement('div');
    intro.className = 'links-intro';
    intro.innerHTML = `
      <p><strong>Cada link está diseñado para un canal específico.</strong></p>
      <p>Usar el correcto permite que ÍndiceIA registre de dónde viene cada visita. En la página de <strong>Estadísticas</strong> vas a poder ver exactamente qué red te trae más clientes, detectar cuáles tienen menos tráfico y ajustar tu estrategia para mejorar los canales que menos convierten.</p>
      <p style="margin-top: 0.75rem; border-top: 1px solid var(--s-gray-200); padding-top: 0.75rem;">Además, tu link es <strong>permanente por canal</strong>: una vez que lo compartís, nunca cambia. Si actualizás productos, precios o datos de tu comercio, el contenido se refresca automáticamente. No necesitás generar un link nuevo ni volver a compartirlo cada vez que hagas un ajuste.</p>
    `;
    container.appendChild(intro);
    // ─────────────────────────────────────────────────────

    // Filtramos 'qr' porque ya aparece en la sección de descarga/preview
    CANALES.filter(({ id }) => id !== 'qr').forEach(({ id, label, icon, hint }) => {
      const url = this._data.links[id];

      const row = document.createElement('div');
      row.className = 'link-row';
      row.innerHTML = `
        <div class="link-row-meta">
          <span class="link-row-label"><i class="fab ${icon}"></i> ${label}</span>
          <span class="link-row-hint">${hint}</span>
        </div>
        <span class="public-url">${url}</span>
      `;

      const btn = createButton({
        label:   'Copiar',
        variant: 'secondary',
        icon:    'fa-copy',
        onClick: () => {
          navigator.clipboard.writeText(url);
          showToast(`Link de ${label} copiado`, 'success');
        }
      });

      row.appendChild(btn);
      container.appendChild(row);
    });

    return createCard({
      title:     'Links por canal',
      icon:      'fa-link',
      variant:   'primary',
      highlight: true,
      content:   container
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

    requestAnimationFrame(() => {
      if (!this._data.qrCanvas) {
        console.warn('[link-publico] qrCanvas null al renderizar preview');
        return;
      }
      // renderPreview ahora es async (carga fuentes de marca antes de dibujar)
      renderPreview({ qrCanvas: this._data.qrCanvas }).then((previewCanvas) => {
        previewCanvas.style.maxWidth = '100%';
        previewCanvas.style.height   = 'auto';
        previewCanvas.style.display  = 'block';
        previewArea.appendChild(previewCanvas);
        console.log('[link-publico] preview renderizado OK');
      }).catch((err) => {
        console.error('[link-publico] error renderizando preview:', err);
      });
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
          btn.disabled  = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando…';

          try {
            // exportCartel ahora es async (carga fuentes de marca antes de dibujar)
            const result = await exportCartel({ formatId: format.id, qrCanvas: this._data.qrCanvas });
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
