// src/lib/plan/applyPlanStateChange.js

import { db } from "../../firebase.js";
import {
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import { rebuildEntity } from "../entity-factory/rebuildEntity.js";

export async function applyPlanStateChange({
  comercioId,
  type,
  active,
  trial,
  startedAt,
  expiresAt,
  source,
  reason,
  eventId = null
}) {
  if (!comercioId) {
    throw new Error("comercioId requerido");
  }

  const comercioRef = doc(db, "comercios", comercioId);

  const planData = {
    plan: {
      type,
      active,
      trial,
      started_at: startedAt,
      expires_at: expiresAt,
      source,
      reason,
      last_event_id: eventId,
      updated_at: serverTimestamp()
    }
  };

  // 1. escribir DB
  await updateDoc(comercioRef, planData);

  // 2. reconstruir entidad
  await rebuildEntity(comercioId);
}
