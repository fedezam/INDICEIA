// /api/entity-factory/utils/template-loader.js
// Visual Template Loader — passive, safe, renderer-oriented

import fs from 'fs/promises';
import path from 'path';

const TEMPLATES_BASE_PATH = path.resolve(
  process.cwd(),
  'api/entity-factory/templates'
);

/**
 * Load a visual template by name.
 * This function NEVER transforms data.
 * It only retrieves static visual configuration.
 *
 * @param {string} templateName
 * @returns {object|null}
 */
export async function loadVisualTemplate(templateName) {
  if (!templateName || typeof templateName !== 'string') {
    return null;
  }

  try {
    const safeName = sanitizeTemplateName(templateName);
    const templatePath = path.join(
      TEMPLATES_BASE_PATH,
      `${safeName}.json`
    );

    const raw = await fs.readFile(templatePath, 'utf-8');
    const parsed = JSON.parse(raw);

    return {
      name: safeName,
      type: 'visual_template',
      version: parsed.version ?? '1.0.0',
      layout: parsed.layout ?? {},
      styles: parsed.styles ?? {},
      slots: parsed.slots ?? {},
      meta: parsed.meta ?? {}
    };
  } catch (error) {
    // Silent fail by design (template is optional)
    return null;
  }
}

/**
 * Prevent path traversal or invalid names
 */
function sanitizeTemplateName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 50);
}
