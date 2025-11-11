// src/shared/exportJSON.js
export async function exportarBot(comercioId, visualEnabled = true, debug = false) {
  try {
    if (!comercioId) throw new Error('comercioId es requerido');

    const response = await fetch('/api/export-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId, visualEnabled })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error al generar el bot');
    }

    if (debug) {
      console.log('✅ Exportación exitosa:', data);
    }

    return data.url;

  } catch (error) {
    console.error('❌ Error en exportarBot:', error.message);
    throw error;
  }
}
