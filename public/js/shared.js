// shared.js
// ==========================================
// 🔥 FIREBASE HELPERS
// ==========================================
import { auth, db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

class FirebaseHelpers {
  // Obtener comercio actual
  static async getComercioData(comercioId = null) {
    try {
      if (!comercioId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No hay usuario autenticado");

        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (!userDoc.exists()) throw new Error("Usuario no encontrado");

        comercioId = userDoc.data()?.comercioId;
        if (!comercioId)
          throw new Error("El usuario no tiene comercio asignado");
      }

      const comercioDoc = await getDoc(doc(db, "comercios", comercioId));
      if (!comercioDoc.exists()) throw new Error("Comercio no encontrado");

      return { comercioId, ...comercioDoc.data() };
    } catch (error) {
      console.error("Error obteniendo datos comercio:", error);
      throw error;
    }
  }

  // Actualizar datos del comercio
  static async updateComercioData(data, comercioId = null) {
    try {
      if (!comercioId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No hay usuario autenticado");

        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (!userDoc.exists()) throw new Error("Usuario no encontrado");

        comercioId = userDoc.data()?.comercioId;
        if (!comercioId)
          throw new Error("El usuario no tiene comercio asignado");
      }

      await updateDoc(doc(db, "comercios", comercioId), {
        ...data,
        fechaActualizacion: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error actualizando comercio:", error);
      throw error;
    }
  }

  // Obtener productos de un comercio
  static async getProducts(comercioId = null) {
    try {
      if (!comercioId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No hay usuario autenticado");
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        comercioId = userDoc.data()?.comercioId;
        if (!comercioId)
          throw new Error("El usuario no tiene comercio asignado");
      }

      const productosRef = collection(db, "comercios", comercioId, "productos");
      const snapshot = await getDocs(productosRef);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error obteniendo productos:", error);
      throw error;
    }
  }

  // Agregar producto
  static async addProduct(productData, comercioId = null) {
    try {
      if (!comercioId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No hay usuario no autenticado");
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        comercioId = userDoc.data()?.comercioId;
        if (!comercioId)
          throw new Error("El usuario no tiene comercio asignado");
      }

      const productosRef = collection(db, "comercios", comercioId, "productos");
      const docRef = await addDoc(productosRef, {
        ...productData,
        fechaCreacion: new Date(),
      });

      return docRef.id;
    } catch (error) {
      console.error("Error agregando producto:", error);
      throw error;
    }
  }

  // Actualizar producto
  static async updateProduct(productId, productData, comercioId = null) {
    try {
      if (!comercioId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No hay usuario no autenticado");
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        comercioId = userDoc.data()?.comercioId;
        if (!comercioId)
          throw new Error("El usuario no tiene comercio asignado");
      }

      await updateDoc(doc(db, "comercios", comercioId, "productos", productId), {
        ...productData,
        fechaActualizacion: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error actualizando producto:", error);
      throw error;
    }
  }

  // Eliminar producto
  static async deleteProduct(productId, comercioId = null) {
    try {
      if (!comercioId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No hay usuario no autenticado");
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        comercioId = userDoc.data()?.comercioId;
        if (!comercioId)
          throw new Error("El usuario no tiene comercio asignado");
      }

      await deleteDoc(doc(db, "comercios", comercioId, "productos", productId));
      return true;
    } catch (error) {
      console.error("Error eliminando producto:", error);
      throw error;
    }
  }

  // Sincronizar JSON con API (ej: Supabase/Gist)
  static async syncToGist(comercioId = null) {
    try {
      if (!comercioId) {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        comercioId = userDoc.data()?.comercioId;
      }

      const response = await fetch("/api/export-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comercioId }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const result = await response.json();
      console.log("✅ JSON sincronizado:", result.gist?.rawUrl);
      return result;
    } catch (error) {
      console.error("❌ Error sincronizando JSON:", error);
      throw error;
    }
  }

  // Generar JSON del comercio
  static async generateCommerceJSON(comercioId = null) {
    try {
      const comercioData = await this.getComercioData(comercioId);
      const productos = await this.getProducts(comercioData.comercioId);

      const finalJSON = {
        comercio: {
          comercioId: comercioData.comercioId,
          referralId: comercioData.referralId || comercioData.comercioId,
          nombre: comercioData.nombreComercio || "",
          direccion: comercioData.direccion || "",
          telefono: comercioData.telefono || "",
          horarios: comercioData.horarios || [],
          descripcion: comercioData.descripcion || "",
          ciudad: comercioData.ciudad || "",
          provincia: comercioData.provincia || "",
          pais: comercioData.pais || "",
          barrio: comercioData.barrio || "",
          plan: comercioData.plan || "basico",
          estado: comercioData.estado || "trial",
          mediosPago: comercioData.paymentMethods || [],
          asistente_ia: {
            nombre: comercioData.aiName || "Asistente IA",
            personalidad: comercioData.personalidad || "amigable",
            tono: comercioData.tono || "profesional",
            saludo: comercioData.saludoInicial || "",
            entidad:
              comercioData.entidad ||
              `Actúa como ${comercioData.aiName || "Asistente IA"}...`,
          },
        },
        productos: productos.map((p) => ({
          nombre: p.nombre || "",
          codigo: p.codigo || "",
          precio: p.precio || { valor: 0, moneda: "ARS" },
          stock: p.stock || null,
          talle: p.talle || "",
          color: p.color || "",
          categoria: p.categoria || "",
          activo: p.activo !== false,
        })),
        lastUpdated: new Date().toISOString(),
        version: "1.0",
      };

      return finalJSON;
    } catch (error) {
      console.error("Error generando JSON comercio:", error);
      throw error;
    }
  }

  // Actualizar datos del usuario
  static async updateUserData(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuario no autenticado");
    await setDoc(doc(db, "usuarios", user.uid), data, { merge: true });
  }

  // Obtener documento de usuario por UID
  static async getUserDoc(uid) {
    const docRef = doc(db, "usuarios", uid);
    return await getDoc(docRef);
  }
}

// ==========================================
// 🎯 INITIALIZATION
// ==========================================
class AppInit {
  static async initSharedData() {
    try {
      if (!auth.currentUser) return null;

      const user = auth.currentUser;
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const userData = userDoc.data();

      if (!userData.comercioId) {
        const comercioId = Utils.generateComercioId();
        const referralId = comercioId;

        await setDoc(doc(db, "comercios", comercioId), {
          nombreComercio: "",
          descripcion: "",
          direccion: "",
          ciudad: "",
          pais: "",
          telefono: "",
          whatsapp: "",
          plan: "basico",
          estado: "trial",
          productos: [],
        });

        await FirebaseHelpers.updateUserData({ comercioId, referralId });
        userData.comercioId = comercioId;
        userData.referralId = referralId;
      }

      LocalData.updateSharedData({
        comercioId: userData.comercioId,
        referralId: userData.referralId,
        planId: userData.plan || "basico",
        trialEndDate: userData.trialEndDate || PlansManager.calculateTrialEnd(),
        subscriptionStatus: userData.estado || "trial",
        userData: userData,
      });

      return userData;
    } catch (error) {
      console.error("Error inicializando datos compartidos:", error);
      return null;
    }
  }
}

export { FirebaseHelpers, AppInit };

