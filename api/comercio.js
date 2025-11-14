// /api/comercio.js
/**
 * 🏪 COMERCIO API - Microservicio Optimizado
 * 
 * ENDPOINT:
 * GET /api/comercio?comercioId=XXX
 * 
 * Mejoras:
 * - Cache en memoria para blobs recientes
 * - Rate-limit por IP
 * - Logging mejorado con tiempos de respuesta
 */

import { list } from '@vercel/blob';
import LRU from 'lru-cache';

// ================================
// CONFIGURACIÓN
// ================================
const CACHE_MAX_ITEMS = 500;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutos
const RATE_LIMIT_MAX = 20; // requests
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto

// ================================
// CACHE EN MEMORIA
// ================================
const cache = new LRU({
  max: CACHE_MAX_ITEMS,
  ttl: CACHE_TTL_MS
});

// ================================
// RATE-LIMIT SIMPLE POR IP
// ================================
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - record.start > RATE_LIMIT_WINDOW_MS) {
    // reset ventana
    record.count = 1;
    record.start = now;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);
  return record.count <= RATE_LIMIT_MAX;
}

// ================================
// HANDLER
// ================================
export default async function handler(req, res) {
  const startTime = Date.now();
  const { comercioId } = req.query;
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      ip
    });
  }

  if (!comercioId) {
    return res.status(400).json({ 
      success: false,
      error: 'comercioId is required' 
    });
  }

  try {
    // ================================
    // Revisar cache primero
    // ================================
    const cacheKey = comercioId;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      console.log(`⚡ [CACHE HIT] comercioId=${comercioId} | ip=${ip} | time=${Date.now()-startTime}ms`);
      return res.status(200).json({ ...cached, cached: true });
    }

    // ================================
    // Listar blobs de Vercel
    // ================================
    const { blobs } = await list({ prefix: `bots/${comercioId}-` });

    if (!blobs || blobs.length === 0) {
      console.warn(`❌ [NOT FOUND] comercioId=${comercioId} | ip=${ip}`);
      return res.status(404).json({ 
        success: false,
        error: 'Bot not found',
        comercioId 
      });
    }

    // ================================
    // Ordenar y seleccionar el más reciente
    // ================================
    const sorted = blobs.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    const latest = sorted[0];

    // ================================
    // Fetch JSON del blob
    // ================================
    const response = await fetch(latest.url);
    if (!response.ok) {
      throw new Error(`Blob fetch failed with status ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Blob content is not valid JSON');
    }

    // ================================
    // Preparar resultado
    // ================================
    const result = {
      success: true,
      comercioId,
      blob_url: latest.url,
      uploaded_at: latest.uploadedAt,
      size: latest.size,
      data
    };

    // ================================
    // Guardar en cache
    // ================================
    cache.set(cacheKey, result);

    console.log(`✅ [FETCH OK] comercioId=${comercioId} | ip=${ip} | time=${Date.now()-startTime}ms`);

    return res.status(200).json(result);

  } catch (error) {
    console.error(`❌ [ERROR] comercioId=${comercioId} | ip=${ip} | ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bot',
      details: error.message,
      comercioId
    });
  }
}
