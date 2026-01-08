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
    const publicUrl = `https://indiceia.app/live/${slug}`;
    document.getElementById('publicUrl').textContent = publicUrl;

    document.getElementById('copyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(publicUrl);
      showToast('¡Link copiado al portapapeles!', 'success');
    });

    // QR: lo dejamos comentado hasta que lo integres
    // const qrOptions = { data: publicUrl, width: 800, height: 800 };
    // const qr = new QRCodeStyling(qrOptions);
    // qr.append(document.getElementById("qr-container"));

  } catch (err) {
    console.error(err);
    showToast('Error al inicializar la página', 'error');
  }
}
