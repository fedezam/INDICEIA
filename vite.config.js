// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // PÁGINA PRINCIPAL
        main: resolve(__dirname, 'index.html'),

        // ONBOARDING (nombres planos → output en raíz)
        usuario: resolve(__dirname, 'src/pages/usuario.html'),
        'mi-comercio': resolve(__dirname, 'src/pages/mi-comercio.html'),
        horarios: resolve(__dirname, 'src/pages/horarios.html'),
        productos: resolve(__dirname, 'src/pages/productos.html'),
        'ia-config': resolve(__dirname, 'src/pages/ia-config.html'),

        // FINAL
        dashboard: resolve(__dirname, 'src/pages/dashboard.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  },
  server: {
    open: true
  }
});
