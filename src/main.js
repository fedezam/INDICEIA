// src/main.js
// ==========================
// 📦 IMPORTS
// ==========================
import './styles.css';
import { auth, db } from './firebase.js';
import './auth.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { runFlowController } from './controllers/flowController.js';

console.log('Main JS cargado ✅');

// ==========================
// 🔄 Detectar sesión activa y guardar datos
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('Usuario autenticado:', user.email);
    
    // Guardar datos en Firestore si es usuario nuevo
    try {
      const userRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        const email = user.email || "";
        const fullName = (user.displayName || email.split("@")[0]).trim();
        const parts = fullName.split(/\s+/);
        
        const nombre = parts[0] || "";
        const apellido = parts.slice(1).join(" ") || "";
        
        console.log("💾 Guardando usuario nuevo:", { nombre, apellido, email });
        
        await setDoc(userRef, {
          uid: user.uid,
          mail: email,
          nombre: nombre,
          apellido: apellido,
          referralId: Math.random().toString(36).substring(2, 10).toUpperCase(),
          fechaRegistro: serverTimestamp()
        });
        
        console.log("✅ Usuario guardado en Firestore");
      }
    } catch (error) {
      console.error("❌ Error al guardar usuario:", error);
    }
    
    // ✅ REDIRECCIÓN CON FLOW CONTROLLER
    console.log('Login detectado - ejecutando flow controller...');
    runFlowController(user.uid);
    }
  } else {
    console.log('No hay usuario logueado');
    const isProtectedPage = window.location.pathname.includes('/pages/');
    
    if (isProtectedPage) {
      console.log('Acceso denegado, redirigiendo a login...');
      window.location.href = '/';
    }
  }
});

// ==========================
// 🔑 Función de logout global
// ==========================
export async function logout() {
  try {
    await auth.signOut();
    console.log('Usuario desconectado ✅');
    window.location.href = '/';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    alert('Error al cerrar sesión: ' + error.message);
  }
}

// Hacer logout accesible globalmente desde HTML
window.logout = logout;
