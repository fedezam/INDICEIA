// /api/export-json.js
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
    const { comercioId } = req.body;
    if (!comercioId) return res.status(400).json({ error: 'comercioId requerido' });

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) return res.status(500).json({ error: 'GitHub token no configurado' });

    const jsonData = await generateCommerceJSON(comercioId);
    const gistResult = await uploadToGist(jsonData, comercioId, githubToken);

    return res.status(200).json({ success: true, jsonData, gist: gistResult });
  } catch (error) {
    console.error('Error en export-json API:', error);
    return res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
}

// Generar JSON por comercio
async function generateCommerceJSON(comercioId) {
  const comercioRef = doc(db, "comercios", comercioId);
  const comercioSnap = await getDoc(comercioRef);
  if (!comercioSnap.exists()) throw new Error("Comercio no encontrado");

  const comercioData = comercioSnap.data();

  // Productos activos
  const productosCol = collection(db, "comercios", comercioId, "productos");
  const productosSnap = await getDocs(productosCol);
  const productos = [];
  productosSnap.forEach(pSnap => {
    const p = pSnap.data();
    if (!p.paused) productos.push({ id: pSnap.id, ...p });
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

  return {
    metadata: {
      version: "1.0",
      generado: new Date().toISOString(),
      comercioId,
      dueñoId: comercioData.dueñoId,
      total_productos: productos.length
    },
    comercio: comercioData,
    productos,
    asistente_ia
  };
}

// Subir/actualizar Gist
async function uploadToGist(jsonData, comercioId, githubToken) {
  const fileName = `comercio_${comercioId}.json`;
  const jsonString = JSON.stringify(jsonData, null, 2);
  const comercioRef = doc(db, "comercios", comercioId);
  const comercioSnap = await getDoc(comercioRef);
  const existingGistId = comercioSnap.data()?.gistId;

  const headers = {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  let response, gistId;

  if (existingGistId) {
    response = await fetch(`https://api.github.com/gists/${existingGistId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ files: { [fileName]: { content: jsonString } } })
    });
    gistId = existingGistId;
  } else {
    response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        description: `Datos comercio - ${jsonData.comercio.nombre}`,
        public: true,
        files: { [fileName]: { content: jsonString } }
      })
    });
    const result = await response.json();
    gistId = result.id;
    await updateDoc(comercioRef, { gistId });
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API Error: ${error.message}`);
  }

  const rawUrl = `https://gist.githubusercontent.com/anonymous/${gistId}/raw/${fileName}`;
  await updateDoc(comercioRef, { jsonUrl: rawUrl, lastJsonUpdate: new Date().toISOString() });

  return { success: true, gistId, rawUrl, webUrl: `https://gist.github.com/${gistId}` };
}
