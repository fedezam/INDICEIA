#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ================= PATHS =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// El repo de templates YA está chequeado por GitHub Actions
const TEMPLATES_ROOT = path.resolve(__dirname, '../../public/templates');

// Archivo de salida (dentro del repo indiceia clonado)
const OUTPUT_REGISTRY = path.resolve(
  __dirname,
  '../api/entity-factory/templates/registry.json'
);

const TEMPLATE_BASE_URL = 'https://indiceia-templates.vercel.app/templates';

// ================= UTILS =================
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// ================= MAIN =================
function buildRegistry() {
  if (!fs.existsSync(TEMPLATES_ROOT)) {
    throw new Error('❌ No se encontró public/templates en indiceia-templates');
  }

  const registry = {
    registry_version: '1.0.0',
    last_updated: new Date().toISOString(),
    source_repo: 'fedezam/indiceia-templates',
    templates: {}
  };

  const templateDirs = fs
    .readdirSync(TEMPLATES_ROOT)
    .filter(d =>
      fs.statSync(path.join(TEMPLATES_ROOT, d)).isDirectory()
    );

  for (const dir of templateDirs) {
    const templatePath = path.join(TEMPLATES_ROOT, dir);
    const metadataPath = path.join(templatePath, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      console.warn(`⚠️  ${dir} sin metadata.json (omitido)`);
      continue;
    }

    const metadata = readJSON(metadataPath);

    if (!metadata.template_id) {
      console.warn(`⚠️  ${dir} metadata sin template_id (omitido)`);
      continue;
    }

    registry.templates[metadata.template_id] = {
      id: metadata.template_id,
      name: metadata.name || metadata.template_id,
      version: metadata.version || '1.0.0',
      tier: metadata.tier || null,
      status: metadata.status || 'stable',

      description: metadata.description || '',
      ideal_for: metadata.ideal_for || [],
      supports: metadata.supports || {},
      limitations: metadata.limitations || [],
      requirements: metadata.requirements || {},

      visual: {
        iframe_url: `${TEMPLATE_BASE_URL}/${dir}/component.jsx`
      },

      previews: {
        html: `${TEMPLATE_BASE_URL}/${dir}/previews/${dir}_full.html`,
        component: `${TEMPLATE_BASE_URL}/${dir}/previews/component.preview.jsx`
      },

      links: {
        readme: `${TEMPLATE_BASE_URL}/${dir}/README.md`
      }
    };
  }

  return registry;
}

function writeRegistry(registry) {
  fs.mkdirSync(path.dirname(OUTPUT_REGISTRY), { recursive: true });

  fs.writeFileSync(
    OUTPUT_REGISTRY,
    JSON.stringify(registry, null, 2),
    'utf-8'
  );

  console.log(`✅ Registry generado en ${OUTPUT_REGISTRY}`);
}

// ================= RUN =================
function main() {
  const registry = buildRegistry();
  writeRegistry(registry);
}

main();
