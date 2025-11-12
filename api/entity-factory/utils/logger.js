/**
 * utils/logger.js
 * Sistema unificado de logging para EntityFactory
 */

const isProd = process.env.NODE_ENV === 'production';
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

export class Logger {
  static #format(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    // Colores (solo si no es producción)
    if (!isProd) {
      const colors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m'  // red
      };
      return `${colors[level] || ''}${base}\x1b[0m`;
    }

    return base;
  }

  /**
   * Log genérico
   */
  static log(level, message, context = {}) {
    if (!LOG_LEVELS.includes(level)) level = 'info';
    try {
      const formatted = this.#format(level, message, context);

      if (context && Object.keys(context).length > 0) {
        console[level] ? console[level](formatted, context)
                       : console.log(formatted, context);
      } else {
        console[level] ? console[level](formatted)
                       : console.log(formatted);
      }

      // 🔄 Integración opcional: enviar a servicio remoto (e.g. Firestore, Datadog, Logtail)
      if (process.env.LOG_REMOTE === 'true') {
        this.sendToRemote(level, message, context);
      }

    } catch (err) {
      console.error('⚠️ Logger internal failure:', err.message);
    }
  }

  /**
   * Niveles estándar
   */
  static info(msg, ctx = {})  { this.log('info', msg, ctx); }
  static warn(msg, ctx = {})  { this.log('warn', msg, ctx); }
  static error(msg, ctx = {}) { this.log('error', msg, ctx); }
  static debug(msg, ctx = {}) { 
    if (!isProd || process.env.DEBUG === 'true') {
      this.log('debug', msg, ctx); 
    }
  }

  /**
   * Envía logs a un servicio remoto (opcional)
   * Ejemplo: Firestore, Logtail, Supabase, o tu propio endpoint /logs
   */
  static async sendToRemote(level, message, context = {}) {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context
      };
      
      // En producción podrías usar:
      // await fetch(process.env.LOG_ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
      
      // Por ahora, solo simula envío:
      if (!isProd) console.debug('🛰️ [Simulated Remote Log]', payload);
    } catch (err) {
      console.error('Failed to send remote log:', err.message);
    }
  }
}

export default Logger;
