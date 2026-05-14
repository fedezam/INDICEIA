// lib/utils/getHoraActual.js
export function getHoraActual() {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
