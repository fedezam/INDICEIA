import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // la raíz del proyecto es donde está index.html
  publicDir: 'public', // carpeta donde están las imágenes
  build: {
    outDir: 'dist', // salida del build
    rollupOptions: {
      input: './index.html', // punto de entrada principal
    },
  },
  server: {
    open: true, // abre el navegador al iniciar
  },
});

