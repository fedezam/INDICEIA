// src/shared/exportJSON.js
import { getDoc, doc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { db } from "./firebase.js"; // tu inicialización de Firebase

// Opcional: para subir a GitHub Gist
// import fetch from "node-fetch";

export async function generateCommerceJSON(usuarioId) {
  try {
    // 1️⃣ Traer datos del comercio
    const userDocRef = doc(db, "usuarios", usuarioId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) throw new Error("Usuario no encontrado");

    const userData = userSnap.data();
    const comercio = {
      nombre: userData.nombreComercio || "",
      direccion: userData.direccion || "",
      telefono: userData.telefono || "",
      horarios: userData.horarios || [],
      descripcion: userData.descripcion || "",
      ciudad: userData.ciudad || "",
      pais: userData.pais || "",
      plan: userData.plan || "",
      estado: userData.estado || "trial",
      mediosPago: userData.paymentMethods || [],
      asistente_ia: {
        nombre: userData.aiName || "Asistente IA",
        entidad: userData.entidad || `Actúa como ${userData.aiName || "Asistente IA"}...`
      }
    };

    // 2️⃣ Traer productos
    const productosColRef = collection(db, "usuarios", usuarioId, "productos");
    const productosSnap = await getDocs(productosColRef);
    const productos = productosSnap.docs.map(doc => {
      const p = doc.data();
      return {
        nombre: p.nombre || "",
        codigo: p.codigo || "",
        precio: p.precio || { valor: 0, moneda: "ARS" },
        stock: p.stock || null,
        talle: p.talle || "",
        color: p.color || "",
        categoria: p.categoria || ""
      };
    });

    // 3️⃣ Traer tratamientos/servicios si existieran
    const tratamientosColRef = collection(db, "usuarios", usuarioId, "tratamientos");
    const tratamientosSnap = await getDocs(tratamientosColRef);
    const tratamientos = tratamientosSnap.docs.map(doc => doc.data());

    // 4️⃣ Armar JSON completo
    const finalJSON = {
      comercio,
      productos,
      tratamientos
    };

    // 5️⃣ Opcional: convertir a string y guardarlo en un archivo local o subir a Gist
    // const jsonString = JSON.stringify(finalJSON, null, 2);
    // fs.writeFileSync(`./exportedJSON_${usuarioId}.json`, jsonString);

    return finalJSON;

  } catch (err) {
    console.error("Error generando JSON:", err);
    return null;
  }
}
