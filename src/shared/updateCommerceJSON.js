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
    console.log('✅ JSON URL:', result.gist?.rawUrl);
    
    return {
      success: true,
      jsonUrl: result.gist?.rawUrl,
      gistId: result.gist?.gistId,
      message: 'JSON actualizado'
    };

  } catch (error) {
    console.error('❌ Error actualizando JSON:', error);
    throw error;
  }
}
