#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

// ================= CONFIG =================
const TEMPLATES_DIR = process.env.TEMPLATES_PATH || path.join(process.cwd(), '..');
const VISUAL_OUTPUT = 'public/templates/registry.visual.json';
const ENTITY_OUTPUT = 'api/entity-factory/templates/registry.entity.json';

// ================= UTILS =================
function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err) {
    console.error(`❌ JSON inválido: ${p}`);
    throw err;
  }
}

function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

// ================= MAIN STEPS =================
function loadTemplateDirs() {
  const root = path.join(TEMPLATES_DIR, 'public', 'templates');
  
  if (!fs.existsSync(root)) {
    throw new Error(`❌ No existe: ${root}`);
  }
  
  console.log(`📂 Leyendo templates desde: ${root}`);
  
  return fs.readdirSync(root)
    .filter(d => fs.statSync(path.join(root, d)).isDirectory())
    .sort(); // determinismo
}

function buildRegistries(dirs) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  
  // Schema desde el repo de templates
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
      console.warn(`⚠️  ${dir}: metadata.json ausente`);
      continue;
    }
    
    let meta;
    try {
      meta = safeReadJSON(metaPath);
    } catch {
      continue;
    }
    
    if (!validate(meta)) {
      console.warn(`⚠️  ${dir}: metadata inválida`);
      console.warn(validate.errors);
      continue;
    }
    
    console.log(`✓ ${dir} (${meta.id})`);
    
    // -------- VISUAL REGISTRY --------
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
        html: meta.previews?.html ?? null
      }
    });
    
    // -------- ENTITY REGISTRY --------
    entityRegistry.templates[meta.id] = {
      id: meta.id,
      version: meta.version,
      entrypoint: `templates/${dir}`,
      supports: meta.supports ?? {},
      requirements: meta.requirements ?? {}
    };
  }
  
  // orden final visual (extra hardening)
  visualRegistry.templates.sort((a, b) => a.id.localeCompare(b.id));
  
  return { visualRegistry, entityRegistry };
}

// ================= RUN =================
function main() {
  try {
    console.log('🔄 Sincronizando templates...\n');
    
    const dirs = loadTemplateDirs();
    console.log(`📦 Encontrados ${dirs.length} templates\n`);
    
    const { visualRegistry, entityRegistry } = buildRegistries(dirs);
    
    writeJSON(VISUAL_OUTPUT, visualRegistry);
    writeJSON(ENTITY_OUTPUT, entityRegistry);
    
    console.log('\n✅ Registries sincronizados');
    console.log(`→ ${VISUAL_OUTPUT}`);
    console.log(`→ ${ENTITY_OUTPUT}`);
  } catch (err) {
    console.error('\n💥 Sync falló');
    console.error(err);
    process.exitCode = 1;
  }
}

main();
