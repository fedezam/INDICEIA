// src/shared/createInitialPlan.js
// ⟦ROLE⟧ Wrapper de cliente para crear el plan trial inicial. Reemplaza
// las 4 escrituras manuales duplicadas de `plan: {...}` en camelCase que
// existían en mi-perfil.js, mi-comercio.js, mi-perfil-profesional.js y
// mi-soporte.js.
//
// NO crea un endpoint nuevo (el proyecto está en el límite de funciones
// serverless de Vercel) — reutiliza /api/generate-and-upload-entity, que
// ya se llama desde estos mismos flujos de onboarding, con el flag
// createInitialPlan:true.

export async function createInitialPlan(comercioId) {
  const response = await fetch('/api/generate-and-upload-entity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comercioId, createInitialPlan: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error creando plan inicial:', errorText);
    throw new Error('No se pudo crear el plan inicial');
  }
}
