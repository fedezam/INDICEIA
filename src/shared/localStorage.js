// src/shared/localStorage.js

const STORAGE_KEY = 'indiceia_shared_data';

/**
 * Clase para manejar datos compartidos en localStorage
 */
export class LocalData {
  /**
   * Obtiene todos los datos compartidos
   */
  static getSharedData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error leyendo localStorage:', error);
      return {};
    }
  }

  /**
   * Actualiza datos compartidos
   */
  static updateSharedData(updates) {
    try {
      const current = this.getSharedData();
      const updated = { ...current, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
      return current;
    }
  }

  /**
   * Obtiene una clave específica
   */
  static get(key) {
    const data = this.getSharedData();
    return data[key];
  }

  /**
   * Guarda una clave específica
   */
  static set(key, value) {
    return this.updateSharedData({ [key]: value });
  }

  /**
   * Elimina todos los datos
   */
  static clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Verifica si una sección está completada
   */
  static isPageCompleted(pageId) {
    const data = this.getSharedData();
    const completed = data.completedSections || [];
    return completed.includes(pageId);
  }

  /**
   * Marca una página como completada
   */
  static markPageCompleted(pageId) {
    const data = this.getSharedData();
    const completed = data.completedSections || [];
    
    if (!completed.includes(pageId)) {
      completed.push(pageId);
      this.updateSharedData({ 
        completedSections: completed,
        [`${pageId}_completed`]: new Date().toISOString()
      });
    }
  }
}
