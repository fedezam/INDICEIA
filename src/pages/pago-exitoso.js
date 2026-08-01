// src/pages/pago-exitoso.js
//
// ── Nota (01/08/2026) ──────────────────────────────────────────
// Este archivo YA NO activa el plan directo. Antes escribía en
// Firestore sin verificar el pago con MercadoPago (cualquiera podía
// activarse un plan gratis navegando acá con localStorage.pendingPlan
// seteado a mano). La activación real ahora es 100% responsabilidad
// del webhook (api/webhooks/mercadopago.js → applyPlanStateChange),
// que sí verifica el pago contra la API de MP antes de tocar Firestore.
//
// Esta página es solo una pantalla de cortesía: el usuario vuelve acá
// después de pagar en MP, pero la activación puede tardar unos
// segundos (tiempo que tarda MP en pegarle al webhook). No hay nada
// que verificar ni escribir acá.
// ────────────────────────────────────────────────────────────────

import './pago-exitoso.css';

localStorage.removeItem("pendingPlan");

console.log("Pago procesado. Tu plan se activa automáticamente en unos segundos.");
