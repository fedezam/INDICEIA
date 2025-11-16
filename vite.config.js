import { defineConfig } from 'vite';
import { resolve } from 'path';
import { createHtmlPlugin } from 'vite-plugin-html';
import fs from 'fs';

export default defineConfig({
  root: '.',
  publicDir: 'public',

  plugins: [
    createHtmlPlugin({
      inject: {
        data: {
          head: fs.readFileSync('./src/components/head.html', 'utf8')
        }
      }
    })
  ],

  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        horarios: resolve(__dirname, 'src/pages/horarios.html'),
        miComercio: resolve(__dirname, 'src/pages/mi-comercio.html'),
        iaConfig: resolve(__dirname, 'src/pages/ia-config.html'),
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

