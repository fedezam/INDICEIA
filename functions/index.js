import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { checkExpiredPlans } from "./plan-expiration-check.js";

// ===============================
// CRON: chequeo de expiración de planes
// ===============================
// Se ejecuta 1 vez por día
// Costo: $0 (free tier)
// ===============================
export const planExpirationDailyCheck = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  async () => {
    console.log("🔍 Running daily plan expiration check");
    await checkExpiredPlans();
  }
);

