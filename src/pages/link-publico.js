// src/pages/link-publico.js
import { auth, db }             from '../firebase.js';
import { onAuthStateChanged }   from 'firebase/auth';
import { doc, getDoc }          from 'firebase/firestore';
import { showToast }            from '../shared/utils.js';

// FIX: ruta corregida — relativa desde src/pages/ hacia lib/cartel/
import {
  generateQR,
  renderPreview,
  getExportFormats,
  exportCartel,
} from '../../lib/cartel/index.js';

const PUBLIC_BASE_URL = 'https://indiceia-public.vercel.app';

let publicUrl = null;
let qrCanvas  = null;

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
  console.log('[link-publico] onAuthStateChanged user:', user?.uid);

  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
    if (!userSnap.exists()) {
      console.warn('[link-publico] usuario sin doc en Firestore');
      return;
    }

    const { comercioId } = userSnap.data();
    console.log('[link-publico] comercioId:', comercioId);

    if (comercioId) initPage(comercioId);

  } catch (err) {
    console.error('[link-publico] error en auth flow:', err);
    showToast('Error de autenticación', 'error');
  }
});

// ==================== INIT ====================
async function initPage(comercioId) {
  console.group('[link-publico] initPage()');
  try {
    const comercioSnap = await getDoc(doc(db, 'comercios', comercioId));

    if (!comercioSnap.exists()) {
      console.warn('[link-publico] comercio no encontrado:', comercioId);
      showToast('Comercio no encontrado', 'error');
      console.groupEnd();
      return;
    }

    const data = comercioSnap.data();
    console.log('comercioData:', data);

    const slug = data.landing?.slug;
    if (!slug) {
      console.warn('[link-publico] comercio sin slug');
      showToast('Este comercio no tiene slug', 'error');
      console.groupEnd();
      return;
    }

    // ── Link público ──────────────────────────────────────
    publicUrl = `${PUBLIC_BASE_URL}/c/${slug}`;
    console.log('publicUrl:', publicUrl);

    document.getElementById('publicUrl').textContent = publicUrl;
    document.getElementById('copyBtn').onclick = () => {
      navigator.clipboard.writeText(publicUrl);
      showToast('Link copiado', 'success');
    };

    // ── 1. Generar QR ─────────────────────────────────────
    console.log('[link-publico] generando QR...');
    qrCanvas = await generateQR(publicUrl);
    console.log('[link-publico] QR generado:', qrCanvas);

    // ── 2. Renderizar preview (esperamos un frame real) ───
    requestAnimationFrame(() => {
      renderCartelPreview();
    });

    // ── 3. Botones de descarga ────────────────────────────
    renderDownloadOptions();

  } catch (err) {
    console.error('[link-publico] error en initPage:', err);
    showToast('Error al cargar la página', 'error');
  }
  console.groupEnd();
}

// ==================== PREVIEW ====================
function renderCartelPreview() {
  console.log('[link-publico] renderCartelPreview() qrCanvas:', qrCanvas);

  const container = document.getElementById('cartel-preview');
  if (!container) {
    console.warn('[link-publico] #cartel-preview no encontrado en el DOM');
    return;
  }
  if (!qrCanvas) {
    console.warn('[link-publico] qrCanvas es null, no se puede renderizar preview');
    return;
  }

  container.innerHTML = '';

  const previewCanvas = renderPreview({ qrCanvas });
  previewCanvas.style.maxWidth = '100%';
  previewCanvas.style.height   = 'auto';
  previewCanvas.style.display  = 'block';
  container.appendChild(previewCanvas);

  console.log('[link-publico] preview renderizado OK');
}

// ==================== DESCARGAS ====================
function renderDownloadOptions() {
  console.log('[link-publico] renderDownloadOptions()');

  const container = document.getElementById('carteles');
  if (!container) {
    console.warn('[link-publico] #carteles no encontrado en el DOM');
    return;
  }

  container.innerHTML = '';

  const formats = getExportFormats();
  console.log('[link-publico] formatos disponibles:', formats.map(f => f.id));

  formats.forEach((format) => {
    const btn = document.createElement('button');
    btn.className   = 'download-btn';
    btn.textContent = `Descargar ${format.label}`;

    btn.onclick = async () => {
      if (!qrCanvas) {
        console.warn('[link-publico] descarga abortada — qrCanvas null');
        showToast('El QR todavía no está listo', 'warning');
        return;
      }

      console.log('[link-publico] descargando formato:', format.id);
      btn.disabled    = true;
      btn.textContent = 'Generando…';

      try {
        const result = exportCartel({ formatId: format.id, qrCanvas });

        result.download({ name: `indiceia-${format.id}` });

        showToast('Cartel descargado', 'success');
        console.log('[link-publico] descarga OK formato:', format.id);

      } catch (err) {
        console.error('[link-publico] error exportando cartel:', err);
        showToast('Error al generar cartel', 'error');

      } finally {
        btn.disabled    = false;
        btn.textContent = `Descargar ${format.label}`;
      }
    };

    container.appendChild(btn);
  });
}
