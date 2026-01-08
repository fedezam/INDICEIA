// src/pages/live/[slug].js
export const config = {
  runtime: 'edge' // o 'nodejs' según Vercel, pero edge funciona para rutas dinámicas
};

export default async function handler(req) {
  try {
    const { searchParams, pathname } = new URL(req.url);
    // Extraemos el slug de la URL
    const slug = pathname.split('/').pop();

    if (!slug) {
      return new Response('Slug no proporcionado', { status: 400 });
    }

    // 🔹 Traemos el comercioId desde Firestore usando el slug
    // Importamos admin de forma dinámica para edge
    const { getFirestore, collection, getDocs, query, where } = await import('firebase-admin/firestore');
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');

    if (!getApps().length) {
      if (!process.env.FIREBASE_ADMIN) {
        throw new Error('FIREBASE_ADMIN env is missing');
      }
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN))
      });
    }

    const db = getFirestore();
    const comerciosRef = collection(db, 'comercios');
    const q = query(comerciosRef, where('slug', '==', slug));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      return new Response('Comercio no encontrado', { status: 404 });
    }

    const comercioDoc = querySnap.docs[0];
    const comercioId = comercioDoc.id;

    // 🔹 Llamamos a tu API interna para generar la landing HTML
    const apiUrl = `${req.url.origin}/api/link-builder?comercio_id=${comercioId}`;
    const apiRes = await fetch(apiUrl);
    const html = await apiRes.text();

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      }
    });
  } catch (err) {
    console.error('[LIVE SLUG]', err);
    return new Response('Error interno', { status: 500 });
  }
}
