import fs from "fs";
import path from "path";

const pageName = process.argv[2];

if (!pageName) {
  console.error("❌ Usar: node generate.js <nombre-pagina>");
  process.exit(1);
}

const baseDir = process.cwd();
const pageDir = path.join(baseDir, "src/pages", pageName);
const templatePath = path.join(__dirname, "template.html");

if (fs.existsSync(pageDir)) {
  console.error("❌ La página ya existe:", pageName);
  process.exit(1);
}

fs.mkdirSync(pageDir, { recursive: true });

// HTML
let html = fs.readFileSync(templatePath, "utf-8");
html = html
  .replaceAll("{{PAGE_NAME}}", pageName)
  .replaceAll("{{PAGE_TITLE}}", capitalize(pageName))
  .replaceAll(
    "{{PAGE_DESCRIPTION}}",
    `Página ${capitalize(pageName)} de ÍndiceIA`
  );

fs.writeFileSync(path.join(pageDir, "index.html"), html);

// JS
fs.writeFileSync(
  path.join(pageDir, `${pageName}.js`),
  `import { initializePage } from "/src/skeleton/lifecycle/initializePage.js";

initializePage({
  page: "${pageName}"
});
`
);

// CSS
fs.writeFileSync(
  path.join(pageDir, `${pageName}.css`),
  `/* ${pageName} styles */`
);

console.log("✅ Página creada:", pageName);

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
