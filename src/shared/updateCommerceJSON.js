// shared/updateCommerceJSON.js
// Función reutilizable para todas las páginas
// shared/updateCommerceJSON.js
// Función reutilizable para todas las páginas usando solo Vercel Blob

export async function updateCommerceJSON(comercioId, userId) {
  try {
    console.log('🔄 Regenerando JSON del comercio:', comercioId);
    
    const response = await fetch('/api/export-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId, userId })
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error('La respuesta de la API no es JSON válido: ' + text.slice(0, 200));
    }

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Error actualizando JSON');
    }

    const jsonUrl = result.blob?.url;
    if (!jsonUrl) throw new Error('No se recibió URL de Blob en la respuesta');

    console.log('✅ JSON actualizado correctamente');
    console.log('🔗 Blob URL:', jsonUrl);
    console.log('📍 Endpoint GET:', `/api/comercio/${comercioId}`);

    return {
      success: true,
      jsonUrl,          // URL del blob directo
      blobUrl: jsonUrl, // alias para claridad
      getEndpoint: `/api/comercio/${comercioId}`,
      message: 'JSON actualizado'
    };

  } catch (err) {
    console.error('❌ Error actualizando JSON:', err);
    throw err;
  }
}

// Función opcional para obtener el JSON desde el endpoint GET
export async function getCommerceJSON(comercioId) {
  try {
    const response = await fetch(`/api/comercio/${comercioId}`);
    if (!response.ok) throw new Error('Error obteniendo JSON');
    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo JSON:', error);
    throw error;
  }
}
