// src/shared/pricing/plans.pricing.js

export const PLAN_PRICING = {
  basic: {
    price: 16000,
    currency: "ARS",
    mercadoPago: {
      link: "https://mpago.la/2wceUD6",
      preferenceId: "175484755-38640bdb-3cf5-4935-8bb5-832e968d0085"
    },
    checkoutLabel: "PLAN BASIC | ÍndiceIA – Asistente inteligente"
  },

  medium: {
    price: 26000,
    currency: "ARS",
    mercadoPago: {
      link: "https://mpago.la/15HP87P",
      preferenceId: "175484755-63ff0d8c-96ee-46b3-a587-4ec22dbb47d1"
    },
    checkoutLabel: "PLAN MEDIUM | ÍndiceIA – Asistente comercial"
  },

  medium_live: {
    price: 48000,
    currency: "ARS",
    mercadoPago: {
      link: "https://mpago.la/1bGe6Fb",
      preferenceId: "175484755-659d9274-2ff3-4feb-92c8-a16fb8fe9d52"
    },
    checkoutLabel: "PLAN MEDIUM + LIVE | ÍndiceIA – Atención continua"
  },

  pro: {
    price: 55000,
    currency: "ARS",
    mercadoPago: {
      link: "https://mpago.la/2932w3X",
      preferenceId: "175484755-11ab428a-b50c-4049-b456-ecf3ff51da79"
    },
    checkoutLabel:
      "PLAN PRO | ÍndiceIA – Asistente comercial avanzado"
  }
};
