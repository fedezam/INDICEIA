// api/export-json.js - Vercel Serverless Function con Vercel Blob
import admin from 'firebase-admin';
import { put } from '@vercel/blob';

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { comercioId, userId } = req.body;
    
    if (!comercioId) return res.status(400).json({ error: 'comercioId requerido' });
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    console.log('📦 Generando JSON para comercio:', comercioId);

    // Generar el JSON desde Firebase
    const jsonData = await generateCommerceJSON(comercioId, userId);
    
    // Subir a Vercel Blob
    const blobResult = await uploadToVercelBlob(jsonData, comercioId);

    console.log('✅ JSON actualizado en Vercel Blob:', blobResult.url);

    return res.status(200).json({ 
      success: true, 
      message: 'JSON actualizado correctamente',
      jsonData, 
      blob: blobResult 
    });
  } catch (error) {
    console.error('❌ Error en export-json API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message 
    });
  }
}

async function generateCommerceJSON(comercioId, userId) {
  const comercioRef = db.collection('comercios').doc(comercioId);
  const comercioSnap = await comercioRef.get();
  
  if (!comercioSnap.exists) {
    throw new Error("Comercio no encontrado");
  }

  const comercioData = comercioSnap.data();

  // Obtener productos (subcolección)
  const productosCol = comercioRef.collection('productos');
  const productosSnap = await productosCol.get();
  const productos = [];
  
  productosSnap.forEach(pSnap => {
    const p = pSnap.data();
    // Solo incluir productos activos (no pausados)
    if (!p.paused) {
      productos.push({ 
        id: pSnap.id, 
        ...p 
      });
    }
  });

  const asistente_ia = {
    nombre: comercioData.aiName || "Asistente Virtual",
    personalidad: comercioData.aiConfig?.aiPersonality || "Amigable y cercano",
    tono: comercioData.aiConfig?.aiTone || "Entusiasta",
    saludo_inicial: comercioData.aiGreeting || comercioData.aiConfig?.aiGreeting || "¡Hola! ¿En qué puedo ayudarte?",
    configuracion: {
      precios_pausados: comercioData.aiConfig?.pricesPaused || false,
      comportamiento_sin_precio: comercioData.aiConfig?.noPriceBehavior || "contact",
      comportamiento_pausados: comercioData.aiConfig?.pausedBehavior || "hide"
    },
    fecha_actualizacion: new Date().toISOString()
  };

  return {
    metadata: {
      version: "1.0",
      generado: new Date().toISOString(),
      comercioId,
      userId,
      dueñoId: comercioData.dueñoId,
      total_productos: productos.length,
      plan: comercioData.plan || 'trial'
    },
    comercio: {
      nombre: comercioData.nombreComercio || '',
      descripcion: comercioData.descripcion || '',
      direccion: comercioData.direccion || '',
      ciudad: comercioData.ciudad || '',
      provincia: comercioData.provincia || '',
      pais: comercioData.pais || 'Argentina',
      barrio: comercioData.barrio || '',
      telefono: comercioData.telefono || '',
      whatsapp: comercioData.whatsapp || '',
      email: comercioData.email || '',
      website: comercioData.website || '',
      instagram: comercioData.instagram || '',
      facebook: comercioData.facebook || '',
      tiktok: comercioData.tiktok || '',
      horarios: comercioData.horarios || [],
      metodos_pago: comercioData.paymentMethods || [],
      categorias: comercioData.categories || [],
      plan: comercioData.plan || 'trial'
    },
    productos,
    asistente_ia
  };
}

async function uploadToVercelBlob(jsonData, comercioId) {
  const fileName = `comercio-${comercioId}.json`;
  const jsonString = JSON.stringify(jsonData, null, 2);
  
  // Subir a Vercel Blob con acceso público
  const blob = await put(fileName, jsonString, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false // Mantener el mismo nombre de archivo
  });

  const comercioRef = db.collection('comercios').doc(comercioId);
  
  // Guardar URL del blob en Firestore
  await comercioRef.update({ 
    jsonUrl: blob.url,
    blobUrl: blob.url,
    lastJsonUpdate: new Date().toISOString() 
  });

  return { 
    success: true, 
    url: blob.url,
    downloadUrl: blob.downloadUrl
  };
}
