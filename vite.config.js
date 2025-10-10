// vite.config.js

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".", // raíz del proyecto
  base: "./", // IMPORTANTE: rutas relativas para multi-page
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        horarios: resolve(__dirname, "src/pages/horarios.html"),
        miComercio: resolve(__dirname, "src/pages/mi-comercio.html"),
        miIA: resolve(__dirname, "src/pages/mi-ia.html"),
        productos: resolve(__dirname, "src/pages/productos.html"),
        usuario: resolve(__dirname, "src/pages/usuario.html")
      },
      output: {
        entryFileNames: "assets/js/[name].[hash].js",
        chunkFileNames: "assets/js/[name].[hash].js",
        assetFileNames: "assets/[ext]/[name].[hash].[ext]"
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
