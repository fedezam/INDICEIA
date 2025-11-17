// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/', // ← CRÍTICO: asegura rutas absolutas

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        usuario: 'src/pages/usuario.html',           // ← ¡SOLO EL PATH!
        'mi-comercio': 'src/pages/mi-comercio.html', // ← ¡SIN resolve()!
        horarios: 'src/pages/horarios.html',
        productos: 'src/pages/productos.html',
        'ia-config': 'src/pages/ia-config.html',
        dashboard: 'src/pages/dashboard.html',
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
