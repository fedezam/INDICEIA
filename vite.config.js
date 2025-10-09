// vite.config.js
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      // Múltiples entradas (HTML)
      input: {
        main: resolve(__dirname, "index.html"),               // página principal (login/registro)
        horarios: resolve(__dirname, "src/pages/horarios.html"),
        miComercio: resolve(__dirname, "src/pages/mi-comercio.html"),
        miIA: resolve(__dirname, "src/pages/mi-ia.html"),
        productos: resolve(__dirname, "src/pages/productos.html"),
        usuario: resolve(__dirname, "src/pages/usuario.html"),
        // Si agregás más páginas, simplemente las sumás aquí:
        // ofertas: resolve(__dirname, "src/pages/ofertas.html"),
      },
    },
    outDir: "dist",       // carpeta de salida para Vercel
    emptyOutDir: true,    // borra dist/ antes de build
  },
});

