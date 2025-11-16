import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        usuario: resolve(__dirname, 'src/pages/usuario.html'),
        miComercio: resolve(__dirname, 'src/pages/mi-comercio.html'),
        horarios: resolve(__dirname, 'src/pages/horarios.html'),
        productos: resolve(__dirname, 'src/pages/productos.html'),
        iaConfig: resolve(__dirname, 'src/pages/ia-config.html'),
        dashboard: resolve(__dirname, 'src/pages/dashboard.html'),
      },
    },
  },
  server: {
    open: true,
  },
});

