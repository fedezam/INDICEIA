import { db, Timestamp } from "./firebaseAdmin.js";
import { applyPlanStateChange } from "./lib/plan/applyPlanStateChange.js";
import { crearAlerta } from "./lib/alerts/crearAlerta.js";

const MS_POR_DIA = 1000 * 60 * 60 * 24;
const DIAS_AVISO_PREVIO = 3;

export async function checkExpiredPlans() {
  console.log("⏱️ checkExpiredPlans running");
  const now      = Timestamp.now();
  const hoyISO   = new Date(now.toMillis()).toISOString().slice(0, 10);
  const snapshot = await db.collection("entidades").get();

  for (const docSnap of snapshot.docs) {
    const comercioId = docSnap.id;
    const data = docSnap.data();
    const plan = data.plan;

    if (!plan?.expires_at) continue;

    const msRestantes = plan.expires_at.toMillis() - now.toMillis();

    if (plan.active && msRestantes <= 0) {
      console.log(`⏰ Plan vencido: ${comercioId}`);

      await applyPlanStateChange({
        comercioId,
        type:       plan.type,
        active:     false,
        trial:      plan.trial ?? false,
        startedAt:  plan.started_at,
        expiresAt:  plan.expires_at,
        source:     "system",
        reason:     plan.trial ? "trial_expired" : "plan_expired",
      });

      await crearAlerta({
        id:      `venc_${comercioId}_${hoyISO}`,
        scope:   'individual',
        tipo:    'vencimiento',
        comercioId,
        titulo:  plan.trial ? 'Tu trial venció' : 'Tu plan venció',
        mensaje: plan.trial
          ? 'Tu período de prueba terminó. Reactivalo para recuperar la capacidad plena de respuestas de tu IA.'
          : 'Tu plan venció. Renovalo para recuperar la capacidad plena de respuestas de tu IA.',
        createdBy: 'cron',
      });

      continue;
    }

    if (plan.active && msRestantes > 0) {
      const diasRestantes = Math.ceil(msRestantes / MS_POR_DIA);
      console.log(`📅 ${comercioId}: ${diasRestantes} días restantes`);

      if (diasRestantes <= DIAS_AVISO_PREVIO) {
        await crearAlerta({
          id:      `venc_proximo_${comercioId}_${hoyISO}`,
          scope:   'individual',
          tipo:    'vencimiento_proximo',
          comercioId,
          titulo:  plan.trial ? '⚠️ Tu trial está por vencer' : '⚠️ Tu plan está por vencer',
          mensaje: `Faltan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} para que ${plan.trial ? 'tu trial' : 'tu plan'} venza.`,
          createdBy: 'cron',
        });
      }
    }
  }
}
