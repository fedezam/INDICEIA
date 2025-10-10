// /api/uploadGist.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { filename, content, description = 'Export JSON desde INDICEIA', publicGist = false } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Faltan parámetros: filename o content' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'Token de GitHub no configurado' });
    }

    const body = {
      description,
      public: publicGist,
      files: {
        [filename]: {
          content: JSON.stringify(content, null, 2)
        }
      }
    };

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Error creando Gist' });
    }

    return res.status(200).json({ url: data.html_url });

  } catch (err) {
    console.error('Error en uploadGist:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
