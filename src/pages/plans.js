//src/pages/plans.js
import { getAllPlans } from "../shared/pricing/plans.service.js";
import { resolveFirebaseContext } from "../services/firebase/context.js";
import './plans.css';

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

    <button type="button" class="cta-button">
      Elegir plan
    </button>
  `;

  const btn = card.querySelector(".cta-button");
  btn.addEventListener("click", () => handlePlanClick(plan, btn));

  return card;
}

function handlePlanClick(plan, btn) {
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Redirigiendo...";

  resolveFirebaseContext(
    async ({ comercioId }) => {
      if (!comercioId) {
        alert("No se encontró tu comercio. Volvé a iniciar sesión.");
        btn.disabled = false;
        btn.textContent = originalLabel;
        return;
      }

      try {
        const res = await fetch("/api/generate-and-upload-entity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_payment_preference",
            comercioId,
            planType: plan.id,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Error creando el pago");
        }

        window.open(data.initPoint, "_blank", "noopener");
      } catch (err) {
        console.error("Error al iniciar pago:", err);
        alert("No se pudo iniciar el pago. Probá de nuevo en un momento.");
      } finally {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    },
    (err) => {
      alert("Iniciá sesión para elegir un plan.");
      console.warn("No autenticado:", err.message);
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  );
}
