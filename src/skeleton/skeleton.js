// src/skeleton/skeleton.js

import { runLifecycle }     from './lifecycle.js';
import { initDirtyState }   from './dirtyState.js';
import { renderLayout }     from './layout/renderLayout.js';
import { mountLayout }      from './layout/index.js';
import { initializeRuntime } from './runtime.js';

/**
 * Skeleton canónico de ÍndiceIA
 *
 * Capas:
 * 1. Adapter     → resuelve contexto (auth, datos)
 * 2. Runtime     → almacena contexto (estado global)
 * 3. Page        → consume contexto (load, render)
 * 4. Components  → consultan runtime (selectores)
 */
export async function runSkeleton({ page, adapter, options = {} }) {

  // 🦴 1. Layout base
  renderLayout();

  // 🧬 2. Ciclo de vida
  await runLifecycle({
    adapter,
    options,
    onReady: async (context) => {

      // 🎯 3. Runtime — single source of truth
      initializeRuntime(context);

      // 📦 4. Página carga datos
      await page.load(context);

      // 🎨 5. Layout con datos reales
      mountLayout(context);

      // 🖼️ 6. Contenido de página
      page.render();

      // 💾 7. Dirty state
      // FIX: la condición original chequeaba page.save que no existe en ninguna página.
      // La API real del dirty state es getCurrentData + isFormValid (ver dirtyState.js).
      if (
        typeof page.getCurrentData === 'function' &&
        typeof page.isFormValid   === 'function'
      ) {
        initDirtyState({ page, context, options });
      }
    }
  });
}
