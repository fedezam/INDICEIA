// shared/updateCommerceJSON.js
// Función reutilizable para todas las páginas
export async function updateCommerceJSON(comercioId, userId) {
  try {
    console.log('🔄 Regenerando JSON del comercio:', comercioId);
    
    const response = await fetch('/api/export-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comercioId,
        userId
      })
    });
    
    console.log('📥 Response status:', response.status);
    const responseText = await response.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Error parseando JSON:', e);
      throw new Error('La respuesta de la API no es JSON válido: ' + responseText.substring(0, 200));
    }
    
    if (!response.ok) {
      console.error('❌ Error HTTP:', response.status, result);
      throw new Error(result.message || result.error || 'Error actualizando JSON');
    }
    
    console.log('✅ JSON actualizado correctamente');
    console.log('✅ Blob URL:', result.blob?.url);
    console.log('📍 Endpoint GET:', `/api/comercio/${comercioId}`);
    
    return {
      success: true,
      jsonUrl: result.blob?.url, // URL del blob directo
      blobUrl: result.blob?.url,
      getEndpoint: `/api/comercio/${comercioId}`, // Endpoint GET wrapper
      message: 'JSON actualizado'
    };
  } catch (error) {
    console.error('❌ Error actualizando JSON:', error);
    throw error;
  }
}

// Nueva función para obtener el JSON (opcional, para debugging)
export async function getCommerceJSON(comercioId) {
  try {
    const response = await fetch(`/api/comercio/${comercioId}`);
    
    if (!response.ok) {
      throw new Error('Error obteniendo JSON');
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo JSON:', error);
    throw error;
  }
}
