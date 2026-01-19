// src/pages/link-publico.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { showToast } from '../shared/utils.js';

let comercioId = null;
let publicUrl = null;
let qrInstance = null;

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  const userRef = doc(db, 'usuarios', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  comercioId = userData.comercioId;

  if (comercioId) {
    initPage(comercioId);
  }
});

// ==================== INIT ====================
async function initPage(id) {
  try {
    const comercioSnap = await getDoc(doc(db, 'comercios', id));
    if (!comercioSnap.exists()) {
      showToast('Error: comercio no encontrado', 'error');
      return;
    }

    const comercioData = comercioSnap.data();
    if (!comercioData.slug) {
      showToast('Error: este comercio no tiene slug asignado', 'error');
      return;
    }

    const slug = comercioData.slug;
    publicUrl = `https://indiceia.vercel.app/live/${slug}`;

    document.getElementById('publicUrl').textContent = publicUrl;

    document.getElementById('copyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(publicUrl);
      showToast('¡Link copiado al portapapeles!', 'success');
    });

    initQRControls();
    renderQR('redes'); // preview inicial

  } catch (err) {
    console.error(err);
    showToast('Error al inicializar la página', 'error');
  }
}

// ==================== QR ====================

// Presets de tamaño
const QR_PRESETS = {
  redes: 360,
  a4: 900,
  vidriera: 1600
};

function createQR(size) {
  return new QRCodeStyling({
    width: size,
    height: size,
    data: publicUrl,
    margin: 20,

    qrOptions: {
      errorCorrectionLevel: 'H'
    },

    dotsOptions: {
      color: '#000000',
      type: 'rounded'
    },

    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#000000'
    },

    cornersDotOptions: {
      type: 'dot',
      color: '#000000'
    },

    backgroundOptions: {
      color: '#ffffff'
    },

    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 10
    }

    // Si después querés logo:
    // image: '/assets/indiceia-logo-mono.png'
  });
}

function renderQR(preset) {
  const size = QR_PRESETS[preset];
  if (!size) return;

  const container = document.getElementById('qr-preview');
  container.innerHTML = '';

  qrInstance = createQR(size);
  qrInstance.append(container);
}

function downloadQR(preset) {
  const size = QR_PRESETS[preset];
  if (!size) return;

  const qr = createQR(size);
  qr.download({
    name: `indiceia-${preset}`,
    extension: 'png'
  });
}

// ==================== CONTROLS ====================
function initQRControls() {
  document.getElementById('qrRedes').addEventListener('click', () => {
    renderQR('redes');
  });

  document.getElementById('qrA4').addEventListener('click', () => {
    renderQR('a4');
  });

  document.getElementById('qrVidriera').addEventListener('click', () => {
    renderQR('vidriera');
  });

  document.getElementById('downloadRedes').addEventListener('click', () => {
    downloadQR('redes');
  });

  document.getElementById('downloadA4').addEventListener('click', () => {
    downloadQR('a4');
  });

  document.getElementById('downloadVidriera').addEventListener('click', () => {
    downloadQR('vidriera');
  });
}

