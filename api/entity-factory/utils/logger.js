// /api/entity-factory/utils/logger.js

/**
 * Logger Universal para EntityFactory
 *
 * Soporta:
 * - Console output (siempre)
 * - Webhook notifications (Discord/Slack para errores)
 * - Blob persistence (guardar logs críticos)
 */

import { put } from '@vercel/blob';
import {
  LOG_LEVEL,
  WEBHOOK_URL,
  VERCEL_BLOB_TOKEN,
  VERCEL_BLOB_NAMESPACE
} from '../config/constants.js';

export const Logger = {
  levels: { debug: 1, info: 2, warn: 3, error: 4 },

  /**
   * Log principal
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // 1️⃣ CONSOLE
    this.logToConsole(level, formatted, meta);

    // 2️⃣ WEBHOOK (errores / warnings)
    if (WEBHOOK_URL && (level === 'error' || level === 'warn')) {
      this.sendToWebhook(level, message, meta).catch(err => {
        console.error('[Logger] Webhook failed:', err.message);
      });
    }

    // 3️⃣ BLOB (solo errores críticos)
    if (VERCEL_BLOB_TOKEN && level === 'error') {
      this.saveToBlob(level, message, meta).catch(err => {
        console.error('[Logger] Blob save failed:', err.message);
      });
    }
  },

  // Shortcuts
  debug(msg, meta) { this.log('debug', msg, meta); },
  info(msg, meta) { this.log('info', msg, meta); },
  warn(msg, meta) { this.log('warn', msg, meta); },
  error(msg, meta) { this.log('error', msg, meta); },

  /**
   * Verificar si debe loguear según nivel configurado
   */
  shouldLog(level) {
    const current = this.levels[LOG_LEVEL] ?? this.levels.info;
    const incoming = this.levels[level] ?? this.levels.info;
    return incoming >= current;
  },

  /**
   * Log a consola con color según nivel
   */
  logToConsole(level, formatted, meta) {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    };
    const reset = '\x1b[0m';
    const msg = `${colors[level] || ''}${formatted}${reset}`;
    const fn = level === 'debug' ? 'log' : level;
    Object.keys(meta).length ? console[fn](msg, meta) : console[fn](msg);
  },

  /**
   * Enviar notificación a webhook (Discord/Slack)
   */
  async sendToWebhook(level, message, meta) {
    const emoji = { warn: '⚠️', error: '🚨' }[level] || '📢';
    const color = { warn: 16776960, error: 16711680 }[level] || 3447003;

    const payload = {
      embeds: [{
        title: `${emoji} EntityFactory ${level.toUpperCase()}`,
        description: message,
        color,
        fields: Object.keys(meta).length > 0 ? [{
          name: 'Details',
          value: `\`\`\`json\n${JSON.stringify(meta, null, 2).slice(0, 1000)}\n\`\`\``
        }] : [],
        timestamp: new Date().toISOString(),
        footer: { text: 'ÍndiceIA EntityFactory' }
      }]
    };

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Webhook responded with ${res.status}`);
    }
  },

  /**
   * Guardar log crítico en Blob Storage
   */
  async saveToBlob(level, message, meta) {
    const entry = {
      level,
      message,
      meta,
      timestamp: new Date().toISOString(),
      build_id: meta?.build_id || 'unknown'
    };

    const filename = `${VERCEL_BLOB_NAMESPACE}/logs/errors/${Date.now()}-${level}.json`;
    const content = JSON.stringify(entry, null, 2);

    await put(filename, content, {
      access: 'public',
      token: VERCEL_BLOB_TOKEN,
      contentType: 'application/json'
    });

    console.log(`[Logger] Error log saved: ${filename}`);
  },

  /**
   * Guardar log completo de un build (debug)
   */
  async saveBuildLog(build_id, logs) {
    try {
      const filename = `${VERCEL_BLOB_NAMESPACE}/logs/builds/${build_id}.json`;
      const content = JSON.stringify({
        build_id,
        logs,
        generated_at: new Date().toISOString()
      }, null, 2);

      await put(filename, content, {
        access: 'public',
        token: VERCEL_BLOB_TOKEN,
        contentType: 'application/json'
      });

      this.info(`Build log saved: ${filename}`);
      return filename;
    } catch (err) {
      this.error('Failed to save build log', { build_id, error: err.message });
      return null;
    }
  }
};

/**
 * EJEMPLO DE USO:
 * 
 * Logger.info('Build started', { build_id: 'builder-xxx' });
 * Logger.warn('Missing image', { item_id: 'P07' });
 * Logger.error('Upload failed', { build_id: 'builder-xxx', error: 'Network timeout' });
 * await Logger.saveBuildLog('builder-xxx', allLogs);
 */

export default Logger;
