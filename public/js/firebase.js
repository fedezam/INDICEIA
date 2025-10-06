// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiuby8CpYzd1THEXtrx_e0rTDBppX7DdU",
  authDomain: "indiceia.firebaseapp.com",
  projectId: "indiceia",
  storageBucket: "indiceia.firebasestorage.app",
  messagingSenderId: "838723462130",
  appId: "1:838723462130:web:be8268087c6e2ed448c16b",
  measurementId: "G-YMMMTCT8JR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider };
