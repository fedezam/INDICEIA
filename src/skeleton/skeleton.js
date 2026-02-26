// src/skeleton/skeleton.js

import { runLifecycle }      from './lifecycle.js';
import { initDirtyState }    from './dirtyState.js';
import { renderLayout }      from './layout/renderLayout.js';
import { mountLayout }       from './layout/index.js';
import { initializeRuntime } from './runtime.js';
import { runFlowController } from '../controllers/flowController.js';
import { auth }              from '../services/firebase/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

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
    onAuthError: () => {
      // Sin sesión o usuario sin doc → flowController decide
      onAuthStateChanged(auth, (user) => {
        runFlowController(user?.uid || null);
      });
    },
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
      if (
        typeof page.getCurrentData === 'function' &&
        typeof page.isFormValid   === 'function'
      ) {
        initDirtyState({ page, context, options });
      }
    }
  });
}
