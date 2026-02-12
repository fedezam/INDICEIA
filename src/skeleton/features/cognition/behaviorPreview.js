import { cognitiveState } from "./state.js";

export function mountBehaviorPreview(container) {
  container.innerHTML = `
    <h3>Ejemplo de comportamiento</h3>
    <div class="preview-box">
      <strong>Usuario:</strong> ¿Tenés turno mañana?<br/><br/>
      <strong>IA:</strong> ${previewText()}
    </div>
  `;
}

function previewText() {
  switch (cognitiveState.autonomy) {
    case "informative":
      return "Sí, hay turnos disponibles mañana.";
    case "guided":
      return "Sí, hay turnos disponibles. ¿Querés que lo agende?";
    case "autonomous":
      return "Listo, te agendé un turno para mañana a las 10.";
  }
}
