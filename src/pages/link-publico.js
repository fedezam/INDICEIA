import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { showToast } from '../shared/utils.js';

import { getCarteles, buildCartelQR } from '../../lib/cartel/index.js';

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

    renderCarteles();
  } catch (err) {
    console.error(err);
    showToast('Error al cargar la página', 'error');
  }
}

// ==================== CARTELES ====================

function renderCarteles() {
  const container = document.getElementById('carteles');
  container.innerHTML = '';

  const carteles = getCarteles(publicUrl);

  carteles.forEach(cartel => {
    const card = document.createElement('div');
    card.className = 'cartel-card';

    card.innerHTML = `
      <h3>${cartel.titulo}</h3>
      <p>${cartel.descripcion}</p>
      <button>Descargar cartel</button>
    `;

    card.querySelector('button').onclick = () => {
      const qr = buildCartelQR(cartel, publicUrl);
      qr.download({
        name: `indiceia-${cartel.id}`,
        extension: 'png',
      });
    };

    container.appendChild(card);
  });
}

