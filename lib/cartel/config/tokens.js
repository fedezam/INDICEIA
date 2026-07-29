/**
 * TOKENS DE MARCA — IndiceIA Brand Book
 * Fuente única para color y tipografía en las piezas gráficas del cartel.
 *
 * Fuentes self-hosted (woff2 en assets/fonts/) via FontFace API.
 * Sin dependencia de Google Fonts CDN.
 */

// ── Rutas a los archivos woff2 locales ─────────────────────
const FONT_FILES = {
  spaceGrotesk700: new URL('../assets/fonts/space-grotesk-700.woff2', import.meta.url).href,
  inter400:        new URL('../assets/fonts/inter-400.woff2',          import.meta.url).href,
  inter500:        new URL('../assets/fonts/inter-500.woff2',          import.meta.url).href,
  inter600:        new URL('../assets/fonts/inter-600.woff2',          import.meta.url).href,
};

// ── Colores ─────────────────────────────────────────────────
export const COLOR = {
  linen:        '#F5F2EC',
  linenShadow:  '#E8E3D7',
  obsidian:     '#1A1814',
  moss:         '#6B6458',
  sapphire:     '#1A6BB5',
  white:        '#FFFFFF',
};

// ── Tipografía ──────────────────────────────────────────────
export const FONT = {
  display: 'Space Grotesk',
  body:    'Inter',
};

// ── Ring angles ─────────────────────────────────────────────
export const RING_GAP_START = -75;
export const RING_GAP_END   = -15;

// ── Carga de fuentes ────────────────────────────────────────
let fontsLoaded = false;

/**
 * Carga Space Grotesk 700 e Inter 400/500/600 desde woff2 locales
 * usando la FontFace API directa. No hay <link>, no hay race condition.
 */
export async function ensureBrandFonts() {
  if (fontsLoaded || typeof document === 'undefined') return;

  const faces = [
    new FontFace('Space Grotesk', `url(${FONT_FILES.spaceGrotesk700})`, { weight: '700' }),
    new FontFace('Inter',         `url(${FONT_FILES.inter400})`,         { weight: '400' }),
    new FontFace('Inter',         `url(${FONT_FILES.inter500})`,         { weight: '500' }),
    new FontFace('Inter',         `url(${FONT_FILES.inter600})`,         { weight: '600' }),
  ];

  const loaded = await Promise.all(faces.map(f => f.load()));
  loaded.forEach(face => document.fonts.add(face));

  fontsLoaded = true;
}

// ── Dibujo: viñeta radial ───────────────────────────────────
export function drawVignette(ctx, width, height, colorLinen, colorShadow) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.75;

  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
  gradient.addColorStop(0, colorLinen);
  gradient.addColorStop(1, colorShadow);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// ── Dibujo: anillo de firma ─────────────────────────────────
export function drawSignatureRing(ctx, cx, cy, radius, strokeWidth, color) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const gapStart = toRad(RING_GAP_START);
  const gapEnd   = toRad(RING_GAP_END);

  ctx.strokeStyle = color;
  ctx.lineWidth   = strokeWidth;
  ctx.lineCap     = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, radius, gapEnd, gapStart + Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, strokeWidth * 0.9, 0, Math.PI * 2);
  ctx.fill();
}
