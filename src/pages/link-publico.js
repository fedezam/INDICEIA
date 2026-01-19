import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { showToast } from '../shared/utils.js';

let publicUrl = null;

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
async function initPage(id) {
  try {
    const comercioSnap = await getDoc(doc(db, 'comercios', id));
    if (!comercioSnap.exists()) {
      showToast('Comercio no encontrado', 'error');
      return;
    }

    const { slug } = comercioSnap.data();
    if (!slug) {
      showToast('Este comercio no tiene slug', 'error');
      return;
    }

    publicUrl = `https://indiceia.vercel.app/live/${slug}`;
    document.getElementById('publicUrl').textContent = publicUrl;

    document.getElementById('copyBtn').onclick = () => {
      navigator.clipboard.writeText(publicUrl);
      showToast('Link copiado', 'success');
    };

    initQR();
  } catch (err) {
    console.error(err);
    showToast('Error al cargar la página', 'error');
  }
}

// ==================== QR ====================

const QR_SIZES = {
  redes: 360,
  a4: 900,
  vidriera: 1600
};

let currentQR = null;

function buildQR(size) {
  return new QRCodeStyling({
    width: size,
    height: size,
    data: publicUrl,
    margin: 20,
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: { type: 'rounded', color: '#000' },
    cornersSquareOptions: { type: 'extra-rounded', color: '#000' },
    cornersDotOptions: { type: 'dot', color: '#000' },
    backgroundOptions: { color: '#fff' },
    imageOptions: { margin: 10 }
    // image: '/assets/indiceia-logo-mono.png'
  });
}

function renderQR(type) {
  const container = document.getElementById('qr-preview');
  container.innerHTML = '';
  currentQR = buildQR(QR_SIZES[type]);
  currentQR.append(container);
}

function downloadQR(type) {
  const qr = buildQR(QR_SIZES[type]);
  qr.download({
    name: `indiceia-${type}`,
    extension: 'png'
  });
}

function initQR() {
  renderQR('redes');

  document.getElementById('qrRedes').onclick = () => renderQR('redes');
  document.getElementById('qrA4').onclick = () => renderQR('a4');
  document.getElementById('qrVidriera').onclick = () => renderQR('vidriera');

  document.getElementById('downloadRedes').onclick = () => downloadQR('redes');
  document.getElementById('downloadA4').onclick = () => downloadQR('a4');
  document.getElementById('downloadVidriera').onclick = () => downloadQR('vidriera');
}
