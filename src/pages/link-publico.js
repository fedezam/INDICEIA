// src/pages/link-publico.js

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { showToast } from '../shared/utils.js';

// API CARTEL (cerrada)
import {
  generateQR,
  renderPreview,
  getExportFormats,
  exportCartel,
} from '../../lib/cartel/index.js';

// ==================== CONSTANTE ÚNICA ====================
const PUBLIC_BASE_URL = 'https://indiceia-public.vercel.app';

let publicUrl = null;
let qrCanvas = null;

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!userSnap.exists()) return;

  const { comercioId } = userSnap.data();
  if (comercioId) initPage(comercioId);
});

// ==================== INIT ====================
async function initPage(comercioId) {
  try {
    const comercioSnap = await getDoc(doc(db, 'comercios', comercioId));
    if (!comercioSnap.exists()) {
      showToast('Comercio no encontrado', 'error');
      return;
    }

    const { slug } = comercioSnap.data();
    if (!slug) {
      showToast('Este comercio no tiene slug', 'error');
      return;
    }

    // LINK PÚBLICO
    publicUrl = `${PUBLIC_BASE_URL}/landing/${slug}`;
    document.getElementById('publicUrl').textContent = publicUrl;

    document.getElementById('copyBtn').onclick = () => {
      navigator.clipboard.writeText(publicUrl);
      showToast('Link copiado', 'success');
    };

    // 1️⃣ Generar QR único
    qrCanvas = await generateQR(publicUrl);

   // esperar un frame real antes de usar el canvas
     requestAnimationFrame(() => {
       renderCartelPreview();
     });

    // 2️⃣ Preview
    renderCartelPreview();

    // 3️⃣ Botones de descarga
    renderDownloadOptions();

  } catch (err) {
    console.error(err);
    showToast('Error al cargar la página', 'error');
  }
}

// ==================== PREVIEW ====================
function renderCartelPreview() {
  const container = document.getElementById('cartel-preview');
  if (!container) return;

  container.innerHTML = '';

  const previewCanvas = renderPreview({ qrCanvas });
  previewCanvas.style.maxWidth = '100%';
  previewCanvas.style.height = 'auto';
  previewCanvas.style.display = 'block';

  container.appendChild(previewCanvas);
}

// ==================== DESCARGAS ====================
function renderDownloadOptions() {
  const container = document.getElementById('carteles');
  container.innerHTML = '';

  const formats = getExportFormats();

  formats.forEach((format) => {
    const btn = document.createElement('button');
    btn.className = 'download-btn';
    btn.textContent = `Descargar ${format.label}`;

    btn.onclick = async () => {
      if (!qrCanvas) return;

      btn.disabled = true;
      btn.textContent = 'Generando…';

      try {
        const result = exportCartel({
          formatId: format.id,
          qrCanvas,
        });

        result.download({
          name: `indiceia-${format.id}`,
        });

        showToast('Cartel descargado', 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al generar cartel', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = `Descargar ${format.label}`;
      }
    };

    container.appendChild(btn);
  });
}
