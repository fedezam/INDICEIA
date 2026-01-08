#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

// ================= CONFIG =================
const TEMPLATES_DIR = process.env.TEMPLATES_PATH || path.join(process.cwd(), '..');
const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';
const VISUAL_OUTPUT = 'public/templates/registry.visual.json';
const ENTITY_OUTPUT = 'api/entity-factory/templates/registry.entity.json';

// ================= UTILS =================
function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err) {
    console.error(`❌ JSON inválido o no legible: ${p}`);
    throw err;
  }
}

function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ================= MAIN STEPS =================
function loadTemplateDirs() {
  const root = path.join(TEMPLATES_DIR, 'public', 'templates');

  if (!fs.existsSync(root)) {
    throw new Error(`❌ No existe el directorio de templates: ${root}`);
  }

  console.log(`📂 Leyendo templates desde: ${root}`);

  return fs
    .readdirSync(root)
    .filter((d) => fs.statSync(path.join(root, d)).isDirectory())
    .sort(); // orden determinista
}

function buildRegistries(dirs) {
  const ajv = new Ajv({ allErrors: true, strict: false });

  // Cargar schema de metadata
  const schemaPath = path.join(TEMPLATES_DIR, 'schemas', 'template.metadata.schema.json');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`❌ Schema no encontrado: ${schemaPath}`);
  }

  console.log(`📋 Usando schema: ${schemaPath}`);

  const schema = safeReadJSON(schemaPath);
  const validate = ajv.compile(schema);

  const timestamp = new Date().toISOString();

  const visualRegistry = {
    registry_version: '1.0.0',
    last_updated: timestamp,
    templates: []
  };

  const entityRegistry = {
    registry_version: '1.0.0',
    last_updated: timestamp,
    templates: {}
  };

  for (const dir of dirs) {
    const base = path.join(TEMPLATES_DIR, 'public', 'templates', dir);
    const metaPath = path.join(base, 'metadata.json');

    if (!fs.existsSync(metaPath)) {
      console.warn(`⚠️  ${dir}: falta metadata.json → saltando`);
      continue;
    }

    let meta;
    try {
      meta = safeReadJSON(metaPath);
    } catch {
      console.warn(`⚠️  ${dir}: error al leer metadata.json → saltando`);
      continue;
    }

    if (!validate(meta)) {
      console.warn(`⚠️  ${dir}: metadata NO pasa validación`);
      console.warn(validate.errors);
      continue;
    }

    // Determinar ID del template (prioridad: template_id > id > nombre de carpeta)
    const templateId = meta.template_id || meta.id || dir;

    if (!templateId || !/^[A-Z0-9_]+$/.test(templateId)) {
      console.warn(`⚠️  ${dir}: ID inválido o no determinado → saltando`);
      continue;
    }

    console.log(`✓ ${dir} → ${templateId}`);

    // Construir URLs
    const baseUrl = `${TEMPLATES_BASE_URL}/${dir}`;
    const iframeUrl = meta.visual?.preview_html
      ? `${baseUrl}/${meta.visual.preview_html}`
      : null;

    const thumbnailUrl = meta.visual?.thumbnail
      ? `${baseUrl}/${meta.visual.thumbnail}`
      : null;

    // ======== VISUAL REGISTRY (estricto según schema actual) ========
    visualRegistry.templates.push({
      id: templateId,
      name: meta.name,
      version: meta.version,
      tier: meta.tier,
      description: meta.description,
      ideal_for: meta.ideal_for,
      visual: {
        iframe_url: iframeUrl // puede ser null → permitido por el schema
      },
      previews: {
        thumbnail: thumbnailUrl // puede ser null
      }
    });

    // ======== ENTITY REGISTRY ========
    entityRegistry.templates[templateId] = {
      id: templateId,
      version: meta.version,

      paths: {
        runtime_html: `${TEMPLATES_BASE_URL}/${dir}/runtime.html`
      },

      supports: meta.supports ?? {},
      requirements: meta.requirements ?? {}
    };
  }

  // Orden final para visual registry
  visualRegistry.templates.sort((a, b) => a.id.localeCompare(b.id));

  return { visualRegistry, entityRegistry };
}

// ================= RUN =================
function main() {
  try {
    console.log('🔄 Sincronizando templates...\n');

    const dirs = loadTemplateDirs();
    console.log(`📦 Encontrados ${dirs.length} directorios de templates\n`);

    const { visualRegistry, entityRegistry } = buildRegistries(dirs);

    writeJSON(VISUAL_OUTPUT, visualRegistry);
    writeJSON(ENTITY_OUTPUT, entityRegistry);

    console.log('\n✅ Registries generados y validados correctamente');
    console.log(`→ Visual: ${VISUAL_OUTPUT}`);
    console.log(`→ Entity: ${ENTITY_OUTPUT}`);
  } catch (err) {
    console.error('\n💥 Error en sincronización');
    console.error(err);
    process.exitCode = 1;
  }
}

main();
