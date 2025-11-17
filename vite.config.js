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
        main: resolve(__dirname, 'index.html'),

        // Páginas del onboarding
        usuario: resolve(__dirname, 'src/pages/usuario.html'),
        comercio: resolve(__dirname, 'src/pages/mi-comercio.html'),
        horarios: resolve(__dirname, 'src/pages/horarios.html'),
        productos: resolve(__dirname, 'src/pages/productos.html'),
        iaConfig: resolve(__dirname, 'src/pages/ia-config.html'),

        // Final
        dashboard: resolve(__dirname, 'src/pages/dashboard.html'),
      },

      output: {
        // Limpio y profesional
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


