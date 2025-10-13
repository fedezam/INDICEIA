// api/export-json.js - Vercel Serverless Function
import admin from 'firebase-admin';

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

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) return res.status(500).json({ error: 'GitHub token no configurado' });

    console.log('📦 Generando JSON para comercio:', comercioId);

    const jsonData = await generateCommerceJSON(comercioId, userId);
    const gistResult = await uploadToGist(jsonData, comercioId, githubToken);

    console.log('✅ JSON actualizado:', gistResult.rawUrl);

    return res.status(200).json({ 
      success: true, 
      message: 'JSON actualizado correctamente',
      jsonData, 
      gist: gistResult 
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

async function uploadToGist(jsonData, comercioId, githubToken) {
  const fileName = `comercio_${comercioId}.json`;
  const jsonString = JSON.stringify(jsonData, null, 2);
  
  const comercioRef = db.collection('comercios').doc(comercioId);
  const comercioSnap = await comercioRef.get();
  const existingGistId = comercioSnap.data()?.gistId;

  const headers = {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  let response, gistId;

  if (existingGistId) {
    // Actualizar Gist existente
    console.log('📝 Actualizando Gist existente:', existingGistId);
    response = await fetch(`https://api.github.com/gists/${existingGistId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ 
        files: { 
          [fileName]: { content: jsonString } 
        } 
      })
    });
    gistId = existingGistId;
  } else {
    // Crear nuevo Gist
    console.log('🆕 Creando nuevo Gist');
    response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        description: `Datos comercio - ${jsonData.comercio.nombre || 'Sin nombre'}`,
        public: true,
        files: { 
          [fileName]: { content: jsonString } 
        }
      })
    });
    
    const result = await response.json();
    gistId = result.id;
    
    // Guardar gistId en Firestore
    await comercioRef.update({ gistId });
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API Error: ${error.message}`);
  }

  const gistData = await response.json();
  const rawUrl = gistData.files[fileName].raw_url;
  
  // Actualizar URL y timestamp en Firestore
  await comercioRef.update({ 
    jsonUrl: rawUrl, 
    lastJsonUpdate: new Date().toISOString() 
  });

  return { 
    success: true, 
    gistId, 
    rawUrl, 
    webUrl: gistData.html_url
  };
}
