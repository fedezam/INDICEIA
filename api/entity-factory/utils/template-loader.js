// /api/entity-factory/utils/template-loader.js
// Loader de templates visuales C — ÍndiceIA v1.0

import fs from 'fs';
import path from 'path';

export async function loadVisualTemplate(templateId) {
  try {
    const basePath = path.join(
      process.cwd(),
      'api',
      'entity-factory',
      'templates',
      templateId
    );

    const metadataPath = path.join(basePath, 'metadata.json');
    const componentPath = path.join(basePath, 'component.jsx');

    if (!fs.existsSync(metadataPath)) return null;
    if (!fs.existsSync(componentPath)) return null;

    return {
      id: templateId,
      metadata: JSON.parse(fs.readFileSync(metadataPath, 'utf8')),
      component: fs.readFileSync(componentPath, 'utf8')
    };
  } catch (e) {
    console.error(`[loadVisualTemplate] Error:`, e);
    return null;
  }
}
