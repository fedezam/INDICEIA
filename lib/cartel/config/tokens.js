/**
 * TOKENS DE MARCA — IndiceIA Brand Book
 * Fuente única para color y tipografía en las piezas gráficas del cartel.
 */

export const COLOR = {
  linen: '#F5F2EC',
  linenShadow: '#E8E3D7', // tono de viñeta, derivado de linen (no un color nuevo)
  obsidian: '#1A1814',
  moss: '#6B6458',
  sapphire: '#1A6BB5',
  white: '#FFFFFF',
};

export const FONT = {
  display: 'Space Grotesk',
  body: 'Inter',
};

// Mismo gap angular que usa qr.factory.js para el corte del isotipo.
// Duplicado a propósito: no se importa de qr.factory para no tocar ese módulo.
export const RING_GAP_START = -75;
export const RING_GAP_END = -15;

let fontsLoaded = false;

/**
 * Carga Space Grotesk e Inter desde Google Fonts antes de dibujar en canvas.
 * Sin esto, ctx.font cae en fallback del sistema silenciosamente.
 */
export async function ensureBrandFonts() {
  if (fontsLoaded || typeof document === 'undefined') return;

  const existingLink = document.getElementById('indiceia-brand-fonts');
  if (!existingLink) {
    const link = document.createElement('link');
    link.id = 'indiceia-brand-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }

  // document.fonts.load fuerza la descarga/parsing de cada peso puntual
  // que usamos en el canvas — el <link> solo no garantiza que estén listas.
  await Promise.all([
    document.fonts.load('700 32px "Space Grotesk"'),
    document.fonts.load('400 14px "Inter"'),
    document.fonts.load('500 16px "Inter"'),
    document.fonts.load('600 12px "Inter"'),
  ]);

  fontsLoaded = true;
}

/**
 * Dibuja una viñeta radial muy sutil sobre el fondo ya pintado.
 * No es efecto decorativo suelto: dirige el ojo hacia el centro (QR).
 */
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

/**
 * Dibuja el anillo de marca alrededor del QR, con corte angular
 * que rima con el gap del isotipo de ÍndiceIA (círculo + punto).
 */
export function drawSignatureRing(ctx, cx, cy, radius, strokeWidth, color) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const gapStart = toRad(RING_GAP_START);
  const gapEnd = toRad(RING_GAP_END);

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, radius, gapEnd, gapStart + Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, strokeWidth * 0.9, 0, Math.PI * 2);
  ctx.fill();
}
