// src/shared/pricing/plans.service.js

import { PLAN_DEFINITIONS } from "./plans.definition.js";
import { PLAN_PRICING } from "./plans.pricing.js";

export function getAllPlans() {
  return Object.keys(PLAN_DEFINITIONS).map((key) =>
    buildPlan(key)
  );
}

export function getPlanById(planId) {
  return buildPlan(planId);
}

function buildPlan(planId) {
  const definition = PLAN_DEFINITIONS[planId];
  const pricing = PLAN_PRICING[planId];

  if (!definition || !pricing) {
    throw new Error(`Plan inválido: ${planId}`);
  }

  return {
    id: definition.id,
    name: definition.name,
    productos: definition.productos,
    live: definition.live,
    recommended: definition.recommended || false,

    descriptionShort: definition.descriptionShort,
    descriptionLong: definition.descriptionLong,

    price: pricing.price,
    currency: pricing.currency,

    mercadoPagoLink: pricing.mercadoPago.link,
    mercadoPagoPreferenceId:
      pricing.mercadoPago.preferenceId,

    checkoutLabel: pricing.checkoutLabel
  };
}
