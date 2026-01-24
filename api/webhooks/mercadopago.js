// /api/webhooks/mercadopago.js

import mercadopago from "mercadopago";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

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
// HANDLER
// ===============================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { type, data } = req.body;

    // Solo nos interesa pagos
    if (type !== "payment") {
      return res.status(200).send("Ignored");
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.status(400).send("Missing payment id");
    }

    // Buscar el pago real
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

    // comercioId:planId
    const [comercioId, planId] = externalRef.split(":");
    if (!comercioId || !planId) {
      throw new Error("Invalid external_reference format");
    }

    // ===============================
    // ESCRIBIMOS LA VERDAD
    // ===============================
    await db.doc(`comercios/${comercioId}`).update({
      plan: {
        id: planId,
        status: "active",
        source: "mercadopago",
        paymentId: paymentId,
        updatedAt: Timestamp.now(),
      },
    });

    return res.status(200).send("OK");
  } catch (err) {
    console.error("MP WEBHOOK ERROR:", err);
    return res.status(500).send("Webhook error");
  }
}
