// /api/resolve-cta/[slug].js
import { db } from '../../firebase.js';
import { doc, getDoc } from 'firebase/firestore';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    res.status(400).send('Missing slug');
    return;
  }

  try {
    // 1️⃣ Buscar slug en la colección landings
    const landingRef = doc(db, 'landings', slug);
    const landingSnap = await getDoc(landingRef);

    if (!landingSnap.exists()) {
      res.status(404).send('Landing no encontrada');
      return;
    }

    const landing = landingSnap.data();

    // 2️⃣ Buscar datos del comercio
    const comercioRef = doc(db, 'comercios', landing.comercioId);
    const comercioSnap = await getDoc(comercioRef);

    if (!comercioSnap.exists()) {
      res.status(404).send('Comercio no encontrado');
      return;
    }

    const comercio = comercioSnap.data();

    // 3️⃣ Renderizar HTML de la landing
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${landing.nombre}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #f7f7f7;
      color: #111;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 50px auto;
      padding: 32px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(0,0,0,.1);
    }
    h1 { margin-top: 0; }
    .categories, .payment-methods {
      margin-top: 16px;
    }
    .category, .method {
      display: inline-block;
      padding: 6px 12px;
      margin: 4px;
      background: #eee;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${landing.nombre}</h1>
    <p>${comercio.descripcion || ''}</p>

    ${comercio.categories?.length ? `
    <div class="categories">
      <strong>Categorías:</strong>
      ${comercio.categories.map(c => `<span class="category">${c}</span>`).join(' ')}
    </div>` : ''}

    ${comercio.paymentMethods?.length ? `
    <div class="payment-methods">
      <strong>Métodos de pago:</strong>
      ${comercio.paymentMethods.map(m => `<span class="method">${m}</span>`).join(' ')}
    </div>` : ''}
    
    <p><small>¡Tu IA comercial está lista para ayudarte!</small></p>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error generando landing');
  }
}
