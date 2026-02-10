// src/skeleton/components/onboarding-button/render.js
import './styles.css';

export function renderButton() {
  const button = document.createElement("button");
  button.className = "btn btn-primary onboarding-button";
  button.textContent = "Guardar y continuar";
  button.disabled = true;
  return button;
}
