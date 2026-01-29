/**
 * Dirty state canónico del Skeleton
 * - NO maneja navegación
 * - NO decide flujos
 * - SOLO observa cambios y habilita/deshabilita guardado
 */
export function initDirtyState({
  page,
  context,
  options = {}
}) {
  if (
    typeof page.getCurrentData !== 'function' ||
    typeof page.isFormValid !== 'function'
  ) {
    // Página no usa dirty state → salir en silencio
    return;
  }

  let originalSnapshot = structuredClone(page.getCurrentData());
  let hasUnsavedChanges = false;

  const isEditMode = context?.isEditMode === true;
  const intervalMs = options.dirtyCheckInterval || 300;

  const saveBtn = document.getElementById('saveChangesBtnBottom');

  function reevaluateState() {
    const current = page.getCurrentData();

    hasUnsavedChanges =
      JSON.stringify(current) !== JSON.stringify(originalSnapshot);

    updateSaveButtonState();
  }

  function updateSaveButtonState() {
    if (!saveBtn) return;

    if (isEditMode) {
      saveBtn.disabled = !hasUnsavedChanges;
    } else {
      saveBtn.disabled = !page.isFormValid();
    }
  }

  // Observación periódica (tal como hoy)
  setInterval(reevaluateState, intervalMs);

  // Exponemos helpers mínimos (opcional)
  return {
    hasUnsavedChanges: () => hasUnsavedChanges,
    markSaved: () => {
      originalSnapshot = structuredClone(page.getCurrentData());
      hasUnsavedChanges = false;
      updateSaveButtonState();
    }
  };
}
