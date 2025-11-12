import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit as fsLimit,
  Timestamp,
} from "firebase/firestore";
import crypto from "crypto";

const db = getFirestore();

/**
 * Sistema de Analytics para ÍndiceIA
 * Registra interacciones de links y genera métricas por comercio.
 */
export class LinkAnalytics {
  /**
   * Registrar un evento de interacción
   */
  static async logInteraction(data) {
    try {
      const analyticsRef = collection(db, "link_analytics");

      // Hash simple del user agent para anonimizar
      const deviceSignature = data.user_agent
        ? crypto.createHash("sha256").update(data.user_agent).digest("hex")
        : "unknown";

      await addDoc(analyticsRef, {
        comercio_id: data.comercio_id,
        variant: data.variant || "default",
        format: data.format || "redirect",
        timestamp: Timestamp.now(),

        // Datos del usuario (anonimizados)
        device_type: this.detectDevice(data.user_agent),
        device_signature: deviceSignature,
        referrer: data.referrer || "direct",
        location: data.location || null,
        country_code: data.country_code || null, // opcional

        // Tipo de interacción
        interaction_type: data.interaction_type || "page_view",
        session_id: data.session_id || null,
      });

      return { success: true };
    } catch (error) {
      console.error("Analytics logging error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener estadísticas de un comercio (últimos N días)
   */
  static async getComercioStats(comercio_id, days = 30, resultLimit = 1000) {
    try {
      const analyticsRef = collection(db, "link_analytics");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const q = query(
        analyticsRef,
        where("comercio_id", "==", comercio_id),
        where("timestamp", ">=", Timestamp.fromDate(cutoffDate)),
        orderBy("timestamp", "desc"),
        fsLimit(resultLimit)
      );

      const snapshot = await getDocs(q);

      const stats = {
        total_interactions: snapshot.size,
        by_device: { mobile: 0, desktop: 0, tablet: 0, unknown: 0 },
        by_variant: {},
        by_interaction_type: {},
        by_day: {},
      };

      snapshot.forEach((doc) => {
        const data = doc.data();
        stats.by_device[data.device_type] =
          (stats.by_device[data.device_type] || 0) + 1;
        stats.by_variant[data.variant] =
          (stats.by_variant[data.variant] || 0) + 1;
        stats.by_interaction_type[data.interaction_type] =
          (stats.by_interaction_type[data.interaction_type] || 0) + 1;

        const dateKey = data.timestamp.toDate().toISOString().split("T")[0];
        stats.by_day[dateKey] = (stats.by_day[dateKey] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  }

  /**
   * Top comercios por interacciones
   */
  static async getTopComercios(limit = 10, days = 30) {
    try {
      const analyticsRef = collection(db, "link_analytics");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const q = query(
        analyticsRef,
        where("timestamp", ">=", Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(q);
      const comercioCounts = {};

      snapshot.forEach((doc) => {
        const id = doc.data().comercio_id;
        comercioCounts[id] = (comercioCounts[id] || 0) + 1;
      });

      const sorted = Object.entries(comercioCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([comercio_id, interactions]) => ({ comercio_id, interactions }));

      return sorted;
    } catch (error) {
      console.error("Error fetching top comercios:", error);
      throw error;
    }
  }

  /**
   * Detectar tipo de dispositivo
   */
  static detectDevice(uaString) {
    if (!uaString) return "unknown";
    const ua = uaString.toLowerCase();

    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua))
      return "mobile";
    if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
    if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
    return "unknown";
  }

  /**
   * Endpoint: GET /api/analytics/[comercio_id]
   */
  static async statsEndpoint(req, res) {
    const { comercio_id } = req.query;
    const days = parseInt(req.query.days) || 30;

    try {
      const stats = await this.getComercioStats(comercio_id, days);
      res.status(200).json({ success: true, comercio_id, period_days: days, stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Endpoint: GET /api/analytics/top
   */
  static async topComerciosEndpoint(req, res) {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 30;

    try {
      const top = await this.getTopComercios(limit, days);
      res.status(200).json({ success: true, period_days: days, limit, top_comercios: top });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default LinkAnalytics;
