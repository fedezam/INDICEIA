import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Config Firebase
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

// Estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// Tabs
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    contents.forEach((c) => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// Productos
const productoForm = document.getElementById("productoForm");
const listaProductos = document.getElementById("listaProductos");

productoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("productoNombre").value;
  const precio = document.getElementById("productoPrecio").value;

  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, "usuarios", user.uid, "productos"), {
    nombre,
    precio,
    creado: new Date(),
  });

  const li = document.createElement("li");
  li.textContent = `${nombre} - $${precio}`;
  listaProductos.appendChild(li);

  productoForm.reset();
});

// Servicios
const servicioForm = document.getElementById("servicioForm");
const listaServicios = document.getElementById("listaServicios");

servicioForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("servicioNombre").value;
  const precio = document.getElementById("servicioPrecio").value;

  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, "usuarios", user.uid, "servicios"), {
    nombre,
    precio,
    creado: new Date(),
  });

  const li = document.createElement("li");
  li.textContent = `${nombre} - $${precio}`;
  listaServicios.appendChild(li);

  servicioForm.reset();
});
