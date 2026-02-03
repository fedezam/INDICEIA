console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';

// 👇 IMPORT DIRECTO Y LOG
import { renderCard } from '../skeleton/components/card/render.js';

render() {
  const page = document.getElementById('skeleton-page');

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderCard({
    title: 'Card de prueba',
    description: 'Si ves esto, la card funciona',
    icon: 'fas fa-box',
    highlight: true
  });

  const cardNode = wrapper.firstElementChild;

  console.log('✅ Card creada:', cardNode);

  page.appendChild(cardNode);
}

    // -------------------------
    // CARD TEST
    // -------------------------
    if (typeof renderCard !== 'function') {
      console.error('❌ renderCard NO es una función');
      return;
    }

    const card = renderCard({
      title: 'Card de prueba',
      icon: 'fas fa-vial',
      content: `<p>Si ves esta card, el componente funciona.</p>`
    });

    if (!card) {
      console.error('❌ renderCard devolvió undefined/null');
      return;
    }

    console.log('✅ Card creada:', card);

    page.appendChild(card);
  }
};

runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true
  }
});
