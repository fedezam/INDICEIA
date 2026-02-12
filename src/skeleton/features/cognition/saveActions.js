import { cognitiveState } from "./state.js";
import { showToast } from "@/shared/utils.js";
import { updateCommerceJSON } from "@/shared/updateCommerceJSON.js";

export function mountSaveActions(container) {
  container.innerHTML = `
    <button class="btn btn-primary">
      Guardar configuración cognitiva
    </button>
  `;

  container.querySelector("button").addEventListener("click", async () => {
    await updateCommerceJSON({ cognitiveProfile: cognitiveState });
    showToast("Cognición actualizada", "success");
  });
}
