#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ================= CONFIG =================
const TEMPLATE_REPO = 'fedezam/indiceia-templates';
const TMP_DIR = '.tmp-templates';

const OUTPUT_REGISTRY = path.resolve(
  'api/entity-factory/templates/registry.json'
);

const TEMPLATE_BASE_URL = 'https://indiceia-templates.vercel.app/templates';

// ================= UTILS =================
function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// ================= MAIN =================
function cloneTemplatesRepo() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('❌ GITHUB_TOKEN no definido (CI roto)');
  }

  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }

  console.log('📥 Clonando repo de templates...');
  run(
    `git clone --depth=1 https://${token}@github.com/${TEMPLATE_REPO}.git ${TMP_DIR}`
  );
}

function buildRegistry() {
  const templatesRoot = path.join(
    TMP_DIR,
    'public',
    'templates'
  );

  const registry = {
    registry_version: '1.0.0',
    last_updated: new Date().toISOString(),
    source_repo: TEMPLATE_REPO,
    templates: {}
  };

  const templateDirs = fs.readdirSync(templatesRoot);

  for (const dir of templateDirs) {
    const templatePath = path.join(templatesRoot, dir);
    const metadataPath = path.join(templatePath, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      console.warn(`⚠️  ${dir} sin metadata.json (omitido)`);
      continue;
    }

    const metadata = readJSON(metadataPath);

    registry.templates[metadata.template_id] = {
      id: metadata.template_id,
      name: metadata.name || metadata.template_id,
      version: metadata.version,
      tier: metadata.tier,
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

function cleanup() {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

// ================= RUN =================
function main() {
  cloneTemplatesRepo();
  const registry = buildRegistry();
  writeRegistry(registry);
  cleanup();
}

main();
