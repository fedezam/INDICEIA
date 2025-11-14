// api/export-json.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { put } from '@vercel/blob';

// ============================================
// FIREBASE ADMIN INITIALIZATION (SINGLETON) - robust parsing
// ============================================
let db;
if (!getApps().length) {
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env missing');

    // Vercel sometimes escapes newlines; toleramos tanto raw JSON como escaped.
    try { raw = raw.replace(/\\n/g, '\n'); } catch (e) { /* ignore */ }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT JSON parse error:', e);
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }

    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin init failed:', error);
    // Fail fast so Vercel shows a clear error
    throw error;
  }
} else {
  db = getFirestore();
}

// ============================================
// BLOQUE A / C (unchanged, inline definitions)
// ============================================
const BLOQUE_A = {
  bloque_A_nucleo_LER_universal: {
    readonly: true,
    language: "en-US",
    version: "2.0",
    core_principles: {
      rule_1_listen: "Always read the user's input completely before responding",
      rule_2_execute: "Apply the correct logic path based on semantic understanding",
      rule_3_respond: "Generate a clear, contextual, and human-like response"
    },
    system_architecture: {
      type: "LER_dual_path_flexible",
      paths: {
        path_A_specific: "For queries with exact matches in catalog or context",
        path_B_flexible: "For ambiguous, semantic, or complex queries requiring inference"
      }
    },
    anti_hallucination_protocol: {
      rule_1: "Never invent products, prices, or information not in bloque_B",
      rule_2: "If information is missing, offer to connect with a human or check availability",
      rule_3: "Always validate against catalog before responding"
    },
    conversation_flow: {
      greeting: "Use activation_message from bloque_B runtime",
      inquiry: "Understand user intent (search, price, availability, order)",
      resolution: "Provide accurate information or escalate to human",
      closure: "Offer additional help or thank the user"
    },
    semantic_search: {
      enabled: true,
      strategy: "Match user intent with catalog items using semantic similarity",
      fallback: "Suggest similar items or ask for clarification"
    }
  }
};

const BLOQUE_C = {
  bloque_C_visual_module: {
    enabled: true,
    version: "1.5",
    theme: "slate_amber",
    layout: {
      hero_section: {
        enabled: true,
        title: "{business_name}",
        subtitle: "Tu asistente virtual de confianza",
        cta_button: "Comenzar a chatear"
      },
      chat_interface: {
        colors: {
          primary: "#f59e0b",
          secondary: "#475569",
          background: "#f8fafc",
          text: "#1e293b"
        },
        fonts: {
          primary: "Inter, sans-serif",
          secondary: "Roboto, sans-serif"
        }
      }
    }
  }
};

// ============================================
// HELPERS
// ============================================
function extractWhatsAppNumber(url) {
  if (!url) return '';
  const match = url.match(/wa\.me\/(\d+)/);
  return match ? match[1] : '';
}

function extractDaysOpen(hoursString = '') {
  const dayMap = {
    monday: /lunes|lun|monday/i,
    tuesday: /martes|tue|tuesday/i,
    wednesday: /miércoles|mie|wednesday/i,
    thursday: /jueves|jue|thursday/i,
    friday: /viernes|vie|friday/i,
    saturday: /sábado|sab|saturday/i,
    sunday: /domingo|dom|sunday/i
  };

  return Object.keys(dayMap).filter(day => dayMap[day].test(hoursString));
}

function normalizeCurrency(country) {
  const currencyMap = {
    Argentina: 'ARS',
    México: 'MXN',
    Colombia: 'COP',
    Chile: 'CLP',
    España: 'EUR',
    'Estados Unidos': 'USD'
  };
  return currencyMap[country] || 'USD';
}

