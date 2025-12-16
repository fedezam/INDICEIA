// /api/bot/[comercio_id].js
/**
 * BOT ENTRYPOINT — ÍndiceIA v1.0
 * Punto único de entrada para QR, landing y links.
 */

export default async function handler(req, res) {
  const { comercio_id } = req.query;

  if (!comercio_id) {
    return res.status(400).send('Missing comercio_id');
  }

  try {
    const baseUrl = process.env.BASE_URL;

    // ========================================
    // 1. Log de entrada (fire-and-forget)
    // ========================================
    fetch(`${baseUrl}/api/link-builder?action=log_interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comercio_id,
        interaction_type: 'bot_entry',
        user_agent: req.headers['user-agent'],
        referrer: req.headers['referer'] || 'direct',
      }),
    }).catch(() => {});

    // ========================================
    // 2. Resolver link final
    // ========================================
    const linkResponse = await fetch(
      `${baseUrl}/api/link-builder?action=generate&comercio_id=${comercio_id}`
    );

    if (!linkResponse.ok) {
      throw new Error('Link builder failed');
    }

    // link-builder redirige por defecto,
    // pero por seguridad pedimos JSON
    const jsonResponse = await fetch(
      `${baseUrl}/api/link-builder?action=generate&comercio_id=${comercio_id}&format=json`
    );

    const data = await jsonResponse.json();

    if (!data?.claude_url) {
      throw new Error('Invalid link-builder response');
    }

    // ========================================
    // 3. Redirect final
    // ========================================
    return res.redirect(302, data.claude_url);

  } catch (err) {
    console.error('[BOT ENTRY ERROR]', err.message);

    // ========================================
    // 4. Fallback seguro
    // ========================================
    return res.redirect(
      302,
      'https://claude.ai'
    );
  }
}
