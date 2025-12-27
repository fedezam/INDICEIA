// src/pages/landing.js
/**
 * LANDING v1 — ÍndiceIA
 * Consume /api/bot/[comercio_id]
 * Renderiza info pública + CTA
 */

document.addEventListener('DOMContentLoaded', initLanding);

async function initLanding() {
  const comercioId = resolveComercioId();

  if (!comercioId) {
    renderError('Link inválido');
    return;
  }

  try {
    const res = await fetch(`/api/bot/${comercioId}`);
    if (!res.ok) throw new Error('Failed to load commerce');

    const data = await res.json();

    if (!data.active) {
      renderError('Este comercio no está disponible');
      return;
    }

    renderLanding(data);
    logLandingView(comercioId);

  } catch (err) {
    console.error('[LANDING ERROR]', err);
    renderError('No se pudo cargar la información');
  }
}

/* ========================================
 * Resolución de comercio_id
 * ====================================== */
function resolveComercioId() {
  // 1. /c/XYZ
  const pathMatch = window.location.pathname.match(/\/c\/([^/]+)/);
  if (pathMatch) return pathMatch[1];

  // 2. ?comercio_id=XYZ
  const params = new URLSearchParams(window.location.search);
  return params.get('comercio_id');
}

/* ========================================
 * Render
 * ====================================== */
function renderLanding(data) {
  // Nombre
  const title = document.querySelector('[data-commerce-name]');
  if (title) title.textContent = data.nombre || 'Comercio';

  // Descripción
  const desc = document.querySelector('[data-commerce-description]');
  if (desc) desc.textContent = data.descripcion || '';

  // Logo
  const logo = document.querySelector('[data-commerce-logo]');
  if (logo && data.logo_url) {
    logo.src = data.logo_url;
    logo.alt = data.nombre || 'Logo comercio';
  }

  // CTA IA
  const iaButton = document.querySelector('[data-cta-ia]');
  if (iaButton) {
    if (data.has_ia) {
      iaButton.style.display = 'inline-flex';
      iaButton.addEventListener('click', () => {
        openIA(comercioIdFromData(data));
      });
    } else {
      iaButton.style.display = 'none';
    }
  }
}

/* ========================================
 * Acciones
 * ====================================== */
function openIA(comercioId) {
  // Punto único de entrada futuro
  // Hoy solo redirige al bot entrypoint
  window.open(`/api/bot/${comercioId}/chat`, '_blank');
}

/* ========================================
 * Telemetría mínima
 * ====================================== */
function logLandingView(comercioId) {
  fetch('/api/link-builder?action=log_interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comercio_id: comercioId,
      interaction_type: 'landing_view',
      referrer: document.referrer || 'direct',
      user_agent: navigator.userAgent,
    }),
  }).catch(() => {});
}

/* ========================================
 * Error
 * ====================================== */
function renderError(message) {
  const root = document.querySelector('[data-landing-root]') || document.body;
  root.innerHTML = `
    <div class="landing-error">
      <h2>Error</h2>
      <p>${message}</p>
    </div>
  `;
}

/* ========================================
 * Helpers
 * ====================================== */
function comercioIdFromData(data) {
  return data.comercio_id || null;
}

