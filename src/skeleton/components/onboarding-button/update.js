// src/skeleton/components/onboarding-button/update.js

import { cleanPayload } from "../../utils/cleanPayload.js";

export function attachBehavior(button, config, context) {

  const {
    stepName,
    getData,
    validate,
    onSave,
    onSuccess,
    onError,
    redirectTo = "/dashboard.html",
    dirtyController,
    getLabel,
    getChangeType
  } = config;

  if (!context?.persistence) {
    throw new Error("[onboarding-button] context.persistence no definido");
  }

  const persistence = context.persistence;
  const hasCustomMode = !!onSave;

  const updateState = () => {
    let valid = false;
    try { valid = validate(); }
    catch (e) { console.error(e); }

    button.disabled = !valid;

    if (dirtyController) {
      const hasChanges = dirtyController.hasUnsavedChanges();
      button.classList.toggle("is-dirty", hasChanges);
      button.classList.toggle("is-clean", !hasChanges);

      if (getChangeType && hasChanges) {
        const type = getChangeType();
        button.classList.toggle("is-delete", type === "delete");
        button.classList.toggle("is-update", type === "update");
      } else {
        button.classList.remove("is-delete", "is-update");
      }
    }

    if (getLabel) {
      try { button.innerHTML = getLabel(); }
      catch (e) { console.error(e); }
    }
  };

  document.addEventListener("input", updateState);
  document.addEventListener("change", updateState);
  setTimeout(updateState, 0);

  button.addEventListener("click", async () => {

    if (dirtyController && !dirtyController.hasUnsavedChanges()) {
      window.location.href = redirectTo;
      return;
    }

    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = "Guardando...";

    try {

      let success = false;

      // ═══ CUSTOM ═══════════════════════
      if (hasCustomMode) {

        const data = getData ? getData() : null;

        const result = await onSave({
          ...context,
          data
        });

        success = result !== false;

      // ═══ SIMPLE ═══════════════════════
      } else {

        const rawData = getData();
        const cleanData = cleanPayload(rawData);

        await persistence.updateData(cleanData);
        await persistence.markStepCompleted(stepName);

        success = true;
      }

      if (success) {

        if (dirtyController) {
          dirtyController.markSaved();
        }

        if (onSuccess) {
          await onSuccess();
        }

        window.location.href = redirectTo;
      }

    } catch (err) {

      console.error(err);

      if (onError) onError(err);

      button.innerHTML = original;
      button.disabled = false;
    }

  });
}
