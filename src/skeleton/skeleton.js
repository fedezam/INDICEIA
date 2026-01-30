import { runLifecycle } from './lifecycle.js';
import { initDirtyState } from './dirtyState.js';
import { renderLayout } from './layout/renderLayout.js';

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

      // 📦 3. Página vive dentro del contexto
      await page.load(context);
      page.render();

      // 💾 4. Dirty / save logic (si aplica)
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

