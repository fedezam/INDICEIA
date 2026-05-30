import { db, Timestamp } from "./firebaseAdmin.js";
import { applyPlanStateChange } from "../lib/plan/applyPlanStateChange.js";

export async function checkExpiredPlans() {
  console.log("⏱️ checkExpiredPlans running");

  const now      = Timestamp.now();
  const snapshot = await db.collection("entidades").get();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const plan = data.plan;

    if (!plan?.active)     continue;
    if (!plan?.expires_at) continue;
    if (plan.expires_at.toMillis() > now.toMillis()) continue;

    console.log(`⏰ Plan vencido: ${docSnap.id}`);

    await applyPlanStateChange({
      comercioId: docSnap.id,
      type:       plan.type,
      active:     false,
      trial:      plan.trial ?? false,
      startedAt:  plan.started_at,
      expiresAt:  plan.expires_at,
      source:     "system",
      reason:     plan.trial ? "trial_expired" : "plan_expired",
    });
  }
}
