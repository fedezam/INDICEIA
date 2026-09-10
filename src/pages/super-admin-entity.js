// src/pages/super-admin-entity.js
//
// ⟦ROLE⟧ Simplificado (09/09/2026). Antes este archivo reimplementaba
// una UI de edición propia (cards + modales por sección) en paralelo
// al dashboard real que usan los dueños de entidad — dos
// implementaciones del mismo concepto ("editar una entidad") que
// divergían con el tiempo (ver bug de profesional mostrando JSON
// pelado, y los bugs de sintaxis en openProductosPanel/
// openServiciosPanel, encontrados el mismo día que se decidió este
// cambio).
//
// Ahora este archivo solo valida que quien entra es admin y
// redirige a dashboard.html?id={comercioId} — el resto del flujo de
// edición (dashboard → mi-comercio.html/mi-perfil.html/horarios.html/
// etc.) es EXACTAMENTE el mismo que usa cualquier dueño de entidad.
// El override de admin (ver banner "Estás viendo/editando como
// admin") vive en context.js, que resuelve ?id= cuando
// userData.role === 'admin', y se propaga automáticamente por todos
// los links del dashboard vía dashboard.js:_withId().
//
// Las acciones que SÍ son exclusivas de admin (regenerar entidad,
// reactivar/extender plan, marcar/desmarcar demo) quedan en
// super-admin.js (la tabla) y en el propio dashboard/plan — no
// necesitan una página aparte.
import { runLifecycle } from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { runFlowController } from '/src/controllers/flowController.js';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Redirigiendo...' },
  async onReady(ctx) {
    if (ctx.userData?.role !== 'admin') { window.location.href = '/'; return; }
    await runFlowController(ctx.user.uid);

    const comercioId = new URLSearchParams(window.location.search).get('id');
    if (!comercioId) { window.location.href = '/super-admin.html'; return; }

    // El id ya viaja en la URL — dashboard.html lo va a leer a través
    // de context.js (mismo mecanismo, sin duplicar lógica acá).
    window.location.href = `/dashboard.html?id=${comercioId}`;
  }
});
