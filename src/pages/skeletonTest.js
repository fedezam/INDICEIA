import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';

const testPage = {

  async load(context) {
    console.log('✅ Contexto recibido:', context);
  },

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <p>🔥 Skeleton funcionando</p>
      <p>Usuario autenticado ✔️</p>
      <p>Abrí la consola para ver el contexto</p>
    `;
  }

};

runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: {
    loadingMessage: 'Probando skeleton + Firebase...'
  }
});
