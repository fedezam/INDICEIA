// Inyecta datos dinámicos en el header

export function updateHeader(context) {
  const nameEl = document.querySelector('[data-header="commerceName"]');
  const badgeEl = document.querySelector('[data-header="planBadge"]');

  if (nameEl) {
    nameEl.textContent =
      context?.comercioData?.nombre ||
      context?.comercioData?.nombreComercial ||
      'Mi comercio';
  }

  if (badgeEl) {
    const plan = context?.comercioData?.plan || 'trial';
    badgeEl.textContent = plan.toUpperCase();
    badgeEl.className = `plan-badge plan-${plan}`;
  }
}
