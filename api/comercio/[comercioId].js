// ============================================
// api/comercio/[comercioId].js
// Sirve el JSON público de cada comercio
// ============================================

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
  // Habilitar CORS básico (para llamadas desde el navegador o LLM)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Preflight response
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { comercioId } = req.query;

    if (!comercioId) {
      return res.status(400).json({ error: 'comercioId requerido' });
    }

    console.log('📖 Obteniendo JSON para comercio:', comercioId);

    // Buscar documento del comercio
    const comercioRef = db.collection('comercios').doc(comercioId);
    const comercioSnap = await comercioRef.get();

    if (!comercioSnap.exists) {
      return res.status(404).json({ error: 'Comercio no encontrado' });
    }

    const comercioData = comercioSnap.data();
    const blobUrl = comercioData.blobUrl || comercioData.jsonUrl;

    if (!blobUrl) {
      return res.status(404).json({
        error: 'JSON no generado aún',
        message: 'Ejecuta POST /api/export-json primero para crear el archivo.',
      });
    }

    // Fetch al JSON alojado en Vercel Blob
    const response = await fetch(blobUrl);

    if (!response.ok) {
      throw new Error(`Error al obtener el JSON desde Blob (${response.status})`);
    }

    const jsonData = await response.json();

    // Configurar headers para optimizar rendimiento
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json(jsonData);
  } catch (error) {
    console.error('❌ Error en GET comercio:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    });
  }
}
