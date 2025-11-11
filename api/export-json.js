// api/export-json.js
import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Blob } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'fs/promises';

const app = express();
app.use(express.json({ limit: '10mb' }));

// === Firebase Admin ===
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// === BLOQUE A: UNIVERSAL LER CORE (100% ENGLISH) ===
const BLOQUE_A = { /* ← TU BLOQUE_A EN INGLÉS (ya lo tenés) */ };

// === BLOQUE C: VISUAL MODULE ===
let BLOQUE_C = null;
(async () => {
  try {
    const data = await readFile('./skins/visual_slate_amber_v15.json', 'utf-8');
    BLOQUE_C = JSON.parse(data);
  } catch (err) {
    console.warn('Visual skin not found.');
  }
})();

// === HELPERS ===
function extractWhatsAppNumber(url) {
  return url?.match(/wa\.me\/(\d+)/)?.[1] || '';
}
function extractDaysOpen(hoursString = '') {
  const map = {
    monday: /lunes|lun|monday/i,
    tuesday: /martes|tue|tuesday/i,
    wednesday: /mi[eé]rcoles|wed|wednesday/i,
    thursday: /jueves|thu|thursday/i,
    friday: /viernes|fri|friday/i,
    saturday: /s[aá]bado|sat|saturday/i,
    sunday: /domingo|sun|sunday/i
  };
  return Object.keys(map).filter(day => map[day].test(hoursString));
}
function normalizeCurrency(country) {
  const map = { Argentina: 'ARS', México: 'MXN', Colombia: 'COP', Chile: 'CLP' };
  return map[country] || 'USD';
}
function sanitizeName(name) {
  return (name || 'Bot').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

// === MAIN ENDPOINT ===
app.post('/api/export-json', async (req, res) => {
  const { comercioId, visualEnabled = false } = req.body;
  if (!comercioId) return res.status(400).json({ error: 'comercioId is required' });

  try {
    const comercioDoc = await db.collection('comercios').doc(comercioId).get();
    if (!comercioDoc.exists) return res.status(404).json({ error: 'Commerce not found' });

    const comercio = comercioDoc.data();
    const productosSnap = await db.collection('comercios').doc(comercioId).collection('productos').get();
    const productos = productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const bloqueB = {
      bloque_B_contexto_comercial: {
        mutable: true,
        language: comercio.aiConfig?.aiLanguage || 'es-AR',
        identity: {
          business_id: comercioId,
          business_name: comercio.nombreComercio || 'My Business',
          bot_name: comercio.aiConfig?.aiName || 'Assistant',
          description: comercio.descripcion || '',
          business_type: comercio.tipo || 'retail',
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
          website: comercio.website || ''
        },
        social_media: { instagram: comercio.instagram || '', facebook: comercio.facebook || '', tiktok: comercio.tiktok || '' },
        schedule: { hours: comercio.horariosString || '', days_open: extractDaysOpen(comercio.horariosString || ''), timezone: "America/Argentina/Buenos_Aires" },
        commercial: {
          currency: normalizeCurrency(comercio.pais),
          language: comercio.aiConfig?.aiLanguage || 'es-AR',
          payment_methods: comercio.paymentMethods || [],
          discount_cash: comercio.aiConfig?.descuentoEfectivo || '',
          discount_percentage: 0
        },
        shipping: { free_zones: comercio.envios?.free_zones || [], paid_zones: comercio.envios?.paid_zones || {}, delivery_time: comercio.delivery_time || '30-45 min' },
        catalog: {
          categories: [...new Set(productos.map(p => p.categoria).filter(Boolean))],
          items: productos.filter(p => !p.paused).map(p => ({
            id: p.codigo || p.id,
            name: p.nombre || '',
            description: p.descripcion || '',
            category: p.categoria || '',
            price: p.precio_final || 0,
            price_mediana: p.precio_mediana || null,
            price_grande: p.precio_grande || null,
            currency: normalizeCurrency(comercio.pais),
            stock: p.stock || 0,
            available: !p.paused,
            attributes: p.atributos || {},
            tags: p.etiquetas || [],
            image_url: p.imagen || ''
          })),
          metadata: { total_items: productos.length, last_sync: new Date().toISOString() }
        },
        runtime: {
          state: "ready",
          activation_message: comercio.aiConfig?.aiGreeting || `Hi! I'm ${comercio.aiConfig?.aiName || 'your assistant'}. How can I help?`,
          active_glyph: "origin"
        }
      }
    };

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

    if (visualEnabled && BLOQUE_C) {
      finalJSON.bloque_C_visual_module = BLOQUE_C.bloque_C_visual_module;
    }

    const blob = await Blob.put(`bots/${comercioId}-${uuidv4()}.json`, JSON.stringify(finalJSON, null, 2), {
      access: 'public',
      addRandomSuffix: false
    });

    res.json({
      success: true,
      url: blob.url,
      comercioId,
      visualEnabled,
      items_count: bloqueB.bloque_B_contexto_comercial.catalog.items.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Failed to generate JSON', details: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));

export default app;
