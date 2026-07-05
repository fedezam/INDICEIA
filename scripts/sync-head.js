// scripts/sync-head.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PARTIAL_PATH = path.join(ROOT, 'src/components/head-partial.html');
const PAGES_DIR    = path.join(ROOT, 'src/pages');

const START = '<!-- HEAD_PARTIAL:START -->';
const END   = '<!-- HEAD_PARTIAL:END -->';

const partial = fs.readFileSync(PARTIAL_PATH, 'utf-8').trim();
const block = `${START}\n${partial}\n${END}`;

function findHtmlFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const files = findHtmlFiles(PAGES_DIR);
let updated = 0, inserted = 0, skipped = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf-8');

  if (html.includes(START) && html.includes(END)) {
    const regex = new RegExp(`${START}[\\s\\S]*?${END}`);
    const newHtml = html.replace(regex, block);
    if (newHtml !== html) {
      fs.writeFileSync(file, newHtml, 'utf-8');
      updated++;
    } else {
      skipped++;
    }
  } else if (html.includes('</title>')) {
    // Insertamos el bloque justo después de </title>
    const newHtml = html.replace('</title>', `</title>\n\n  ${block.split('\n').join('\n  ')}`);
    fs.writeFileSync(file, newHtml, 'utf-8');
    inserted++;
  } else {
    console.warn(`⚠️  ${path.relative(ROOT, file)} no tiene </title>, revisar a mano`);
  }
}

console.log(`\n✅ Sync completo: ${inserted} insertados, ${updated} actualizados, ${skipped} sin cambios (${files.length} total)`);
