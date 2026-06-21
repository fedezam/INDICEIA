// INDICEIA/lib/link-builder/config/prompt-template.js
export function buildPrompt(context = {}, entityUrl = '') {
  const nombre = context.nombre || 'Entidad';
  const ciudad = context.ubicacion?.ciudad || '';

  const header = ciudad ? `${nombre} — ${ciudad}` : nombre;

  return `${header}
Cargá y habitá.
${entityUrl}`.trim();
}
