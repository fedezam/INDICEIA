import { defineConfig } from 'vite';
import { resolve } from 'path';

const pages = [
  'index',
  'src/pages/usuario',
  'src/pages/mi-comercio',
  'src/pages/horarios',
  'src/pages/productos',
  'src/pages/ia-config',
  'src/pages/dashboard',
];

const input = Object.fromEntries(
  pages.map(page => [
    page.split('/').pop().replace('.html', ''),
    resolve(__dirname, `${page}.html`)
  ])
);

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input,
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
