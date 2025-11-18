// move-html.js
// ==============================
// Este script mueve los HTML de dist/src/pages a dist/
// y corrige las referencias a scripts generados por Vite
// ==============================
import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');
const pagesDir = path.join(distDir, 'src', 'pages');

// Asegurarse de que la carpeta existe
if (!fs.existsSync(pagesDir)) {
  console.error('No existe la carpeta dist/src/pages');
  process.exit(1);
}

// Obtener todos los HTML en src/pages
const htmlFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  const srcPath = path.join(pagesDir, file);
  const destPath = path.join(distDir, file);

  let content = fs.readFileSync(srcPath, 'utf-8');

  // Regex para reemplazar scripts relativos generados por Vite
  // <script type="module" src="../controllers/..."></script>
  content = content.replace(
    /<script type="module" src=".*?"><\/script>/g,
    match => {
      // Extraemos solo el nombre del archivo JS generado en /assets/
      const jsFile = match.match(/src=".*?([^\/]+\.js)"/)?.[1];
      if (jsFile) return `<script type="module" crossorigin src="/assets/${jsFile}"></script>`;
      return match;
    }
  );

  // Regex para modulepreload
  content = content.replace(
    /<link rel="modulepreload" crossorigin href=".*?">/g,
    match => {
      const jsFile = match.match(/href=".*?([^\/]+\.js)"/)?.[1];
      if (jsFile) return `<link rel="modulepreload" crossorigin href="/assets/${jsFile}">`;
      return match;
    }
  );

  fs.writeFileSync(destPath, content);
  console.log(`✅ Movido y corregido: ${file}`);
});

console.log('✅ Todos los HTML movidos a la raíz de dist y scripts corregidos.');
