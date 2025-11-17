// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.', // Carpeta raíz del proyecto (donde está package.json y index.html)
  publicDir: 'public', // Carpeta para assets estáticos que se copian tal cual
  build: {
    outDir: 'dist', // Carpeta de salida
    emptyOutDir: true, // Limpiar la carpeta antes de construir
    rollupOptions: {
      input: {
        // Define explícitamente cada archivo HTML como entrada
        // La clave es el nombre del archivo de salida en dist/ (sin extensión)
        // El valor es la ruta absoluta desde __dirname
        main: resolve(__dirname, 'index.html'),
        usuario: resolve(__dirname, 'src/pages/usuario.html'),
        miComercio: resolve(__dirname, 'src/pages/mi-comercio.html'),
        horarios: resolve(__dirname, 'src/pages/horarios.html'),
        productos: resolve(__dirname, 'src/pages/productos.html'),
        iaConfig: resolve(__dirname, 'src/pages/ia-config.html'),
        dashboard: resolve(__dirname, 'src/pages/dashboard.html'),
        // Agrega aquí otros HTMLs si los tienes
      },
      output: {
        // Opcional: Define cómo se nombran los archivos JS/CSS/Assets
        entryFileNames: 'assets/js/[name].[hash].js',
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // Asegura que los archivos HTML se generen en la RAÍZ de dist/
          if (assetInfo.name?.endsWith('.html')) {
            // [name] = clave definida en input (e.g., usuario), [extname] = .html
            return '[name][extname]'; // -> dist/usuario.html
          }
          // Maneja otros assets (CSS, imágenes, etc.)
          // Puedes organizarlos en subcarpetas dentro de assets/
          if (/\.(gif|jpe?g|png|svg)$/.test(assetInfo.name ?? '')) {
            return 'assets/img/[name].[hash][extname]';
          }
          if (/\.css$/.test(assetInfo.name ?? '')) {
            return 'assets/css/[name].[hash][extname]';
          }
          // Para otros tipos, usar carpeta genérica o por extensión
          return 'assets/[ext]/[name].[hash][extname]';
        },
      },
    },
  },
  server: {
    open: true, // Abre el navegador automáticamente en dev
  },
});
