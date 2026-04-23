import { runSkeleton } from '../skeleton/skeleton.js';
import { page } from '../views/superAdminPanel.js';

runSkeleton({
  page,
  options: {
    loadingMessage: 'Cargando panel...'
  }
});
