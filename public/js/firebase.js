// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7Ny3pE6zaaQbfvEJqRMcZ98W6LSfJTgo",
  authDomain: "indiceia-e2d42.firebaseapp.com",
  projectId: "indiceia-e2d42",
  storageBucket: "indiceia-e2d42.firebasestorage.app",
  messagingSenderId: "630890658793",
  appId: "1:630890658793:web:98b9a9084c308f80926978",
  measurementId: "G-NTG5LD5YNP",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider };
