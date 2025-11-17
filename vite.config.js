// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

const pagesDir = 'src/pages';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // PÁGINA PRINCIPAL
        main: resolve(__dirname, 'index.html'),

        // ONBOARDING - CLAVE = NOMBRE FINAL, VALOR = PATH ABSOLUTO
        usuario: resolve(__dirname, `${pagesDir}/usuario.html`),
        'mi-comercio': resolve(__dirname, `${pagesDir}/mi-comercio.html`),
        horarios: resolve(__dirname, `${pagesDir}/horarios.html`),
        productos: resolve(__dirname, `${pagesDir}/productos.html`),
        'ia-config': resolve(__dirname, `${pagesDir}/ia-config.html`),
        dashboard: resolve(__dirname, `${pagesDir}/dashboard.html`),
      },
      output: {
        // Forzar salida plana para HTML
        manualChunks: undefined,
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.html')) {
            // ¡HTML EN RAÍZ!
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  server: {
    open: true,
  },
});
