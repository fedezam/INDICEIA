// src/skeleton/skeleton.js

import { runLifecycle } from './lifecycle.js';
import { initDirtyState } from './dirtyState.js';
import { renderLayout } from './layout/renderLayout.js';
import { mountLayout } from './layout/index.js';
import { initializeRuntime } from './runtime.js';

/**
 * Skeleton canónico de ÍndiceIA
 * 
 * Capas:
 * 1. Adapter → resuelve contexto (auth, datos)
 * 2. Runtime → almacena contexto (estado global)
 * 3. Page → consume contexto (load, render)
 * 4. Components → consultan runtime (selectores)
 */
export async function runSkeleton({
  page,
  adapter,
  options = {}
}) {
  // 🦴 1. Render layout base (estructura pura)
  renderLayout();

  // 🧬 2. Ciclo de vida: adapter resuelve contexto
  await runLifecycle({
    adapter,
    options,
    onReady: async (context) => {
      console.log('[skeleton] Contexto resuelto:', {
        uid: context.user?.uid,
        comercioId: context.comercioId,
        isEditMode: context.isEditMode
      });

      // 🎯 INICIALIZAR RUNTIME (ADR-001)
      // Single source of truth para todo el sistema
      initializeRuntime(context);

      // 📦 3. Página carga datos específicos
      await page.load(context);

      // 🎨 4. Actualizar layout con datos reales
      mountLayout(context);

      // 🖼️ 5. Renderizar contenido de página
      page.render();

      // 💾 6. Dirty state si la página lo soporta
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
