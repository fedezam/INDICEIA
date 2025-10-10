// src/shared/exportJSON.js
import { getDoc, doc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { db } from "../firebase.js";

export async function generateCommerceJSON(usuarioId) {
  try {
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

    const productosColRef = collection(db, "usuarios", usuarioId, "productos");
    const productosSnap = await getDocs(productosColRef);
    const productos = productosSnap.docs.map(doc => doc.data());

    const tratamientosColRef = collection(db, "usuarios", usuarioId, "tratamientos");
    const tratamientosSnap = await getDocs(tratamientosColRef);
    const tratamientos = tratamientosSnap.docs.map(doc => doc.data());

    const finalJSON = { comercio, productos, tratamientos };

    // Llamada segura al backend para subir el JSON a GitHub Gist
    const response = await fetch('/api/uploadGist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: `comercio_${usuarioId}.json`,
        content: finalJSON,
        description: `Export JSON comercio ${usuarioId}`,
        publicGist: false
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ JSON subido correctamente a Gist:", data.url);
      return data.url; // Podés guardar o mostrar esta URL
    } else {
      console.error("❌ Error subiendo Gist:", data.error);
      return null;
    }

  } catch (err) {
    console.error("Error generando JSON:", err);
    return null;
  }
}

