import { COGNITION_GROUPS } from "./cognition.data.js";

export function renderCognition(state) {
  const wrapper = document.createElement("section");
  wrapper.className = "cognition-page";

  wrapper.innerHTML = `
    <div class="page-header">
      <h2><i class="fa-solid fa-brain"></i> Cognición</h2>
      <p>Configuración del comportamiento interno del agente</p>
    </div>
  `;

  COGNITION_GROUPS.forEach(group => {
    const groupEl = document.createElement("div");
    groupEl.className = "capability-group";

    groupEl.innerHTML = `
      <div class="group-header">
        <i class="fa-solid ${group.icon}"></i>
        ${group.title}
      </div>
      <ul class="capabilities-list"></ul>
    `;

    const list = groupEl.querySelector(".capabilities-list");

    group.items.forEach(item => {
      const li = document.createElement("li");
      li.className = "capability-item";

      li.innerHTML = `
        <label>
          <input type="checkbox" data-id="${item.id}">
          <div class="capability-content">
            <div class="capability-title">${item.title}</div>
            <p class="capability-description">${item.description}</p>
          </div>
        </label>
      `;

      const checkbox = li.querySelector("input");
      checkbox.checked = state.enabled[item.id];
      checkbox.addEventListener("change", () => {
        state.enabled[item.id] = checkbox.checked;
      });

      list.appendChild(li);
    });

    wrapper.appendChild(groupEl);
  });

  wrapper.innerHTML += `
    <div class="actions-bar">
      <button class="btn-primary" data-action="save-cognition">
        Guardar cambios
      </button>
    </div>
  `;

  return wrapper;
}
