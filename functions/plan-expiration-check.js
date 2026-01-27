// functions/plan-expiration-check.js

import { db } from "../src/firebase.js";
import {
  collection,
  getDocs,
  Timestamp
} from "firebase/firestore";

import { applyPlanStateChange } from "../src/lib/plan/applyPlanStateChange.js";

export async function checkExpiredPlans() {
  const now = Timestamp.now();
  const snapshot = await getDocs(collection(db, "comercios"));

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const plan = data.plan;

    if (!plan) continue;
    if (!plan.active) continue;
    if (!plan.expiresAt) continue;

    // ⏱️ Aún no venció
    if (plan.expiresAt.toMillis() > now.toMillis()) continue;

    // 🔥 PLAN VENCIDO → delegamos TODO
    await applyPlanStateChange({
      comercioId: docSnap.id,
      type: plan.type,
      active: false,
      trial: plan.trial,
      startedAt: plan.startedAt,
      expiresAt: plan.expiresAt,
      source: "system",
      reason: plan.trial ? "trial_expired" : "plan_expired"
    });
  }
}
