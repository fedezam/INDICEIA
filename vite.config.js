import { defineConfig } from "vite";

// 🧩 Configuración base optimizada para Firebase + Vercel
export default defineConfig({
  root: "public", // raíz del proyecto (donde está index.html)
  publicDir: "../public", // asegura acceso a /img, /css, etc.
  build: {
    outDir: "../dist", // salida del build
    emptyOutDir: true, // limpia /dist antes del build
    sourcemap: false, // puede ponerse true si querés debug
  },
  optimizeDeps: {
    include: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore"
    ],
  },
  server: {
    port: 5173, // default vite
    open: true, // abre navegador automáticamente
  },
});
