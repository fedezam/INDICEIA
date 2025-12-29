// src/pages/link-publico.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { showToast } from '../shared/utils.js';

let comercioId = null;

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

function initPage(id) {
  const publicUrl = `https://indiceia.app/c/${id}`;
  document.getElementById('publicUrl').textContent = publicUrl;

  document.getElementById('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(publicUrl);
    showToast('¡Link copiado al portapapeles!', 'success');
  });

  const qrOptions = {
    width: 800,
    height: 800,
    data: publicUrl,
    margin: 20,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { color: "#0070f3", type: "rounded" },
    backgroundOptions: { color: "#ffffff" },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.35, margin: 15 },
    cornersSquareOptions: { type: "extra-rounded", color: "#000000" },
    cornersDotOptions: { type: "dot", color: "#000000" }
  };

  // Agregar logo si existe (subí tu logo a public/logo-indiceia.png)
  qrOptions.image = "/logo-indiceia.png";

  const qrSmall = new QRCodeStyling({ ...qrOptions, width: 400, height: 400 });
  const qrMedium = new QRCodeStyling({ ...qrOptions, width: 800, height: 800 });
  const qrLarge = new QRCodeStyling({ ...qrOptions, width: 1600, height: 1600 });

  qrSmall.append(document.getElementById("qr-small"));
  qrMedium.append(document.getElementById("qr-medium"));
  qrLarge.append(document.getElementById("qr-large"));

  window.downloadQR = (size, ext) => {
    const qr = size === 'small' ? qrSmall : size === 'medium' ? qrMedium : qrLarge;
    qr.download({ name: `qr-indiceia-${comercioId}-${size}`, extension: ext });
  };
}