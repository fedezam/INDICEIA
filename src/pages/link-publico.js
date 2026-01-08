// src/pages/link-publico.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Toast simple
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.background = type === 'success' ? '#4caf50' : '#f44336';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

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
}
