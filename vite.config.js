// vite.config.js
import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: ".", // raíz del proyecto
  base: "./", // rutas relativas para que funcionen en Vercel
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
        usuario: resolve(__dirname, "src/pages/usuario.html"),
      },
      output: {
        entryFileNames: "assets/js/[name].[hash].js",
        chunkFileNames: "assets/js/[name].[hash].js",
        assetFileNames: ({ name }) => {
          // organiza imágenes, css, fuentes, etc.
          if (/\.(gif|jpe?g|png|svg)$/.test(name ?? "")) {
            return "assets/img/[name].[hash].[ext]";
          }
          if (/\.css$/.test(name ?? "")) {
            return "assets/css/[name].[hash].[ext]";
          }
          return "assets/[ext]/[name].[hash].[ext]";
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});