function sanitizeName(name) {
  if (!name) return 'BOT';
  return String(name).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

function safeString(v, fallback = '') {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

// Trim heavy fields if payload too large (simple strategy)
function trimHeavyFields(finalJSON, maxBytes = 8 * 1024 * 1024) { // 8MB default
  try {
    const jsonString = JSON.stringify(finalJSON);
    const bytes = Buffer.byteLength(jsonString, 'utf8');
    if (bytes <= maxBytes) return { trimmed: false, bytes };

    // Example trimming: remove image_url fields and large metadata
    if (finalJSON.bloque_B_contexto_comercial && finalJSON.bloque_B_contexto_comercial.catalog) {
      finalJSON.bloque_B_contexto_comercial.catalog.items = finalJSON.bloque_B_contexto_comercial.catalog.items.map(it => {
        const copy = { ...it };
        if (copy.image_url) delete copy.image_url;
        if (copy.description && copy.description.length > 1000) copy.description = copy.description.slice(0, 1000) + '...';
        return copy;
      });
      if (finalJSON.bloque_B_contexto_comercial.catalog.metadata) {
        delete finalJSON.bloque_B_contexto_comercial.catalog.metadata.large_blob;
      }
    }

    const newSize = Buffer.byteLength(JSON.stringify(finalJSON), 'utf8');
    return { trimmed: true, bytes: newSize };
  } catch (e) {
    return { trimmed: false, bytes: 0 };
  }
}

// ============================================
// MAIN HANDLER (VERCEL SERVERLESS)
// ============================================
export default async function handler(req, res) {
  // Always respond JSON
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', allowed: ['POST', 'OPTIONS'] });
  }

  const startTime = Date.now();

  try {
    const body = req.body || {};
    const comercioId = body.comercioId || body.commerceId;
    const visualEnabled = body.visualEnabled || false;

    if (!comercioId) {
      return res.status(400).json({ error: 'Bad Request', message: 'comercioId is required' });
    }

    console.log('🔄 Processing export for:', comercioId);

    // Fetch comercio
    const comercioDoc = await db.collection('comercios').doc(comercioId).get();
    if (!comercioDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: `Commerce ${comercioId} not found` });
    }
    const comercio = comercioDoc.data() || {};

    // Load productos (limit to avoid timeouts)
    const productosSnap = await db.collection('comercios').doc(comercioId).collection('productos').limit(5000).get();
    const productos = productosSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));

    console.log(`📦 Loaded ${productos.length} products`);

    // Build BLOQUE B safely (sanitize fields)
    const catalogItems = productos
      .filter(p => !p.paused)
      .map(p => {
        return {
          id: safeString(p.codigo, p.id),
          name: safeString(p.nombre, ''),
          description: safeString(p.descripcion, ''),
          category: safeString(p.categoria, ''),
          price: safeNumber(p.precio_final, safeNumber(p.precio)),
          price_mediana: p.precio_mediana ? safeNumber(p.precio_mediana, null) : null,
          price_grande: p.precio_grande ? safeNumber(p.precio_grande, null) : null,
          currency: normalizeCurrency(comercio.pais),
          stock: safeNumber(p.stock, 0),
          available: !p.paused && (p.stock == null || Number(p.stock) > 0),
          attributes: p.atributos && typeof p.atributos === 'object' ? p.atributos : {},
          tags: Array.isArray(p.etiquetas) ? p.etiquetas.filter(Boolean) : [],
          image_url: safeString(p.imagen, '')
        };
      });

    const categories = Array.from(new Set(catalogItems.map(i => i.category).filter(Boolean)));

    const bloqueB = {
      bloque_B_contexto_comercial: {
        mutable: true,
        language: comercio.aiConfig?.aiLanguage || 'es-AR',
        identity: {
          business_id: comercioId,
          business_name: comercio.nombreComercio || 'My Business',
          bot_name: comercio.aiConfig?.aiName || 'Assistant',
          description: comercio.descripcionNegocio || '',
          business_type: comercio.categoriaNegocio || 'retail',
          semantic_tags: comercio.categories || []
        },
        contact: {
          phone: comercio.telefono || '',
          whatsapp_url: comercio.whatsapp || '',
          whatsapp_number: extractWhatsAppNumber(comercio.whatsapp),
          email: comercio.email || '',
          address: comercio.direccion || '',
          city: comercio.ciudad || '',
          province: comercio.provincia || '',
          country: comercio.pais || 'Argentina',
          neighborhood: comercio.barrio || '',
          website: comercio.sitioWeb || ''
        },
        social_media: {
          instagram: comercio.instagram || '',
          facebook: comercio.facebook || '',
          tiktok: comercio.tiktok || ''
        },
        schedule: {
          hours: comercio.horariosString || '',
          days_open: extractDaysOpen(comercio.horariosString || ''),
          timezone: "America/Argentina/Buenos_Aires"
        },
        commercial: {
          currency: normalizeCurrency(comercio.pais),
          language: comercio.aiConfig?.aiLanguage || 'es-AR',
          payment_methods: comercio.paymentMethods || [],
          discount_cash: comercio.aiConfig?.descuentoEfectivo || '',
          discount_percentage: 0
        },
        shipping: {
          free_zones: comercio.envios?.free_zones || [],
          paid_zones: comercio.envios?.paid_zones || {},
          delivery_time: comercio.delivery_time || '30-45 min'
        },
        catalog: {
          categories,
          items: catalogItems,
          metadata: {
            total_items: productos.length,
            last_sync: new Date().toISOString()
          }
        },
        runtime: {
          state: "ready",
          activation_message: comercio.aiConfig?.aiGreeting ||
            `Hola! Soy ${comercio.aiConfig?.aiName || 'tu asistente'}. ¿En qué puedo ayudarte?`,
          active_glyph: "origin"
        }
      }
    };

    // Final JSON assembly
    const finalJSON = {
      meta: {
        name: `IA-Comercial-LER_${sanitizeName(comercio.nombreComercio)}_v2`,
        version: "2.0.0",
        type: "unified_commercial_instance",
        purpose: "Autonomous NapoBot with semantic flexibility and anti-hallucination",
        architecture: "LER Dual + Flexible Path + Semantic Search + Visual Plug-and-Play",
        created_at: new Date().toISOString().split('T')[0],
        author: "Grok xAI + Fede Zambrano",
        comercio_id: comercioId
      },
      ...BLOQUE_A,
      ...bloqueB
    };

    if (visualEnabled) {
      finalJSON.bloque_C_visual_module = BLOQUE_C.bloque_C_visual_module;
    }

    // Check size and trim if necessary
    const { trimmed, bytes } = trimHeavyFields(finalJSON, 8 * 1024 * 1024);
    if (trimmed) console.warn(`⚠️ JSON trimmed to ${bytes} bytes to fit size limits`);

    // Upload to Vercel Blob with retry
    const filename = `bots/${comercioId}-${Date.now()}.json`;
    let blob;
    const maxAttempts = 3;
    let attempt = 0;
    let lastErr;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        blob = await put(filename, JSON.stringify(finalJSON, null, 2), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json'
        });
        break; // success
      } catch (err) {
        lastErr = err;
        console.warn(`⚠️ put() attempt ${attempt} failed:`, err && err.message ? err.message : err);
        // small backoff
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }

    if (!blob) {
      console.error('❌ Blob upload failed after retries:', lastErr);
      await db.collection('comercios').doc(comercioId).update({
        lastJsonExportError: String(lastErr && lastErr.message ? lastErr.message : lastErr),
        lastJsonExportErrorAt: new Date().toISOString()
      });
      return res.status(500).json({ success: false, error: 'Blob upload failed', message: String(lastErr) });
    }

    // Update Firestore with export metadata and mark origin to prevent loops
    await db.collection('comercios').doc(comercioId).update({
      lastJsonExport: new Date().toISOString(),
      lastJsonExportAt: new Date().toISOString(),
      lastJsonExportBy: 'export-json',
      jsonExportUrl: blob.url
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Export completed in ${duration}ms -> ${blob.url}`);

    return res.status(200).json({
      success: true,
      url: blob.url,
      comercioId,
      visualEnabled,
      items_count: finalJSON.bloque_B_contexto_comercial.catalog.items.length,
      products_total: productos.length,
      generated_at: new Date().toISOString(),
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ Export failed:', error);
    // Persist error info (best-effort)
    try {
      const comercioId = (req.body && req.body.comercioId) || 'unknown';
      if (comercioId && db) {
        await db.collection('comercios').doc(comercioId).update({
          lastJsonExportError: String(error.message || error),
          lastJsonExportErrorAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('⚠️ Could not write error to Firestore:', e);
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: String(error.message || error)
    });
  }
}

// Health / runtime config
export const config = {
  maxDuration: 60, // seconds
  memory: 1024 // MB
};
