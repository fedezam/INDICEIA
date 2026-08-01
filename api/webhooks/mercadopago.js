// /api/webhooks/mercadopago.js
//
// ── Nota (01/08/2026) ──────────────────────────────────────────
// Se agregan dos capas de seguridad/consistencia que faltaban:
//
// 1. VALIDACIÓN DE FIRMA: MercadoPago manda headers x-signature y
//    x-request-id en cada webhook. Sin validarlos, cualquiera que
//    conozca esta URL puede mandar un POST fabricado con
//    {type:"payment", data:{id:"<paymentId real y ajeno>"}} y activar
//    el plan de cualquier comercio, porque el código consultaba la
//    API de MP con ESE id sin verificar que la notificación viniera
//    realmente de MP. La validación de firma cierra ese hueco:
//    requiere el webhook secret (Panel MP → Tu app → Webhooks →
//    "Firma secreta"), guardado en env var MP_WEBHOOK_SECRET.
//
// 2. IDEMPOTENCIA: MP puede reintentar el mismo evento (timeouts,
//    hiccups de red, etc). Como applyPlanStateChange recalculaba
//    expiresAt desde Timestamp.now() en cada corrida, un mismo pago
//    procesado 2 veces regalaba 30 días extra al comercio. Ahora se
//    chequea plan.last_event_id contra el paymentId ANTES de aplicar
//    el cambio — si ya se procesó este pago, se responde 200 sin
//    tocar nada.
// ────────────────────────────────────────────────────────────────

import crypto from "crypto";
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
// VALIDACIÓN DE FIRMA
// ===============================
// Formato del header x-signature: "ts=1730000000,v1=abc123..."
// El manifest a hashear es: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// (data.id en minúsculas, tal como llega en la query string ?data.id=...)
// Doc oficial: MP → Tu aplicación → Webhooks → "Cómo validar el origen".
function isValidMpSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Si no configuraste el secret todavía, no podemos validar.
    // Fail-closed: mejor rechazar que dejar pasar sin control.
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

  // Comparación en tiempo constante para evitar timing attacks
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

  // ── 1. Validar que la notificación viene realmente de MP ──
  if (!isValidMpSignature(req)) {
    console.warn("MP WEBHOOK: firma inválida o faltante — request rechazado");
    return res.status(401).send("Invalid signature");
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

    // ── 2. Idempotencia: si ya procesamos este pago, no hacer nada ──
    const comercioRef = db.collection("entidades").doc(comercioId);
    const comercioSnap = await comercioRef.get();
    const alreadyProcessedId = comercioSnap.data()?.plan?.last_event_id;

    if (alreadyProcessedId === String(paymentId)) {
      console.log(`MP WEBHOOK: pago ${paymentId} ya procesado antes — ignorando reintento`);
      return res.status(200).send("Already processed");
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
      eventId: String(paymentId),
    });

    return res.status(200).send("OK");
  } catch (err) {
    console.error("MP WEBHOOK ERROR:", err);
    return res.status(500).send("Webhook error");
  }
}
