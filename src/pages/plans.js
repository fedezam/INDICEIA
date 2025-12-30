import { getAllPlans } from "../shared/pricing/plans.service.js";

const grid = document.getElementById("plansGrid");
const plans = getAllPlans();

plans.forEach(plan => {
  grid.appendChild(renderPlan(plan));
});

function renderPlan(plan) {
  const card = document.createElement("article");
  card.className = `plan-card ${plan.recommended ? "recommended" : ""}`;

  card.innerHTML = `
    ${plan.recommended ? `<div class="badge">RECOMENDADO</div>` : ""}

    <h2>Plan ${plan.name}</h2>

    <p class="plan-desc">${plan.descriptionShort}</p>

    <div class="price">
      $${plan.price.toLocaleString("es-AR")}
      <span>/mes</span>
    </div>

    <ul class="features">
      <li>Hasta ${plan.productos} productos</li>
      <li>${plan.live ? "Interacción continua 24/7" : "Respuestas bajo demanda"}</li>
      <li>IA entrenada con tus datos</li>
      <li>Link público + QR</li>
    </ul>

    <a
      href="${plan.mercadoPagoLink}"
      class="cta-button"
      target="_blank"
      rel="noopener"
    >
      Elegir plan
    </a>
  `;

  return card;
}
