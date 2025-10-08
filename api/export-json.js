// /api/export-json.js - Versión corregida para estructura usuarios/{uid}/comercios
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ Ahora también recibimos userId
    const { comercioId, userId } = req.body;
    
    if (!comercioId) return res.status(400).json({ error: 'comercioId requerido' });
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) return res.status(500).json({ error: 'GitHub token no configurado' });

    // ✅ Pasamos userId a la función
    const jsonData = await generateCommerceJSON(comercioId, userId);
    const gistResult = await uploadToGist(jsonData, comercioId, userId, githubToken);

    return res.status(200).json({ success: true, jsonData, gist: gistResult });
  } catch (error) {
    console.error('Error en export-json API:', error);
    return res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
}

// ✅ Generar JSON con estructura correcta
async function generateCommerceJSON(comercioId, userId) {
  // ✅ Nueva estructura: usuarios/{userId}/comercios/{comercioId}
  const comercioRef = doc(db, `usuarios/${userId}/comercios`, comercioId);
  const comercioSnap = await getDoc(comercioRef);
  
  if (!comercioSnap.exists()) {
    throw new Error("Comercio no encontrado");
  }

  const comercioData = comercioSnap.data();

  // ✅ Productos con nueva estructura
  const productosCol = collection(db, `usuarios/${userId}/comercios`, comercioId, "productos");
  const productosSnap = await getDocs(productosCol);
  const productos = [];
  
  productosSnap.forEach(pSnap => {
    const p = pSnap.data();
    if (!p.paused) {
      productos.push({ id: pSnap.id, ...p });
    }
  });

  // Asistente IA
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

  // ✅ Metadata mejorada
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
      ...comercioData,
      // Datos básicos
      nombre: comercioData.nombreComercio,
      direccion: comercioData.direccion,
      ciudad: comercioData.ciudad,
      provincia: comercioData.provincia,
      pais: comercioData.pais || 'Argentina',
      telefono: comercioData.telefono,
      whatsapp: comercioData.whatsapp,
      email: comercioData.email,
      website: comercioData.website,
      // Redes sociales
      instagram: comercioData.instagram,
      facebook: comercioData.facebook,
      tiktok: comercioData.tiktok,
      // Horarios y métodos
      horarios: comercioData.horarios || [],
      metodos_pago: comercioData.paymentMethods || [],
      categorias: comercioData.categories || []
    },
    productos,
    asistente_ia
  };
}

// ✅ Subir/actualizar Gist con nueva estructura
async function uploadToGist(jsonData, comercioId, userId, githubToken) {
  const fileName = `comercio_${comercioId}.json`;
  const jsonString = JSON.stringify(jsonData, null, 2);
  
  // ✅ Referencia correcta
  const comercioRef = doc(db, `usuarios/${userId}/comercios`, comercioId);
  const comercioSnap = await getDoc(comercioRef);
  const existingGistId = comercioSnap.data()?.gistId;

  const headers = {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  let response, gistId;

  if (existingGistId) {
    // Actualizar Gist existente
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
    await updateDoc(comercioRef, { gistId });
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API Error: ${error.message}`);
  }

  // URL raw del JSON
  const rawUrl = `https://gist.githubusercontent.com/anonymous/${gistId}/raw/${fileName}`;
  
  // Actualizar comercio con URL del JSON
  await updateDoc(comercioRef, { 
    jsonUrl: rawUrl, 
    lastJsonUpdate: new Date().toISOString() 
  });

  return { 
    success: true, 
    gistId, 
    rawUrl, 
    webUrl: `https://gist.github.com/${gistId}` 
  };
}
