// fix-pages-domready.js
// Ejecutar: node fix-pages-domready.js
const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

fs.readdirSync(pagesDir)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Evitar duplicar el wrap si ya existe
    if (content.includes('DOMContentLoaded')) {
      console.log(`${file} ya envuelto, se saltea.`);
      return;
    }

    // Agregar import de navigation si no existe
    if (!content.includes('initNavigation')) {
      content = `import { initNavigation, updateProgress } from '../shared/navigation.js';\n` + content;
    }

    // Envolver todo en DOMContentLoaded
    const wrapped = `
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  try {
${content.split('\n').map(line => '    ' + line).join('\n')}
  } catch (err) {
    console.error('Error en ${file}:', err);
  }
});
`;
    fs.writeFileSync(filePath, wrapped, 'utf8');
    console.log(`${file} envuelto en DOMContentLoaded y listo.`);
  });
