/**
 * GET /api/search?q=veterinaria+urgente&ciudad=casilda
 * Orquestador HTTP mínimo.
 */

import { resolveQuery } from '../../../lib/search/router.semantics.js';
import { loadCityIndex } from '../../../lib/search/index.loader.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const ciudad = searchParams.get('ciudad');
  const provincia = searchParams.get('provincia');
  const refresh = searchParams.get('refresh') === 'true';

  if (!q || !ciudad) {
    return new Response(JSON.stringify({ error: '"q" y "ciudad" son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const index = await loadCityIndex(ciudad, { provincia, forceRefresh: refresh });
    if (!index?.length) {
      return new Response(JSON.stringify({ error: `Índice no encontrado: ${ciudad}`, results: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await resolveQuery(q, index, { maxResults: 5 });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    });
  } catch (e) {
    console.error('[search] Error:', e);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}