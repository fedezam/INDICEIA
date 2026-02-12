import { cognitiveState, updatePermission } from "./state.js";

export function mountRulesPanel(container, rerender = false) {
  if (cognitiveState.autonomy === "informative") {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <h3>Límites de actuación</h3>

    ${checkbox("autoRespond", "Responder automáticamente")}
    ${checkbox("suggestActions", "Sugerir acciones")}
    ${checkbox("initiateConversation", "Iniciar conversación")}
    ${checkbox("askForData", "Pedir datos al usuario")}
  `;

  container.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      updatePermission(input.name, input.checked);
    });
  });
}

function checkbox(key, label) {
  return `
    <label>
      <input type="checkbox" name="${key}"
        ${cognitiveState.permissions[key] ? "checked" : ""} />
      ${label}
    </label>
  `;
}
