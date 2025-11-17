import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.', // raíz del proyecto
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'src/pages/dashboard.html'),
        miComercio: path.resolve(__dirname, 'src/pages/mi-comercio.html'),
        productos: path.resolve(__dirname, 'src/pages/productos.html'),
        horarios: path.resolve(__dirname, 'src/pages/horarios.html'),
        usuario: path.resolve(__dirname, 'src/pages/usuario.html'),
        iaConfig: path.resolve(__dirname, 'src/pages/ia-config.html')
      },
      output: {
        // mantener la estructura plana para Vercel
        entryFileNames: 'assets/js/[name].[hash].js',
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(css)$/.test(name ?? '')) {
            return 'assets/css/[name].[hash][extname]';
          }
          if (/\.(png|jpe?g|svg|gif|webp)$/.test(name ?? '')) {
            return 'assets/img/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        }
      }
    },
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
