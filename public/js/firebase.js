import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAiuby8CpYzd1THEXtrx_e0rTDBppX7DdU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "indiceia.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "indiceia",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "indiceia.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "838723462130",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:838723462130:web:be8268087c6e2ed448c16b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YMMMTCT8JR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider };
