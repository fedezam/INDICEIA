import { runLifecycle } from './lifecycle.js';
import { initDirtyState } from './dirtyState.js';

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
  await runLifecycle({
    adapter,
    options,
    onReady: async (context) => {
      // La página vive DENTRO del contexto resuelto
      await page.load(context);
      page.render();

      // Dirty / save logic (si aplica)
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
