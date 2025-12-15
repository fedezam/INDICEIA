import { db } from '../firebase.js';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// ==================== UTIL ====================
function getLandingIdFromURL() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] || null;
}

function getReferrerType() {
  if (document.referrer.includes('qr')) return 'qr';
  if (document.referrer) return 'link';
  return 'unknown';
}

// ==================== ANALYTICS ====================
async function trackEvent(landing, type) {
  try {
    await addDoc(collection(db, 'landing_events'), {
      landingId: landing.landingId,
      comercioId: landing.comercioId,
      type,
      ref: getReferrerType(),
      ua: navigator.userAgent,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    // silencioso: analytics nunca debe romper la UX
    console.warn('Analytics error', err);
  }
}

// ==================== MAIN ====================
async function initLanding() {
  const landingId = getLandingIdFromURL();

  if (!landingId) {
    document.body.innerHTML = '<h2>Landing no válida</h2>';
    return;
  }

  const ref = doc(db, 'landings', landingId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    document.body.innerHTML = '<h2>Landing no encontrada</h2>';
    return;
  }

  const landing = { landingId, ...snap.data() };

  if (!landing.active) {
    document.body.innerHTML = '<h2>Este asistente no está activo</h2>';
    return;
  }

  // Render
  document.getElementById('nombreComercio').textContent = landing.nombreComercio;
  document.getElementById('descripcion').textContent = landing.descripcion || '';
  
  if (landing.logoUrl) {
    const logo = document.getElementById('logo');
    logo.src = landing.logoUrl;
    logo.style.display = 'block';
  }

  // Analytics: view
  trackEvent(landing, 'view');

  // CTA
  const btn = document.getElementById('ctaBtn');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    await trackEvent(landing, 'cta_click');
    window.location.href = landing.linkFinal;
  });
}

// ==================== START ====================
initLanding();
