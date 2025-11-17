// flowController.js (VERSIÓN FINAL)

const FLOW_STEPS = [
  "usuario.html",
  "comercio.html",
  "horarios.html",
  "productos.html",
  "ia-config.html",
  "dashboard.html"
];

// -----------------------------------------------
// Obtiene el paso actual según filename
// -----------------------------------------------
function getCurrentStep() {
  const path = window.location.pathname;
  return path.split("/").pop();
}

// -----------------------------------------------
// Guarda un estado simple por pantalla
// -----------------------------------------------
export function markStepCompleted(stepName) {
  const state = JSON.parse(localStorage.getItem("flowState") || "{}");
  state[stepName] = true;
  localStorage.setItem("flowState", JSON.stringify(state));
}

// -----------------------------------------------
// Verifica si el paso está completado
// -----------------------------------------------
function isStepCompleted(stepName) {
  const state = JSON.parse(localStorage.getItem("flowState") || "{}");
  return state[stepName] === true;
}

// -----------------------------------------------
// Activa/desactiva el botón "Siguiente"
// -----------------------------------------------
export function attachNextButton(nextButtonId) {
  const current = getCurrentStep();
  const nextBtn = document.getElementById(nextButtonId);

  if (!nextBtn) return;

  function updateButton() {
    if (isStepCompleted(current)) {
      nextBtn.disabled = false;
      nextBtn.classList.remove("disabled");
    } else {
      nextBtn.disabled = true;
      nextBtn.classList.add("disabled");
    }
  }

  updateButton();
  setInterval(updateButton, 500); // Revisa por si se guarda async
}

// -----------------------------------------------
// Ir al siguiente paso
// -----------------------------------------------
export function goToNextStep() {
  const current = getCurrentStep();
  const index = FLOW_STEPS.indexOf(current);

  if (index === -1 || index === FLOW_STEPS.length - 1) return;

  const next = FLOW_STEPS[index + 1];
  window.location.href = next;
}

// -----------------------------------------------
// Para botón atrás (opcional)
// -----------------------------------------------
export function goToPreviousStep() {
  const current = getCurrentStep();
  const index = FLOW_STEPS.indexOf(current);

  if (index <= 0) return;

  const previous = FLOW_STEPS[index - 1];
  window.location.href = previous;
}

// -----------------------------------------------
// Debug manual (opcional)
// -----------------------------------------------
window.__flowDebug = {
  reset() {
    localStorage.removeItem("flowState");
    alert("Estado del flujo reseteado.");
  },
  state() {
    console.log(JSON.parse(localStorage.getItem("flowState") || "{}"));
  }
};
