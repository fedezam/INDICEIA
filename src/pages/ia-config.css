// ========================================
// LANDING PAGE – RUNTIME PUBLICO
// ========================================

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp, increment, updateDoc } from "firebase/firestore";

// ==================== FIREBASE INIT (PUBLIC) ====================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== UTILS ====================
function getLandingId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function safeText(el, text) {
  if (el && typeof text === "string") el.textContent = text;
}

function safeImage(el, url) {
  if (el && url) el.src = url;
}

// ==================== TRACKING ====================
async function trackEvent(landingId, type) {
  try {
    await addDoc(collection(db, "landing_events"), {
      landingId,
      type, // view | click
      userAgent: navigator.userAgent,
      referrer: document.referrer || null,
      createdAt: serverTimestamp()
    });

    const ref = doc(db, "landings", landingId);
    const patch = {
      [`stats.${type === "view" ? "views" : "clicks"}`]: increment(1),
      [`stats.${type === "view" ? "lastViewAt" : "lastClickAt"}`]: serverTimestamp()
    };

    await updateDoc(ref, patch);
  } catch (err) {
    // silencio absoluto (por diseño)
    console.warn("Tracking skipped");
  }
}

// ==================== REDIRECT ====================
function buildClaudeUrl(prompt, entityUrl, modelo) {
  const base = "https://claude.ai/new";
  const payload = `${prompt}\n\n${entityUrl}`;
  return `${base}?model=${encodeURIComponent(modelo)}&prompt=${encodeURIComponent(payload)}`;
}

// ==================== MAIN ====================
async function initLanding() {
  const landingId = getLandingId();

  if (!landingId) {
    document.body.innerHTML = "<h2>Landing no válida</h2>";
    return;
  }

  const ref = doc(db, "landings", landingId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    document.body.innerHTML = "<h2>Contenido no disponible</h2>";
    return;
  }

  const data = snap.data();

  if (data.status !== "active") {
    document.body.innerHTML = "<h2>Esta experiencia no está disponible</h2>";
    return;
  }

  // ==================== RENDER ====================
  safeText(document.getElementById("nombreComercio"), data.public.nombreComercio);
  safeText(document.getElementById("titulo"), data.public.titulo);
  safeText(document.getElementById("descripcion"), data.public.descripcion);
  safeText(document.getElementById("ctaText"), data.public.ctaText);
  safeText(document.getElementById("disclaimer"), data.public.disclaimer || "");

  safeImage(document.getElementById("logo"), data.public.logoUrl);
  safeImage(document.getElementById("hero"), data.public.imagenHero);

  // ==================== TRACK VIEW ====================
  trackEvent(landingId, "view");

  // ==================== CTA ====================
  const btn = document.getElementById("ctaButton");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    await trackEvent(landingId, "click");

    const url = buildClaudeUrl(
      data.cognitive.promptMinimo,
      data.entityUrl,
      data.cognitive.modeloRecomendado || "claude-3.5"
    );

    window.location.href = url;
  });
}

// ==================== BOOT ====================
document.addEventListener("DOMContentLoaded", initLanding);
