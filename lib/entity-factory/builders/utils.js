// lib/entity-factory/builders/utils.js
// ⟦ROLE⟧ Utilidades puras sin estado, compartidas por mind.builder.js
// y los closers en ./closers/. Extraído de mind.builder.js (19/08/2026)
// como parte del split — sin cambios de lógica.

export function sanitize(input = '') {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w@.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function resolveWaNumber(context) {
  const raw =
    context.contacto?.whatsapp ??
    context.channels?.whatsapp?.value ??
    null;

  if (!raw) return null;

  let n = String(raw).replace(/[\s\-\(\)\+]/g, '');

  if (n.startsWith('549')) n = n.slice(3);
  else if (n.startsWith('54')) n = n.slice(2);

  if (n.startsWith('9') && n.length >= 10) n = n.slice(1);

  return n || null;
}
