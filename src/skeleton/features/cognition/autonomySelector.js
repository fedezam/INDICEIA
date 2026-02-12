import { cognitiveState, setAutonomy } from "./state.js";

export function mountAutonomySelector(container, onChange) {
  container.innerHTML = `
    <h2>Autonomía de la IA</h2>

    <div class="autonomy-cards">
      ${card("informative", "Informativa", "Solo responde y explica")}
      ${card("guided", "Guiada", "Sugiere pero pide confirmación")}
      ${card("autonomous", "Autónoma", "Actúa dentro de reglas")}
    </div>
  `;

  container.querySelectorAll(".autonomy-card").forEach(cardEl => {
    cardEl.addEventListener("click", () => {
      setAutonomy(cardEl.dataset.level);
      highlight(container);
      onChange && onChange();
    });
  });

  highlight(container);
}

function card(level, title, desc) {
  return `
    <div class="autonomy-card" data-level="${level}">
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>
  `;
}

function highlight(container) {
  container.querySelectorAll(".autonomy-card").forEach(el => {
    el.classList.toggle(
      "active",
      el.dataset.level === cognitiveState.autonomy
    );
  });
}
