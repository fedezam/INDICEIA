import { cognitiveState, setThreshold } from "./state.js";

export function mountThresholdSlider(container) {
  if (cognitiveState.autonomy !== "autonomous") {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <h3>Nivel de intervención humana</h3>
    <input type="range" min="0" max="1" step="0.1"
      value="${cognitiveState.threshold}" />
    <p>Valor actual: ${cognitiveState.threshold}</p>
  `;

  const slider = container.querySelector("input");
  const label = container.querySelector("p");

  slider.addEventListener("input", () => {
    setThreshold(Number(slider.value));
    label.textContent = `Valor actual: ${slider.value}`;
  });
}
