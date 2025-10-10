// api/generate-gist.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { comercioData } = req.body;

    if (!comercioData) {
      return res.status(400).json({ error: 'No se recibió comercioData' });
    }

    // Token de GitHub desde variable de entorno
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'Token de GitHub no configurado' });
    }

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `Datos del comercio ${comercioData.nombreComercio || 'Sin nombre'}`,
        public: false,
        files: {
          [`comercio_${comercioData.id || Date.now()}.json`]: {
            content: JSON.stringify(comercioData, null, 2)
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    // Devuelve solo la URL segura
    return res.status(200).json({ url: data.html_url });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error creando Gist' });
  }
}
