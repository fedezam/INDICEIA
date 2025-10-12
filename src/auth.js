// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔍 Debug: mostrar todas las variables de entorno usadas
console.log("📦 Debug Firebase Variables:");
console.log({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "❌ MISSING",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "❌ MISSING",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "❌ MISSING",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "❌ MISSING",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "❌ MISSING",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "❌ MISSING",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "❌ MISSING"
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 🔥 Inicialización con try/catch para capturar errores
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase inicializado correctamente:", app.name);
} catch (err) {
  console.error("🔥 Error al inicializar Firebase:", err);
}

// 🔑 Auth y Firestore
let auth, db, provider;
try {
  auth = getAuth(app);
  db = getFirestore(app);
  provider = new GoogleAuthProvider();
  console.log("✅ Auth y Firestore listos");
} catch(err) {
  console.error("🔥 Error al inicializar Auth o Firestore:", err);
}

// Exportar para el resto del proyecto
export { app, auth, db, provider };
