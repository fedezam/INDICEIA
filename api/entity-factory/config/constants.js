// /api/entity-factory/config/constants.js

/**
 * 🌐 Configuración Global del EntityFactory
 * 
 * Centraliza todos los endpoints, límites y claves necesarias
 * para construir entidades LER desde fuentes remotas.
 */

import dotenv from 'dotenv';
dotenv.config(); // Garantiza carga desde .env en entornos locales

/** 🧱 Recursos base (Skeleton + Templates) */
export const SKELETON_URL =
  process.env.SKELETON_URL ||
  'https://raw.githubusercontent.com/tu-usuario/repo/main/api/skeleton_v3.0.1.json';

export const TEMPLATES_REGISTRY_URL =
  process.env.TEMPLATES_REGISTRY_URL ||
  'https://raw.githubusercontent.com/tu-usuario/repo/main/api/templates/registry.json';

/** 🪣 Vercel Blob (para persistencia de builds y logs) */
export const VERCEL_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || null;
export const VERCEL_BLOB_NAMESPACE =
  process.env.VERCEL_BLOB_NAMESPACE || 'indiceia';

/** 🔥 Firebase Config (para fetch de catálogos y metadatos) */
export const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

/** ⚙️ Límites operativos (protege rendimiento y abuse) */
export const BUILD_LIMITS = {
  MAX_CATALOG_ITEMS: 1000,
  MAX_CATEGORIES: 50,
  MAX_JSON_SIZE_MB: 5,
  BUILD_TIMEOUT_MS: 30000, // 30s
  RATE_LIMIT_PER_MINUTE: 5,
};

/** 🧠 Cache TTLs (para optimizar requests frecuentes) */
export const CACHE_TTL = {
  SKELETON_MS: 3600000, // 1 hora
  TEMPLATES_MS: 3600000, // 1 hora
  FIREBASE_DATA_MS: 300000, // 5 minutos
};

/** 🪵 Logging & Monitoreo */
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // 'debug' | 'info' | 'warn' | 'error'
export const WEBHOOK_URL = process.env.WEBHOOK_URL || null; // Webhook opcional (Discord, Slack, etc.)

/**
 * 🧩 Ejemplo de archivo `.env`
 * 
 * SKELETON_URL=https://raw.githubusercontent.com/tu-usuario/repo/main/api/skeleton_v3.0.1.json
 * TEMPLATES_REGISTRY_URL=https://raw.githubusercontent.com/tu-usuario/repo/main/api/templates/registry.json
 * 
 * BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
 * VERCEL_BLOB_NAMESPACE=indiceia
 * 
 * FIREBASE_API_KEY=AIzaSy...
 * FIREBASE_AUTH_DOMAIN=indiceia.firebaseapp.com
 * FIREBASE_PROJECT_ID=indiceia-prod
 * FIREBASE_STORAGE_BUCKET=indiceia.appspot.com
 * FIREBASE_MESSAGING_SENDER_ID=1234567890
 * FIREBASE_APP_ID=1:1234567890:web:abcdef123456
 * 
 * LOG_LEVEL=info
 * WEBHOOK_URL=https://discord.com/api/webhooks/xxxx/yyyy
 */
