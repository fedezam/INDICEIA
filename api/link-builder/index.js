// /api/link-builder/index.js
import { buildPrompt } from './config/prompt-template.js';

export default async function handler(req, res) {
  const { action, comercio_id, format } = req.query;

  if (!action) return res.status(400).json({ error: 'missing_action' });

  // ===============================
  // LOG INTERACTION
  // ===============================
  if (action === 'log_interaction') {
    return res.status(204).end();
  }

  // ===============================
  // GENERATE LINK
  // ===============================
  if (action === 'generate') {
    if (!comercio_id) {
      return res.status(400).json({ error: 'missing_comercio_id' });
    }

    // 🔹 Resolver entity.json
    const entityUrl = await resolveEntityUrl(comercio_id);
    if (!entityUrl) {
      return res.status(404).json({ error: 'entity_not_found' });
    }

    const prompt = buildPrompt(entityUrl);

    const claudeUrl =
      `https://claude.ai/new?prompt=` +
      encodeURIComponent(prompt);

    const publicLandingUrl = `https://indiceia.com/c/${comercio_id}`;

    // JSON MODE (API / bot / debug)
    if (format === 'json') {
      return res.status(200).json({
        comercio_id,
        landing_url: publicLandingUrl,
        claude_url: claudeUrl,
        entity_url: entityUrl,
      });
    }

    // DEFAULT: redirect to landing
    return res.redirect(302, publicLandingUrl);
  }

  return res.status(400).json({ error: 'invalid_action' });
}

// ===============================
// INTERNAL
// ===============================
async function resolveEntityUrl(comercio_id) {
  // acá ya sabés hacerlo: firestore / blob / cache
  // placeholder funcional
  return `https://oigwwzzmvibflie8.public.blob.vercel-storage.com/entidades/${comercio_id}/entity.json`;
}
