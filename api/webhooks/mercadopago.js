// /api/webhooks/mercadopago.js

import mercadopago from "mercadopago";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { applyPlanStateChange } from "../../lib/plan/applyPlanStateChange.js";

// ===============================
// MERCADO PAGO
// ===============================
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// ===============================
// FIREBASE ADMIN
// ===============================
if (!getApps().length) {
  initializeApp({
    credential: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
  });
}

const db = getFirestore();

// ===============================
// CONSTANTES DE PLAN
// ===============================
const PLAN_DURATION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// ===============================
// HANDLER
// ===============================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { type, data } = req.body;

    // Solo pagos
    if (type !== "payment") {
      return res.status(200).send("Ignored");
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.status(400).send("Missing payment id");
    }

    // Obtener pago real desde MP
    const payment = await mercadopago.payment.findById(paymentId);
    const info = payment.body;

    // Solo pagos aprobados
    if (info.status !== "approved") {
      return res.status(200).send("Payment not approved");
    }

    const externalRef = info.external_reference;
    if (!externalRef) {
      throw new Error("Missing external_reference");
    }

    // external_reference = comercioId:planType
    const [comercioId, planType] = externalRef.split(":");

    if (!comercioId || !planType) {
      throw new Error("Invalid external_reference format");
    }

    // ===============================
    // CALCULO DE FECHAS
    // ===============================
    const startedAt = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(
      startedAt.toMillis() + PLAN_DURATION_DAYS * DAY_MS
    );

    // ===============================
    // APLICAR CAMBIO DE PLAN (VERDAD ÚNICA)
    // ===============================
    await applyPlanStateChange({
      comercioId,
      type: planType,
      active: true,
      trial: false,
      startedAt,
      expiresAt,
      source: "mercadopago",
      reason: "payment_confirmed",
      eventId: paymentId,
    });

    return res.status(200).send("OK");
  } catch (err) {
    console.error("MP WEBHOOK ERROR:", err);
    return res.status(500).send("Webhook error");
  }
}
