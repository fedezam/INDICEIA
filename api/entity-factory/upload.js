// /api/entity-factory/upload.js

/**
 * Upload Module - Sube entidades y assets a Vercel Blob Storage
 */

import { put } from '@vercel/blob';
import crypto from 'crypto';
import { Logger } from './utils/logger.js';
import { BuildError } from './utils/errors.js';
import { VERCEL_BLOB_TOKEN } from './config/constants.js';

/**
 * 📤 Subir entidad a Vercel Blob
 */
export async function uploadToVercel({ entity, entity_id, build_id }) {
  const uploadStartTime = performance.now();

  try {
    // 1️⃣ Serializar entidad a JSON
    const jsonString = JSON.stringify(entity, null, 2);
    const jsonBuffer = Buffer.from(jsonString, 'utf8');
    const sizeBytes = jsonBuffer.length;

    Logger.info(`[${build_id}] Preparing upload: ${(sizeBytes / 1024).toFixed(2)} KB`);

    // 2️⃣ Calcular hash SHA256
    const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
    const hashWithPrefix = `sha256:${hash}`;
    Logger.debug(`[${build_id}] Hash: ${hashWithPrefix}`);

    // 3️⃣ Subir a Vercel Blob
    const filename = `entities/${entity_id}.json`;
    const blob = await put(filename, jsonBuffer, {
      access: 'public',
      token: VERCEL_BLOB_TOKEN,
      contentType: 'application/json',
      addRandomSuffix: false // Mantener nombre estable
    });

    const uploadTimeMs = Math.round(performance.now() - uploadStartTime);
    Logger.info(`[${build_id}] ✅ Uploaded ${filename} → ${blob.url} (${uploadTimeMs}ms)`);

    // 4️⃣ Actualizar URL dentro de la entidad
    if (!entity.meta) entity.meta = {};
    if (!entity.meta.storage) entity.meta.storage = {};
    entity.meta.storage.vercel_blob_url = blob.url;

    return {
      url: blob.url,
      hash: hashWithPrefix,
      size_bytes: sizeBytes,
      upload_time_ms: uploadTimeMs,
      blob_metadata: {
        pathname: blob.pathname,
        content_type: blob.contentType,
        uploaded_at: blob.uploadedAt
      }
    };

  } catch (error) {
    Logger.error(`[${build_id}] ❌ Upload failed`, error);
    throw new BuildError('UPLOAD_ERROR', 'Failed to upload entity to Vercel Blob', {
      original: error.message,
      entity_id
    });
  }
}

/**
 * 🔍 Verificar si una entidad ya existe
 */
export async function checkIfExists(entity_id) {
  const namespace = process.env.VERCEL_BLOB_NAMESPACE;
  if (!namespace) return false;
  const url = `https://${namespace}.public.blob.vercel-storage.com/entities/${entity_id}.json`;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 🗑️ Eliminar entidad del Blob
 */
export async function deleteFromVercel(entity_id) {
  try {
    const { del } = await import('@vercel/blob');
    const filename = `entities/${entity_id}.json`;

    await del(filename, { token: VERCEL_BLOB_TOKEN });

    Logger.info(`🗑️ Deleted ${filename} from Vercel Blob`);
    return true;
  } catch (error) {
    Logger.error('Error deleting from Blob:', error);
    return false;
  }
}

/**
 * 🖼️ Subir assets estáticos (logos, imágenes, etc)
 */
export async function uploadAsset({ file, comercio_id, asset_type }) {
  try {
    const safeType = asset_type || 'misc';
    const filename = `assets/${comercio_id}/${safeType}/${file.name}`;

    const blob = await put(filename, file, {
      access: 'public',
      token: VERCEL_BLOB_TOKEN,
      contentType: file.type,
      addRandomSuffix: true // Evitar colisiones en assets
    });

    Logger.info(`📎 Asset uploaded: ${blob.url}`);
    return blob.url;
  } catch (error) {
    Logger.error('Error uploading asset:', error);
    throw new BuildError('ASSET_UPLOAD_ERROR', 'Failed to upload asset', { original: error.message });
  }
}

/**
 * 📊 Obtener estadísticas del Blob Storage
 * (placeholder hasta que Vercel exponga su API)
 */
export async function getBlobStats() {
  try {
    return { message: 'Blob stats not implemented yet' };
  } catch (error) {
    Logger.error('Error fetching blob stats:', error);
    return null;
  }
}
