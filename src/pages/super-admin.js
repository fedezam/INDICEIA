import { runSkeleton } from '../skeleton/skeleton.js';
import { page } from '../views/superAdminPanel.js';

runSkeleton({
  page,

  // 👇 ADAPTER MÍNIMO (OBLIGATORIO)
  adapter: async (opts) => ({
    ...opts,
    user: null,
    comercioId: null
  }),

  options: {
    loadingMessage: 'Cargando panel...'
  }
});
