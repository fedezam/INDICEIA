import './styles.css';

let config = null;
let button = null;

/* =========================
   Utils seguros
========================= */

function safeValue(input) {
  if (!input) return "";
  if (typeof input.value !== "string") return "";
  return input.value.trim();
}

/* =========================
   Estado del botón
========================= */

function setButtonState(enabled) {
  if (!button) return;

  button.disabled = !enabled;

  if (enabled) {
    button.classList.remove("disabled");
    console.log("Estado botón: ✅ habilitado");
  } else {
    button.classList.add("disabled");
    console.log("Estado botón: ⛔ deshabilitado");
  }
}

/* =========================
   Validación (NO rompe)
========================= */

function validate() {
  try {
    let valid = true;

    if (!config || !config.fields) {
      setButtonState(false);
      return false;
    }

    config.fields.forEach(field => {
      const el = document.querySelector(field.selector);
      const value = safeValue(el);

      if (field.required && value === "") {
        valid = false;
      }
    });

    setButtonState(valid);
    return valid;

  } catch (err) {
    console.error("❌ Error en validate()", err);
    setButtonState(false);
    return false;
  }
}

/* =========================
   Listeners globales
========================= */

function attachListeners() {
  document.addEventListener("input", () => validate());
  document.addEventListener("change", () => validate());
}

/* =========================
   API pública
========================= */

export function initOnboardingButton(cfg) {
  console.log("🟦 [onboarding-button] init");
  console.log("Config recibida:", cfg);

  config = cfg;
  button = document.querySelector(cfg.buttonSelector);

  if (!button) {
    console.error("❌ Botón no encontrado:", cfg.buttonSelector);
    return;
  }

  attachListeners();
  validate();
}
