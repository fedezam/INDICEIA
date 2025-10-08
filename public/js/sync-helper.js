// public/js/sync-helper.js
// Función compartida para sincronizar con el JSON final

/**
 * Sincroniza los cambios con el JSON final en GitHub Gist
 * @param {string} comercioId - ID del comercio
 * @param {string} userId - ID del usuario propietario
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export async function syncComercioToJSON(comercioId, userId) {
  if (!comercioId || !userId) {
    console.warn('⚠️ Sync cancelado: falta comercioId o userId');
    return null;
  }

  try {
    console.log('🔄 Iniciando sincronización con JSON...');
    
    const response = await fetch('/api/export-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comercioId,
        userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Sync failed: ${response.status} - ${errorData.message || errorData.error}`);
    }

    const result = await response.json();
    console.log('✅ JSON sincronizado:', result.gist?.rawUrl);
    
    return result;
  } catch (error) {
    console.error('❌ Error en sincronización:', error.message);
    // No lanzamos el error para que no rompa el flujo
    return null;
  }
}

/**
 * Debounce para evitar múltiples llamadas seguidas
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function}
 */
export function debounce(func, wait = 2000) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Wrapper para auto-save + sync
 * Uso: en cada página que necesite auto-sync
 */
export class AutoSyncManager {
  constructor(comercioId, userId, saveFunction) {
    this.comercioId = comercioId;
    this.userId = userId;
    this.saveFunction = saveFunction;
    this.hasUnsavedChanges = false;
    this.saveTimeout = null;
    
    // Debounced sync
    this.debouncedSync = debounce(() => {
      this.performSync();
    }, 2000);
  }

  // Marcar cambios pendientes
  markChanged() {
    this.hasUnsavedChanges = true;
    this.debouncedSync();
  }

  // Realizar guardado + sync
  async performSync() {
    if (!this.hasUnsavedChanges) return;

    try {
      // 1. Guardar en Firestore
      await this.saveFunction();
      
      // 2. Sincronizar JSON (no bloqueante)
      syncComercioToJSON(this.comercioId, this.userId).catch(err => {
        console.warn('Sync no crítico falló:', err);
      });

      this.hasUnsavedChanges = false;
    } catch (error) {
      console.error('Error en auto-sync:', error);
    }
  }

  // Forzar sync inmediato (útil para botones "Guardar")
  async forceSyncNow() {
    await this.performSync();
  }
}
