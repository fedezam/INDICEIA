// ==========================
// 📦 IMPORTS
// ==========================
import './styles.css';
import { auth, db } from './firebase.js';
import './auth.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

console.log('Main JS cargado ✅');

// ==========================
// 🔄 Detectar sesión activa y guardar datos
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('Usuario autenticado:', user.email);

    // ✅ GUARDAR DATOS EN FIRESTORE SI ES USUARIO NUEVO
    try {
      const userRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        // Extraer nombre y apellido
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
      } else {
        console.log("👤 Usuario existente en la base de datos");
      }
    } catch (error) {
      console.error("❌ Error al guardar usuario:", error);
    }

    // Redirigir solo si estamos en la página de login
    const isLoginPage = window.location.pathname === '/' || 
                        window.location.pathname.endsWith('index.html');
    if (isLoginPage) {
      console.log('Redirigiendo a panel de usuario...');
      window.location.href = '/src/pages/usuario.html';
    }
  } else {
    console.log('No hay usuario logueado');
    // Redirigir a login si intenta acceder a páginas protegidas
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
