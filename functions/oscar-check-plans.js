import { db } from "../src/firebase.js";
import {
  collection,
  getDocs,
  Timestamp
} from "firebase/firestore";

import { applyPlanStateChange } from "../src/lib/plan/applyPlanStateChange.js";

export async function oscarCheckPlans() {
  const now = Timestamp.now();
  const snapshot = await getDocs(collection(db, "comercios"));

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const plan = data.plan;

    if (!plan || !plan.active) continue;
    if (!plan.expires_at) continue;

    if (plan.expires_at.toMillis() <= now.toMillis()) {
      await applyPlanStateChange({
        comercioId: docSnap.id,
        type: plan.type,
        active: false,
        trial: false,
        startedAt: plan.started_at,
        expiresAt: plan.expires_at,
        source: "system",
        reason: plan.trial ? "trial_expired" : "plan_expired"
      });
    }
  }
}
