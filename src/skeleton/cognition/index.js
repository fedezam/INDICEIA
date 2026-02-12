import { renderCognition } from "./cognition.render.js";
import { cognitionState } from "./cognition.state.js";
import { bindCognitionSave } from "./cognition.save.js";

export function mountCognition(container) {
  container.innerHTML = "";
  container.appendChild(renderCognition(cognitionState));
  bindCognitionSave(container, cognitionState);
}
