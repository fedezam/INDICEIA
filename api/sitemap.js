// api/sitemap.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  }
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection('entidades').get();

    // 1. Inicializamos el array directamente con la Home del dominio principal
    const urls = [{ loc: 'https://indiceia.dev/', lastmod: null }];

    // 2. Iteramos las entidades y las agregamos con el dominio canónico (subdominio ia.)
    snapshot.forEach(doc => {
      const data     = doc.data();
      const slug     = data.landing?.slug;
      const activo   = data.landing?.activo;
      const tieneSeo = !!data.seoHtmlUrl;

      if (slug && activo && tieneSeo) {
        const lastmod = data.seoGeneratedAt
          ? new Date(data.seoGeneratedAt).toISOString().split('T')[0]
          : null;

        urls.push({
          loc: `https://ia.indiceia.dev/p/${slug.trim()}`,
          lastmod,
        });
      }
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
}
