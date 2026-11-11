// lib/entity-factory/builders/utils.js
// ⟦ROLE⟧ Utilidades puras sin estado, compartidas por mind.builder.js
// y los closers en ./closers/. Extraído de mind.builder.js (19/08/2026)
// como parte del split — sin cambios de lógica.
//
// NOTA 11/11/2026: resolveWaNumber valida el resultado. Antes
// cualquier basura (texto, número corto, número con el "15" de
// celular) terminaba en wa.me/549<basura> y la persona llegaba a un
// chat inexistente después de que la entidad le dijo "te paso la
// consulta". Ahora devuelve un número nacional de 10 dígitos (código
// de área + abonado, sin 0 ni 15) o null; con null el closer cae al
// fallback de canal de contacto en vez de armar un link roto.
// Sin cambios en sanitize.

export function sanitize(input = '') {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w@.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Normaliza un WhatsApp argentino a 10 dígitos (código de área +
 * abonado, sin 0 ni 15 ni prefijo de país). Devuelve null si no se
 * puede dejar en ese formato.
 *
 * Casos que resuelve: "3464447766", "+54 9 346 444-7766",
 * "54 346 4447766", "0346 4447766", "9 346 4447766".
 * Un "15" intercalado ("0346 15 4447766") no se puede separar de
 * forma confiable (el código de área mide 2 a 4 dígitos), así que
 * queda en 12 dígitos y se rechaza.
 */
export function resolveWaNumber(context) {
  const raw =
    context.contacto?.whatsapp ??
    context.channels?.whatsapp?.value ??
    null;

  if (!raw) return null;

  let n = String(raw).replace(/\D/g, '');

  // Prefijo de país 54 (con o sin 9 móvil): solo si sobran dígitos.
  if (n.startsWith('54') && n.length >= 12) n = n.slice(2);

  // Cero de discado nacional.
  n = n.replace(/^0+/, '');

  // 9 móvil que quedó adelante (11 dígitos en total).
  if (n.length === 11 && n.startsWith('9')) n = n.slice(1);

  return /^\d{10}$/.test(n) ? n : null;
}
