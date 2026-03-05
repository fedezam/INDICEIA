// ============================================================
// src/pages/link-publico.js
// ============================================================
import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createButton }           from '/src/skeleton/components/button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { getCarteles, buildCartelQR } from '/lib/cartel/index.js';

const PUBLIC_BASE_URL = 'https://indiceia-public.vercel.app';

// ============================================================
const page = {

  _data: {
    publicUrl: null,
    slug:      null,
    carteles:  []
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    console.group('[link-publico] load()');
    console.log('comercioData:', ctx.comercioData);

    const slug = ctx.comercioData?.slug;

    if (!slug) {
      console.warn('[link-publico] sin slug en comercioData');
      this._data.slug      = null;
      this._data.publicUrl = null;
      console.groupEnd();
      return;
    }

    this._data.slug      = slug;
    this._data.publicUrl = `${PUBLIC_BASE_URL}/c/${slug}`;
    this._data.carteles  = getCarteles(this._data.publicUrl);

    console.log('publicUrl:', this._data.publicUrl);
    console.log('carteles disponibles:', this._data.carteles.map(c => c.id));
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
    root.appendChild(this._renderCartelesSection());
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
      <h1><i class="fas fa-link"></i> Mi Link Público</h1>
      <p>Compartí este link o los carteles con tus clientes para que accedan a tu IA</p>
    `;
    return header;
  },

  // ──────────────────────────────────────────────────────────
  // LINK CARD
  // ──────────────────────────────────────────────────────────
  _renderLinkCard() {
    const container = document.createElement('div');

    const urlBox = document.createElement('div');
    urlBox.className = 'url-box';
    urlBox.innerHTML = `<span class="url-text">${this._data.publicUrl}</span>`;

    const btnCopiar = createButton({
      label:   'Copiar link',
      variant: 'primary',
      icon:    'fa-copy',
      onClick: () => {
        navigator.clipboard.writeText(this._data.publicUrl);
        showToast('Link copiado al portapapeles', 'success');
        console.log('[link-publico] link copiado:', this._data.publicUrl);
      }
    });

    const btnAbrir = createButton({
      label:   'Abrir link',
      variant: 'secondary',
      icon:    'fa-external-link-alt',
      onClick: () => window.open(this._data.publicUrl, '_blank')
    });

    const actions = document.createElement('div');
    actions.className = 'link-actions';
    actions.append(btnCopiar, btnAbrir);

    container.append(urlBox, actions);

    return createCard({
      title:   'Tu Link Público',
      icon:    'fa-link',
      variant: 'primary',
      highlight: true,
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // CARTELES
  // ──────────────────────────────────────────────────────────
  _renderCartelesSection() {
    const section = document.createElement('div');
    section.className = 'carteles-section';

    const titulo = document.createElement('h2');
    titulo.innerHTML = '<i class="fas fa-qrcode"></i> Carteles para imprimir o compartir';
    section.appendChild(titulo);

    const grid = document.createElement('div');
    grid.className = 'carteles-grid';

    this._data.carteles.forEach(cartel => {
      grid.appendChild(this._renderCartelCard(cartel));
    });

    section.appendChild(grid);
    return section;
  },

  _renderCartelCard(cartel) {
    const container = document.createElement('div');

    const descripcion = document.createElement('p');
    descripcion.textContent = cartel.descripcion;
    container.appendChild(descripcion);

    // Área de preview — se rellena al hacer click en "Vista previa"
    const previewArea = document.createElement('div');
    previewArea.className = 'cartel-preview-area';
    previewArea.style.display = 'none';
    container.appendChild(previewArea);

    const btnPreview = createButton({
      label:   'Vista previa',
      variant: 'secondary',
      icon:    'fa-eye',
      onClick: async () => {
        console.log('[link-publico] generando preview cartel:', cartel.id);
        btnPreview.disabled = true;
        btnPreview.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        try {
          const qrObj = await buildCartelQR(cartel, this._data.publicUrl);
          previewArea.innerHTML = '';
          qrObj.canvas.style.maxWidth = '100%';
          qrObj.canvas.style.height   = 'auto';
          qrObj.canvas.style.display  = 'block';
          qrObj.canvas.style.margin   = '12px auto 0';
          previewArea.appendChild(qrObj.canvas);
          previewArea.style.display = 'block';
          // Guardamos referencia para el botón de descarga
          previewArea._qrObj = qrObj;
          btnDescargar.disabled = false;
          console.log('[link-publico] preview OK cartel:', cartel.id);
        } catch (err) {
          console.error('[link-publico] error generando preview:', err);
          showToast('Error al generar la vista previa', 'error');
        } finally {
          btnPreview.disabled = false;
          btnPreview.innerHTML = '<i class="fas fa-eye"></i> Vista previa';
        }
      }
    });

    const btnDescargar = createButton({
      label:   'Descargar',
      variant: 'primary',
      icon:    'fa-download',
      onClick: async () => {
        console.log('[link-publico] descargando cartel:', cartel.id);
        btnDescargar.disabled = true;
        btnDescargar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        try {
          // Si ya hay un preview generado, reutilizamos el objeto
          const qrObj = previewArea._qrObj
            ? previewArea._qrObj
            : await buildCartelQR(cartel, this._data.publicUrl);

          qrObj.download({
            name:      `indiceia-${cartel.id}`,
            extension: 'png'
          });
          showToast('Cartel descargado', 'success');
          console.log('[link-publico] descarga OK cartel:', cartel.id);
        } catch (err) {
          console.error('[link-publico] error descarga cartel:', err);
          showToast('Error al generar el cartel', 'error');
        } finally {
          btnDescargar.disabled = false;
          btnDescargar.innerHTML = '<i class="fas fa-download"></i> Descargar';
        }
      }
    });

    // Descargar deshabilitado hasta que haya preview (o se genera solo al click)
    // Lo dejamos habilitado — genera directo sin necesidad de preview previo
    const actions = document.createElement('div');
    actions.className = 'cartel-actions';
    actions.append(btnPreview, btnDescargar);
    container.appendChild(actions);

    return createCard({
      title:   cartel.titulo,
      icon:    'fa-image',
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
