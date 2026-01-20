// src/pages/link-publico.js

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { showToast } from '../shared/utils.js';
import { getCarteles, buildCartelQR } from '../../lib/cartel/index.js';

// ==================== CONSTANTE ÚNICA ====================
// Dominio público / humano (landing)
const PUBLIC_BASE_URL = 'https://indiceia-public.vercel.app';

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

    // ✅ LINK PÚBLICO CORRECTO (landing humana)
    publicUrl = `${PUBLIC_BASE_URL}/landing/${slug}`;

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
      <button class="download-btn">Descargar cartel</button>
    `;

    const btn = card.querySelector('.download-btn');

    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Generando...';

      try {
        const qrObject = await buildCartelQR(cartel, publicUrl);

        qrObject.download({
          name: `indiceia-${cartel.id}`,
          extension: 'png',
        });

        showToast('Cartel descargado', 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al generar cartel', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Descargar cartel';
      }
    };

    container.appendChild(card);
  });
}
