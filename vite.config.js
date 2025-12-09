import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        usuario: resolve(__dirname, "src/pages/usuario.html"),
        "mi-comercio": resolve(__dirname, "src/pages/mi-comercio.html"),
        horarios: resolve(__dirname, "src/pages/horarios.html"),
        productos: resolve(__dirname, "src/pages/productos.html"),
        "ia-config": resolve(__dirname, "src/pages/ia-config.html"),
        dashboard: resolve(__dirname, "src/pages/dashboard.html"),
        visual: resolve(__dirname, "src/pages/visual.html"),
      },
    },
  },
});
