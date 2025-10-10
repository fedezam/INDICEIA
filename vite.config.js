// vite.config.js
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".", // raíz del proyecto
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
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});



