// dashboard.js
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ⚙️ Utils
class Utils {
  static showLoading(text = "Cargando...") {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    if (overlay && loadingText) {
      loadingText.textContent = text;
      overlay.classList.add("show");
    }
  }

  static hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("show");
  }

  static showToast(title, message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };

    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="${icons[type]}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => container.removeChild(toast), 300);
    }, 5000);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => container.removeChild(toast), 300);
    });
  }

  static generateReferralId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// ✅ Usuario actual
let currentUserData = null;
async function loadCurrentUser() {
  Utils.showLoading("Cargando usuario...");
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "usuarios", user.uid));
  if (!userDoc.exists()) {
    Utils.showToast("Error", "No se encontró la información del usuario", "error");
    return;
  }

  currentUserData = userDoc.data();
  document.getElementById("userName")?.textContent = currentUserData.nombre || "Usuario";
  document.getElementById("userEmail")?.textContent = currentUserData.email || "";
  document.getElementById("userAvatar")?.textContent = currentUserData.nombre?.[0] || "U";

  Utils.hideLoading();
}

// ✅ Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

// ✅ Tabs
const tabs = document.querySelectorAll(".tab-nav [data-tab]");
const panes = document.querySelectorAll(".tab-pane");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.getAttribute("data-tab");
    if (!target) return;

    panes.forEach((p) => p.classList.remove("active"));
    const pane = document.getElementById(target);
    if (pane) pane.classList.add("active");

    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ✅ Progress
function setProgress(percent) {
  const fill = document.getElementById("completionFill");
  const text = document.getElementById("completionText");
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}% completado`;
}

function calculateProgress() {
  let totalSteps = 4; // Comercio, Horarios, Productos, IA
  let completed = 0;

  if (currentUserData?.nombreComercio) completed++;
  if (document.getElementById("scheduleGrid")?.children.length) completed++;
  if (document.getElementById("productsTableBody")?.children.length) completed++;
  if (!document.getElementById("noAIMessage")?.classList.contains("hidden")) completed++;

  const percent = Math.round((completed / totalSteps) * 100);
  setProgress(percent);
}

// ✅ Comercio Form
const comercioForm = document.getElementById("comercioForm");
comercioForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  Utils.showLoading("Guardando información del comercio...");

  const nombre = document.getElementById("nombreComercio")?.value || "";
  const telefono = document.getElementById("telefono")?.value || "";

  try {
    await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
      nombreComercio: nombre,
      telefono: telefono,
    });
    Utils.showToast("¡Listo!", "Información del comercio guardada", "success");
    calculateProgress();
  } catch (err) {
    Utils.showToast("Error", "No se pudo guardar la información", "error");
  } finally {
    Utils.hideLoading();
  }
});

// ✅ Productos
const productForm = document.getElementById("productForm");
productForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("productName")?.value;
  const precio = document.getElementById("productPrice")?.value;

  if (!nombre || !precio) {
    Utils.showToast("Error", "Completa todos los campos del producto", "error");
    return;
  }

  // Aquí puedes guardar el producto en Firestore dentro de un sub-collection
  const productId = Utils.generateReferralId();
  try {
    await setDoc(doc(db, `usuarios/${auth.currentUser.uid}/productos`, productId), {
      nombre,
      precio: Number(precio),
      fecha: new Date(),
    });
    Utils.showToast("¡Producto agregado!", `${nombre} guardado correctamente`, "success");
    productForm.reset();
    calculateProgress();
    loadProducts();
  } catch (err) {
    Utils.showToast("Error", "No se pudo guardar el producto", "error");
  }
});

async function loadProducts() {
  // Carga productos y genera tabla dinámica
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const productsSnap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
  // Aquí podrías usar collection() y getDocs() si quieres todos los productos
}

// ✅ Horarios
document.getElementById("saveSchedule")?.addEventListener("click", () => {
  Utils.showToast("¡Guardado!", "Horarios actualizados", "success");
  calculateProgress();
});

// ✅ IA
document.getElementById("aiConfigForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const linkDisplay = document.getElementById("aiLinkDisplay");
  const previewSection = document.getElementById("aiPreviewSection");
  const noAI = document.getElementById("noAIMessage");

  if (linkDisplay) linkDisplay.textContent = `https://mi-ia.com/${auth.currentUser.uid}`;
  if (previewSection) previewSection.classList.remove("hidden");
  if (noAI) noAI.classList.add("hidden");

  Utils.showToast("¡IA generada!", "Tu asistente está listo", "success");
  calculateProgress();
});

// ✅ Chat Test
document.getElementById("chatSendBtn")?.addEventListener("click", () => {
  const input = document.getElementById("chatInput");
  const container = document.getElementById("chatContainer");
  if (!input?.value || !container) return;

  const msg = document.createElement("div");
  msg.className = "chat-msg user";
  msg.textContent = input.value;
  container.appendChild(msg);

  const botMsg = document.createElement("div");
  botMsg.className = "chat-msg bot";
  botMsg.textContent = `🤖 Respuesta simulada a "${input.value}"`;
  container.appendChild(botMsg);

  input.value = "";
  container.scrollTop = container.scrollHeight;
});

// ✅ Inicialización
window.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  calculateProgress();
});

