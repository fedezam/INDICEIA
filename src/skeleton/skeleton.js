// src/skeleton/skeleton.js

import { runLifecycle } from './lifecycle.js';
import { initDirtyState } from './dirtyState.js';
import { renderLayout } from './layout/renderLayout.js';
import { mountLayout } from './layout/index.js';

/**
 * Skeleton canónico de ÍndiceIA
 * No sabe de negocio
 * No sabe de Firebase
 * Orquesta la página
 */
export async function runSkeleton({
  page,
  adapter,
  options = {}
}) {
  // 🦴 1. Render layout base UNA sola vez
  renderLayout();

  // 🧬 2. Ciclo de vida (contexto, auth, etc)
  await runLifecycle({
    adapter,
    options,
    onReady: async (context) => {
      console.log('CONTEXT COMPLETO EN SKELETON onReady:', context);

      // 📦 3. Página carga datos
      await page.load(context);

      // 🎨 4. PRIMERO: Actualizar header con datos reales
      mountLayout(context);

      // 🖼️ 5. DESPUÉS: Renderizar contenido de página
      page.render();

      // 💾 6. Dirty / save logic (si aplica)
      if (page.getCurrentData && page.save) {
        initDirtyState({
          page,
          context,
          options
        });
      }
    }
  });
}
