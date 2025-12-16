import { db } from '../firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

const params = new URLSearchParams(window.location.search);
const landingId = params.get('id');

if (!landingId) {
  console.error('Missing landing id');
}

// ========================================
// Cargar landing
// ========================================
const landingRef = doc(db, 'landings', landingId);
const landingSnap = await getDoc(landingRef);

if (!landingSnap.exists()) {
  console.error('Landing not found');
}

const landing = landingSnap.data();
const comercioId = landing.comercioId;

// ========================================
// CTA
// ========================================
const btn = document.getElementById('enter-bot');

btn.addEventListener('click', async () => {
  // 1. Log evento (no bloqueante)
  try {
    await addDoc(collection(db, 'landing_events'), {
      landingId,
      comercioId,
      type: 'cta_click',
      timestamp: serverTimestamp(),
      ua: navigator.userAgent,
      referrer: document.referrer || 'direct'
    });
  } catch (e) {
    // silencioso
  }

  // 2. Redirect REAL
  window.location.href = `/bot/${comercioId}`;
});
