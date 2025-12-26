#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Ajv from 'ajv';

// ================= CONFIG =================
const TEMPLATE_REPO = 'fedezam/indiceia-templates';
const TMP_DIR = '.tmp-templates';

const VISUAL_OUTPUT = 'public/templates/registry.visual.json';
const ENTITY_OUTPUT = 'api/entity-factory/templates/registry.entity.json';

const TEMPLATE_BASE_URL = 'https://indiceia-templates.vercel.app/templates';

// ================= UTILS =================
function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

// ================= MAIN =================
function cloneRepo() {
  const token = process.env.TEMPLATE_REPO_TOKEN;
  if (!token) {
    throw new Error('❌ TEMPLATE_REPO_TOKEN no definido en el entorno');
  }

  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }

  console.log('📥 Clonando repo de templates con HTTPS + Token...');
  run(`git clone --depth=1 https://${token}@github.com/${TEMPLATE_REPO}.git ${TMP_DIR}`);
}

function loadTemplates() {
  const root = path.join(TMP_DIR, 'public', 'templates');

  if (!fs.existsSync(root)) {
    throw new Error('❌ No existe public/templates en el repo de templates');
  }

  return fs.readdirSync(root).filter(dir =>
    fs.statSync(path.join(root, dir)).isDirectory()
  );
}

function buildRegistries(dirs) {
  // Cargar schema DESPUÉS de clonar
  const ajv = new Ajv({ allErrors: true, strict: false });
  const metadataSchema = readJSON(
    path.join(TMP_DIR, 'schemas', 'template.metadata.schema.json')
  );
  const validateMetadata = ajv.compile(metadataSchema);

  const visualRegistry = {
    registry_version: '1.0.0',
    last_updated: new Date().toISOString(),
    templates: []
  };

  const entityRegistry = {
    registry_version: '1.0.0',
    last_updated: visualRegistry.last_updated,
    templates: {}
  };

  for (const dir of dirs) {
    const base = path.join(TMP_DIR, 'public', 'templates', dir);
    const metaPath = path.join(base, 'metadata.json');

    if (!fs.existsSync(metaPath)) {
      console.warn(`⚠️ ${dir} sin metadata.json (omitido)`);
      continue;
    }

    const meta = readJSON(metaPath);

    if (!validateMetadata(meta)) {
      console.error(`❌ Metadata inválida en ${dir}`);
      console.error(validateMetadata.errors);
      continue; // Omitir template inválido
    }

    // ================= VISUAL =================
    visualRegistry.templates.push({
      id: meta.id,
      name: meta.name,
      version: meta.version,
      tier: meta.tier,
      description: meta.description,
      ideal_for: meta.ideal_for,
      visual: {
        iframe_url: meta.visual.iframe_url
      },
      previews: {
        html: meta.previews?.html || null
      }
    });

    // ================= ENTITY =================
    entityRegistry.templates[meta.id] = {
      id: meta.id,
      version: meta.version,
      entrypoint: `templates/${dir}`,
      supports: meta.supports,
      requirements: meta.requirements
    };
  }

  return { visualRegistry, entityRegistry };
}

function cleanup() {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

// ================= RUN =================
function main() {
  cloneRepo();
  const dirs = loadTemplates();
  const { visualRegistry, entityRegistry } = buildRegistries(dirs);

  writeJSON(VISUAL_OUTPUT, visualRegistry);
  writeJSON(ENTITY_OUTPUT, entityRegistry);

  cleanup();

  console.log('✅ Registries generados correctamente');
  console.log(`→ ${VISUAL_OUTPUT}`);
  console.log(`→ ${ENTITY_OUTPUT}`);
}

main();
