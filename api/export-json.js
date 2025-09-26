// /api/export-json.js
// Endpoint API de Vercel para manejar la exportación JSON de forma segura

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

// Configuración de Firebase (usa las mismas credenciales que tu frontend)
const firebaseConfig = {
  // Pon aquí tu configuración de Firebase
  // O mejor aún, también como variables de entorno en Vercel
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicializar Firebase si no está inicializado
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);

export default async function handler(req, res) {
  // Solo permitir POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId requerido' });
    }

    // Token seguro desde variable de entorno
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return res.status(500).json({ error: 'GitHub token no configurado' });
    }

    // Generar JSON desde Firestore
    const jsonData = await generateCommerceJSON(userId);
    
    // Subir a Gist
    const gistResult = await uploadToGist(jsonData, userId, githubToken);
    
    return res.status(200).json({
      success: true,
      jsonData,
      gist: gistResult
    });

  } catch (error) {
    console.error('Error en export-json API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
}

// Función para generar JSON desde Firestore
async function generateCommerceJSON(userId) {
  // 1️⃣ Obtener datos del comercio
  const userDocRef = doc(db, "usuarios", userId);
  const userSnap = await getDoc(userDocRef);
  
  if (!userSnap.exists()) {
    throw new Error("Usuario no encontrado");
  }
  
  const userData = userSnap.data();

  // 2️⃣ Estructura del comercio
  const comercio = {
    nombre: userData.nombreComercio || "",
    descripcion: userData.descripcion || "",
    direccion: userData.direccion || "",
    ciudad: userData.ciudad || "",
    pais: userData.pais || "",
    telefono: userData.telefono || "",
    whatsapp: userData.whatsapp || "",
    email: userData.email || "",
    website: userData.website || "",
    redes_sociales: {
      instagram: userData.instagram || "",
      facebook: userData.facebook || "",
      tiktok: userData.tiktok || ""
    },
    horarios: formatSchedule(userData.horarios || {}),
    medios_pago: userData.paymentMethods || [],
    categorias: userData.categories || [],
    plan: userData.plan || "basic",
    estado: "activo"
  };

  // 3️⃣ Obtener productos desde la colección comercios
  const productosColRef = collection(db, "comercios", userId, "productos");
  const productosSnap = await getDocs(productosColRef);
  
  const productos = [];
  productosSnap.forEach(docSnap => {
    const p = docSnap.data();
    // Solo incluir productos activos (no pausados)
    if (!p.paused) {
      productos.push({
        id: docSnap.id,
        nombre: p.nombre || "",
        codigo: p.codigo || "",
        categoria: p.categoria || "",
        subcategoria: p.subcategoria || "",
        descripcion: p.descripcion || "",
        imagen: p.imagen || "",
        precio: p.precio || 0,
        stock: p.stock ?? null,
        color: p.color || "",
        talle: p.talle || "",
        origen: p.origen || "",
        disponible: true
      });
    }
  });

  // 4️⃣ Configuración del asistente IA
  const asistente_ia = {
    nombre: userData.aiName || userData.aiConfig?.aiName || "Asistente Virtual",
    personalidad: userData.aiConfig?.aiPersonality || "Amigable y cercano",
    tono: userData.aiConfig?.aiTone || "Entusiasta",
    saludo_inicial: userData.aiGreeting || userData.aiConfig?.aiGreeting || "¡Hola! ¿En qué puedo ayudarte?",
    configuracion: {
      precios_pausados: userData.aiConfig?.pricesPaused || false,
      comportamiento_sin_precio: userData.aiConfig?.noPriceBehavior || "contact",
      comportamiento_pausados: userData.aiConfig?.pausedBehavior || "hide"
    },
    fecha_actualizacion: new Date().toISOString()
  };

  // 5️⃣ JSON final
  return {
    metadata: {
      version: "1.0",
      generado: new Date().toISOString(),
      usuario_id: userId,
      total_productos: productos.length
    },
    comercio,
    productos,
    asistente_ia
  };
}

// Formatear horarios para el JSON
function formatSchedule(horarios) {
  const formatted = {};
  const dayNames = {
    lunes: "lunes", martes: "martes", miercoles: "miercoles", 
    jueves: "jueves", viernes: "viernes", sabado: "sabado", domingo: "domingo"
  };

  Object.entries(dayNames).forEach(([key, day]) => {
    const dayData = horarios[key];
    if (!dayData || dayData.closed) {
      formatted[day] = { cerrado: true };
    } else if (dayData.continuous) {
      formatted[day] = {
        cerrado: false,
        continuo: true,
        apertura: dayData.open || "09:00",
        cierre: dayData.close || "18:00"
      };
    } else {
      formatted[day] = {
        cerrado: false,
        continuo: false,
        mañana: {
          apertura: dayData.morning?.open || "08:00",
          cierre: dayData.morning?.close || "12:00"
        },
        tarde: {
          apertura: dayData.afternoon?.open || "16:00",
          cierre: dayData.afternoon?.close || "20:00"
        }
      };
    }
  });

  return formatted;
}

// Subir/actualizar JSON a GitHub Gist
async function uploadToGist(jsonData, userId, githubToken) {
  const fileName = `comercio_${userId}.json`;
  const jsonString = JSON.stringify(jsonData, null, 2);

  // Obtener gistId existente desde Firestore
  const userDoc = await getDoc(doc(db, "usuarios", userId));
  const existingGistId = userDoc.data()?.gistId;

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
          [fileName]: {
            content: jsonString
          }
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
        description: `Datos comercio - ${jsonData.comercio.nombre}`,
        public: true,
        files: {
          [fileName]: {
            content: jsonString
          }
        }
      })
    });
    
    const result = await response.json();
    gistId = result.id;
    
    // Guardar gistId en Firestore
    await updateDoc(doc(db, "usuarios", userId), { gistId });
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API Error: ${error.message}`);
  }

  // URL del archivo raw
  const rawUrl = `https://gist.githubusercontent.com/anonymous/${gistId}/raw/${fileName}`;
  
  // Guardar URL en Firestore
  await updateDoc(doc(db, "usuarios", userId), { 
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
