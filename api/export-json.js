// api/comercio/[comercioId].js - Endpoint GET para servir el JSON
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { comercioId } = req.query;
    
    if (!comercioId) {
      return res.status(400).json({ error: 'comercioId requerido' });
    }

    console.log('📖 Obteniendo JSON para comercio:', comercioId);

    // Obtener la URL del blob desde Firestore
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
        message: 'Ejecuta POST /api/export-json primero'
      });
    }

    // Hacer fetch al blob y devolver el contenido
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      throw new Error('Error obteniendo JSON desde Blob');
    }

    const jsonData = await response.json();

    // Configurar headers para CORS y JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60'); // Cache de 1 minuto

    return res.status(200).json(jsonData);

  } catch (error) {
    console.error('❌ Error en GET comercio:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message 
    });
  }
}
