/**
 * Sync Templates Registry
 * Fuente: indiceia-templates
 * Destino: api/entity-factory/templates/registry.json
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TMP_DIR = './.tmp-templates';
const OUTPUT_PATH = 'api/entity-factory/templates/registry.json';
const TEMPLATES_REPO = 'https://github.com/fedezam/indiceia-templates.git';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function main() {
  // Limpieza
  if (fs.existsSync(TMP_DIR)) {
    run(`rm -rf ${TMP_DIR}`);
  }

  // Clonar repo templates
  run(`git clone --depth=1 ${TEMPLATES_REPO} ${TMP_DIR}`);

  const templatesRoot = path.join(TMP_DIR, 'public/templates');
  const templates = {};

  const dirs = fs.readdirSync(templatesRoot);

  for (const dir of dirs) {
    const base = path.join(templatesRoot, dir);
    const metadataPath = path.join(base, 'metadata.json');

    if (!fs.existsSync(metadataPath)) continue;

    const meta = readJSON(metadataPath);

    templates[meta.template_id] = {
      id: meta.template_id,
      name: meta.template_id.replace(/_/g, ' '),
      version: meta.version,
      tier: meta.tier,
      status: 'stable',

      // 👉 CONSUME ENTITY FACTORY
      visual: {
        mode: 'iframe',
        iframe_url: `https://indiceia-templates.vercel.app/templates/${meta.template_id}/component.jsx`
      },

      // 👉 CONSUME VISUAL BUILDER
      previews: {
        iframe: `https://indiceia-templates.vercel.app/templates/${meta.template_id}/previews/C1_SimpleCatalog_full.html`,
        image: `https://indiceia-templates.vercel.app/templates/${meta.template_id}/previews/preview.png`
      },

      description: meta.ideal_for?.join(', ') || '',
      supports: meta.supports || {},
      checkout: meta.checkout,
      data_source: meta.data_source,
      limitations: meta.limitations || [],
      license: meta.license || null,

      links: {
        readme: `https://github.com/fedezam/indiceia-templates/tree/main/public/templates/${meta.template_id}`
      }
    };
  }

  const registry = {
    registry_version: '1.0.0',
    last_updated: new Date().toISOString().slice(0, 10),
    templates
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));

  console.log('✅ registry.json actualizado');
}

main();
