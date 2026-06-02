import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  build: {
    outDir: "dist",

    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),

        // Pages
        usuario: resolve(__dirname, "src/pages/usuario.html"),
        "tipo-entidad": resolve(__dirname, "src/pages/tipo-entidad.html"),

        "mi-comercio": resolve(__dirname, "src/pages/mi-comercio.html"),
        "mi-perfil": resolve(__dirname, "src/pages/mi-perfil.html"),
        "mi-perfil-profesional": resolve(__dirname, "src/pages/mi-perfil-profesional.html"),
        
        // Nuevas páginas de configuración/perfil
        "mi-soporte": resolve(__dirname, "src/pages/mi-soporte.html"),
        documentos: resolve(__dirname, "src/pages/documentos.html"),

        horarios: resolve(__dirname, "src/pages/horarios.html"),

        productos: resolve(__dirname, "src/pages/productos.html"),
        servicios: resolve(__dirname, "src/pages/servicios.html"),

        "ia-config": resolve(__dirname, "src/pages/ia-config.html"),
        "llm-parser-test": resolve(__dirname, "src/pages/llm-parser-test.html"),
        "ler-browser-test": resolve(__dirname, "src/pages/ler-browser-test.html"),
        "entidad-pizeria-la-esquina": resolve(__dirname, "src/pages/carga/y/habita/entidad-pizeria-la-esquina.html"),

        dashboard: resolve(__dirname, "src/pages/dashboard.html"),
        visual: resolve(__dirname, "src/pages/visual.html"),
        stats: resolve(__dirname, "src/pages/stats.html"),

        "link-publico": resolve(__dirname, "src/pages/link-publico.html"),
        "capacidades-cognitivas": resolve(__dirname, "src/pages/capacidadesCognitivas.html"),

        entrega: resolve(__dirname, "src/pages/entrega.html"),
        lugares: resolve(__dirname, "src/pages/lugares.html"),
        cobertura: resolve(__dirname, "src/pages/cobertura.html"),
        consultas: resolve(__dirname, "src/pages/consultas.html"),

        "admin-login": resolve(__dirname, "src/pages/admin-login.html"),

        // Planes
        plans: resolve(__dirname, "src/pages/plans.html"),

        // Pago
        "pago-exitoso": resolve(__dirname, "src/pages/pago-exitoso.html"),

        // Super Admin
        "super-admin": resolve(__dirname, "src/pages/super-admin.html"),
      },
    },
  },
});
