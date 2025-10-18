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
        horarios: resolve(__dirname, 'src/pages/horarios.html'),
        miComercio: resolve(__dirname, 'src/pages/mi-comercio.html'),
        iaConfig: resolve(__dirname, 'src/pages/ia-config.html'), // ✅ actualizado
        productos: resolve(__dirname, 'src/pages/productos.html'),
        usuario: resolve(__dirname, 'src/pages/usuario.html'),
        dashboard: resolve(__dirname, 'src/pages/dashboard.html'),
      },
    },
  },
  server: {
    open: true,
  },
});
