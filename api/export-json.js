// api/export-json.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// FIREBASE ADMIN INITIALIZATION (SINGLETON)
// ============================================
let db;
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin init failed:', error);
    throw error;
  }
} else {
  db = getFirestore();
}

// ============================================
// BLOQUE A: UNIVERSAL LER CORE
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

// ============================================
// BLOQUE C: VISUAL MODULE (INLINE)
// ============================================
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
// HELPER FUNCTIONS
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
  return name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

// ============================================
// MAIN HANDLER (VERCEL SERVERLESS FORMAT)
// ============================================
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['POST', 'OPTIONS'] 
    });
  }

  const startTime = Date.now();

  try {
    const { comercioId, visualEnabled = false } = req.body;

    // Validación
    if (!comercioId) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'comercioId is required' 
      });
    }

    console.log('🔄 Processing export for:', comercioId);

    // Obtener datos del comercio
    const comercioDoc = await db.collection('comercios').doc(comercioId).get();
    
    if (!comercioDoc.exists) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: `Commerce ${comercioId} not found` 
      });
    }

    const comercio = comercioDoc.data();

    // Obtener productos (con límite para evitar timeout)
    const productosSnap = await db
      .collection('comercios')
      .doc(comercioId)
      .collection('productos')
      .limit(5000)
      .get();

    const productos = productosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📦 Loaded ${productos.length} products`);

    // Construir BLOQUE B
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
          categories: [...new Set(productos.map(p => p.categoria).filter(Boolean))],
          items: productos
            .filter(p => !p.paused)
            .map(p => ({
              id: p.codigo || p.id,
              name: p.nombre || '',
              description: p.descripcion || '',
              category: p.categoria || '',
              price: Number(p.precio_final || 0),
              price_mediana: p.precio_mediana ? Number(p.precio_mediana) : null,
              price_grande: p.precio_grande ? Number(p.precio_grande) : null,
              currency: normalizeCurrency(comercio.pais),
              stock: Number(p.stock || 0),
              available: !p.paused && (p.stock == null || p.stock > 0),
              attributes: p.atributos || {},
              tags: p.etiquetas || [],
              image_url: p.imagen || ''
            })),
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

    // Construir JSON final
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

    // Agregar módulo visual si está habilitado
    if (visualEnabled) {
      finalJSON.bloque_C_visual_module = BLOQUE_C.bloque_C_visual_module;
    }

    // Subir a Vercel Blob
    const filename = `bots/${comercioId}-${Date.now()}.json`;
    const blob = await put(filename, JSON.stringify(finalJSON, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });

    // Actualizar referencia en Firestore
    await db.collection('comercios').doc(comercioId).update({
      lastJsonExport: new Date().toISOString(),
      jsonExportUrl: blob.url
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Export completed in ${duration}ms`);

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      url: blob.url,
      comercioId,
      visualEnabled,
      items_count: bloqueB.bloque_B_contexto_comercial.catalog.items.length,
      products_total: productos.length,
      generated_at: new Date().toISOString(),
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ Export failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Health check endpoint (opcional)
export const config = {
  maxDuration: 60, // 60 segundos máximo
  memory: 1024 // 1GB de memoria
};
