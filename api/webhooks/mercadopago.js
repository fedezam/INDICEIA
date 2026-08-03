// /api/webhooks/mercadopago.js
//
// ── Nota (01/08/2026) ──────────────────────────────────────────
// Migrado de mercadopago SDK v1 a v2 (v1 quedó deprecada, y npm
// install trajo v2 por default). La API cambió de un objeto global
// configurado con .configure() a instanciar un cliente
// (MercadoPagoConfig) y pasarlo a clases de recurso (Payment,
// Preference, etc).
// ────────────────────────────────────────────────────────────────
//
// ── Nota (01/08/2026) ──────────────────────────────────────────
// Se agregan dos capas de seguridad/consistencia:
//
// 1. VALIDACIÓN DE FIRMA: requiere MP_WEBHOOK_SECRET (Panel MP →
//    Webhooks → Clave secreta). Sin esto, cualquiera podía fabricar
//    un POST con un paymentId ajeno y activar el plan de cualquier
//    comercio.
//
// 2. IDEMPOTENCIA: se chequea plan.last_event_id contra el paymentId
//    ANTES de aplicar el cambio — evita que un reintento de MP
//    regale días de más.
// ────────────────────────────────────────────────────────────────

import crypto from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { applyPlanStateChange } from "../../lib/plan/applyPlanStateChange.js";

// ===============================
// MERCADO PAGO (SDK v2)
// ===============================
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const paymentClient = new Payment(mpClient);

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
// VALIDACIÓN DE FIRMA
// ===============================
function isValidMpSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("MP_WEBHOOK_SECRET no configurado — rechazando webhook por seguridad");
    return false;
  }

  const signatureHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = req.query?.["data.id"];

  if (!signatureHeader || !requestId || !dataId) {
    return false;
  }

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim()];
    })
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const a = Buffer.from(expectedHash, "utf8");
  const b = Buffer.from(receivedHash, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ===============================
// HANDLER
// ===============================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  if (!isValidMpSignature(req)) {
    console.warn("MP WEBHOOK: firma inválida o faltante — request rechazado");
    return res.status(401).send("Invalid signature");
  }

  try {
    const { type, data } = req.body;

    if (type !== "payment") {
      return res.status(200).send("Ignored");
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.status(400).send("Missing payment id");
    }

    // Obtener pago real desde MP (SDK v2)
    const info = await paymentClient.get({ id: paymentId });

    if (info.status !== "approved") {
      return res.status(200).send("Payment not approved");
    }

    const externalRef = info.external_reference;
    if (!externalRef) {
      throw new Error("Missing external_reference");
    }

    const [comercioId, planType] = externalRef.split(":");

    if (!comercioId || !planType) {
      throw new Error("Invalid external_reference format");
    }

    // ── Idempotencia ──
    const comercioRef = db.collection("entidades").doc(comercioId);
    const comercioSnap = await comercioRef.get();
    const alreadyProcessedId = comercioSnap.data()?.plan?.last_event_id;

    if (alreadyProcessedId === String(paymentId)) {
      console.log(`MP WEBHOOK: pago ${paymentId} ya procesado antes — ignorando reintento`);
      return res.status(200).send("Already processed");
    }

    const startedAt = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(
      startedAt.toMillis() + PLAN_DURATION_DAYS * DAY_MS
    );

    await applyPlanStateChange({
      comercioId,
      type: planType,
      active: true,
      trial: false,
      startedAt,
      expiresAt,
      source: "mercadopago",
      reason: "payment_confirmed",
      eventId: String(paymentId),
    });

    return res.status(200).send("OK");
  } catch (err) {
    console.error("MP WEBHOOK ERROR:", err);
    return res.status(500).send("Webhook error");
  }
}