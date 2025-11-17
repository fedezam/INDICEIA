<<<<<<< HEAD
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.', // raíz del proyecto
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'src/pages/dashboard.html'),
        miComercio: path.resolve(__dirname, 'src/pages/mi-comercio.html'),
        productos: path.resolve(__dirname, 'src/pages/productos.html'),
        horarios: path.resolve(__dirname, 'src/pages/horarios.html'),
        usuario: path.resolve(__dirname, 'src/pages/usuario.html'),
        iaConfig: path.resolve(__dirname, 'src/pages/ia-config.html')
      },
      output: {
        // mantener la estructura plana para Vercel
        entryFileNames: 'assets/js/[name].[hash].js',
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(css)$/.test(name ?? '')) {
            return 'assets/css/[name].[hash][extname]';
          }
          if (/\.(png|jpe?g|svg|gif|webp)$/.test(name ?? '')) {
            return 'assets/img/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        }
      }
    },
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
=======
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // ESTO ES LO QUE REALMENTE FUNCIONA EN VITE 5.4
  build: {
    rollupOptions: {
      input: [
        resolve(__dirname, 'index.html'),
        resolve(__dirname, 'src/pages/usuario.html'),
        resolve(__dirname, 'src/pages/mi-comercio.html'),
        resolve(__dirname, 'src/pages/horarios.html'),
        resolve(__dirname, 'src/pages/productos.html'),
        resolve(__dirname, 'src/pages/ia-config.html'),
        resolve(__dirname, 'src/pages/dashboard.html'),
      ],
      // ESTA LÍNEA ES LA QUE HACE LA MAGIA EN VITE 5.4
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Forzamos que los HTML se emitan planos en dist/
        manualChunks: undefined,
      }
    },
    // Y esta línea también es clave
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Sin root, sin appType, sin nada más
})
>>>>>>> 6e32576 (fix: HTML movidos a la raíz de dist + script build:final funcional para Vercel)
