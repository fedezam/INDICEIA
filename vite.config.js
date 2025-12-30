import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),

        // Pages
        usuario: resolve(__dirname, "src/pages/usuario.html"),
        "mi-comercio": resolve(__dirname, "src/pages/mi-comercio.html"),
        horarios: resolve(__dirname, "src/pages/horarios.html"),
        productos: resolve(__dirname, "src/pages/productos.html"),
        "ia-config": resolve(__dirname, "src/pages/ia-config.html"),
        dashboard: resolve(__dirname, "src/pages/dashboard.html"),
        visual: resolve(__dirname, "src/pages/visual.html"),
        stats: resolve(__dirname, "src/pages/stats.html"),
        "link-publico": resolve(__dirname, "src/pages/link-publico.html"),

        // Planes
        Planes: resolve(__dirname, "src/pages/Planes.html"),

        // Pago
        "pago-exitoso": resolve(
          __dirname,
          "src/pages/pago-exitoso.html"
        ),
      },
    },
  },
});

