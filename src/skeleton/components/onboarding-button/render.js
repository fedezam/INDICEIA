// src/skeleton/components/onboarding-button/render.js

export function renderButton() {
  const button = document.createElement("button");
  button.className = "onboarding-button";
  button.innerHTML = `
    <i class="fas fa-arrow-right"></i>
    Guardar y continuar
  `;
  button.disabled = true;
  
  console.log('✅ Botón onboarding renderizado');
  return button;
}
