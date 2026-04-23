import { resolveAdminContext } from '../services/firebase/admin-context.js';
import { page } from '../views/superAdminPanel.js';
import { renderLayout } from '../skeleton/layout/renderLayout.js';
import { mountLayout } from '../skeleton/layout/index.js';
import { auth } from '../services/firebase/firebase.js';
import { signOut } from 'firebase/auth';


renderLayout();

document.addEventListener('skeleton:logout', async () => {
  await signOut(auth);
  window.location.href = '/';
});

resolveAdminContext(
  async ({ user, userData }) => {
    const context = { user, userData };

    await page.load(context);
    mountLayout(context);
    page.render();
  },
  (err) => {
    console.error('[admin]', err.message);

    if (err.message === 'Acceso denegado' || err.message === 'No autenticado') {
      window.location.href = '/';
    }
  }
);
