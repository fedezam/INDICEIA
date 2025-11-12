/**
 * utils/errors.js
 * Definición de errores personalizados y manejo robusto de fallos.
 */

import { Logger } from './logger.js';

/**
 * Clase base para todos los errores de build
 */
export class BuildError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'BuildError';
    this.code = code;
    this.details = details;
    this.phase = details.phase || 'unknown';
    this.timestamp = new Date().toISOString();

    // Auto-log seguro
    try {
      Logger.error(`[${code}] ${message}`, {
        ...details,
        phase: this.phase,
        stack: this.stack
      });
    } catch (err) {
      console.error('⚠️ Logger failure in BuildError:', err.message);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      phase: this.phase,
      timestamp: this.timestamp
    };
  }
}

/** Error de Fetch (Firebase, URLs externas) */
export class FetchError extends BuildError {
  constructor(resource, status, details = {}) {
    super(
      'FETCH_ERROR',
      `Failed to fetch ${resource} (status: ${status})`,
      { ...details, resource, status, phase: 'fetch' }
    );
    this.name = 'FetchError';
  }
}

/** Error de Validación */
export class ValidationError extends BuildError {
  constructor(field, message, details = {}) {
    super(
      'VALIDATION_ERROR',
      message || `Validation failed for field: ${field}`,
      { ...details, field, phase: 'validation' }
    );
    this.name = 'ValidationError';
  }
}

/** Error de Template */
export class TemplateError extends BuildError {
  constructor(templateId, reason, details = {}) {
    super(
      'TEMPLATE_ERROR',
      `Template ${templateId} failed: ${reason}`,
      { ...details, templateId, reason, phase: 'template' }
    );
    this.name = 'TemplateError';
  }
}

/** Error de Upload */
export class UploadError extends BuildError {
  constructor(destination, reason, details = {}) {
    super(
      'UPLOAD_ERROR',
      `Upload to ${destination} failed: ${reason}`,
      { ...details, destination, reason, phase: 'upload' }
    );
    this.name = 'UploadError';
  }
}

/** Error de Skeleton */
export class SkeletonError extends BuildError {
  constructor(reason, details = {}) {
    super(
      'SKELETON_ERROR',
      `Skeleton loading failed: ${reason}`,
      { ...details, reason, phase: 'skeleton' }
    );
    this.name = 'SkeletonError';
  }
}

/** Error de Timeout */
export class TimeoutError extends BuildError {
  constructor(operation, timeoutMs, details = {}) {
    super(
      'TIMEOUT_ERROR',
      `Operation ${operation} exceeded timeout of ${timeoutMs}ms`,
      { ...details, operation, timeoutMs, phase: 'timeout' }
    );
    this.name = 'TimeoutError';
  }
}

/** Error de Rate Limit */
export class RateLimitError extends BuildError {
  constructor(entity_id, limit, details = {}) {
    super(
      'RATE_LIMIT_ERROR',
      `Rate limit exceeded for ${entity_id}. Max ${limit} builds/minute.`,
      { ...details, entity_id, limit, phase: 'rate_limit' }
    );
    this.name = 'RateLimitError';
  }
}

/** Error de Manifest */
export class ManifestError extends BuildError {
  constructor(operation, reason, details = {}) {
    super(
      'MANIFEST_ERROR',
      `Manifest ${operation} failed: ${reason}`,
      { ...details, operation, reason, phase: 'manifest' }
    );
    this.name = 'ManifestError';
  }
}

/** Error de Entidad no encontrada */
export class EntityNotFoundError extends BuildError {
  constructor(entity_id, details = {}) {
    super(
      'ENTITY_NOT_FOUND',
      `Entity ${entity_id} not found in Firebase`,
      { ...details, entity_id, phase: 'fetch' }
    );
    this.name = 'EntityNotFoundError';
  }
}

/**
 * Envolver errores desconocidos
 */
export function wrapError(error, phase = 'unknown') {
  if (error instanceof BuildError) return error;

  const message = error?.message || 'An unknown error occurred';
  const details = {
    phase,
    original_name: error?.name || 'UnknownError',
    stack: error?.stack || null
  };

  return new BuildError('UNKNOWN_ERROR', message, details);
}

/**
 * Retry con backoff exponencial
 */
export async function retryWithBackoff(fn, maxAttempts = 3, initialDelayMs = 1000) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const wrapped = wrapError(error, 'retry');

      if (attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        Logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
          attempt,
          maxAttempts,
          message: wrapped.message
        });
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  throw wrapError(lastError, 'retry_exhausted');
}

/**
 * Exportación unificada
 */
export default {
  BuildError,
  FetchError,
  ValidationError,
  TemplateError,
  UploadError,
  SkeletonError,
  TimeoutError,
  RateLimitError,
  ManifestError,
  EntityNotFoundError,
  wrapError,
  retryWithBackoff
};
