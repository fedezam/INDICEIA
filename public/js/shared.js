// shared.js - Funciones comunes y helpers centralizados
import { auth, db, provider } from "./firebase.js";
import { 
  doc, setDoc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ==========================================
// 🔧 UTILS CLASE
// ==========================================
class Utils {
  // Mostrar modal con formulario
  static showForm(title, fields, onSubmit) {
    const container = document.createElement("div");
    container.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const form = document.createElement("form");
    form.className =
      "bg-white shadow-lg rounded-xl w-11/12 sm:w-full max-w-md p-6 flex flex-col space-y-4 animate-fade-in relative";

    // Botón cerrar (X)
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.className =
      "absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl";
    closeBtn.onclick = () => document.body.removeChild(container);

    const header = document.createElement("h2");
    header.textContent = title;
    header.className =
      "text-xl font-semibold text-center mb-2 text-gray-700";

    form.appendChild(closeBtn);
    form.appendChild(header);

    fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "flex flex-col space-y-1";

      const label = document.createElement("label");
      label.textContent = field.label;
      label.className = "text-sm text-gray-600 font-medium";

      const input = document.createElement("input");
      input.type = field.type || "text";
      input.placeholder = field.placeholder || "";
      input.className =
        "border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700";

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      form.appendChild(wrapper);
      field.input = input;
    });

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Aceptar";
    button.className =
      "bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition font-medium w-full";

    form.appendChild(button);
    container.appendChild(form);
    document.body.appendChild(container);

    form.onsubmit = (e) => {
      e.preventDefault();
      const values = {};
      fields.forEach((field) => (values[field.name] = field.input.value));
      onSubmit(values);
      document.body.removeChild(container);
    };
  }

  // Loading overlay
  static showLoading(message = "Cargando...") {
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const box = document.createElement("div");
    box.className =
      "bg-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 animate-pulse";

    const spinner = document.createElement("div");
    spinner.className =
      "w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin";

    const text = document.createElement("span");
    text.textContent = message;
    text.className = "text-gray-700 font-medium";

    box.appendChild(spinner);
    box.appendChild(text);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    return () => {
      document.body.removeChild(overlay);
    };
  }

  // Toast (notificaciones flotantes)
  static showToast(title, message, type = "info") {
    const colors = {
      success: "bg-green-500",
      error: "bg-red-500",
      warning: "bg-yellow-500",
      info: "bg-blue-500",
    };

    const toast = document.createElement("div");
    toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg fixed top-4 right-4 z-50 animate-fade-in`;

    const strong = document.createElement("strong");
    strong.textContent = title + " ";
    strong.className = "font-semibold";

    const span = document.createElement("span");
    span.textContent = message;

    toast.appendChild(strong);
    toast.appendChild(span);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("opacity-0", "transition");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  // Confirm dialog
  static showConfirm(message, onConfirm) {
    const container = document.createElement("div");
    container.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const box = document.createElement("div");
    box.className =
      "bg-white p-6 rounded-xl shadow-lg max-w-sm w-full text-center";

    const text = document.createElement("p");
    text.textContent = message;
    text.className = "mb-4 text-gray-700";

    const btnYes = document.createElement("button");
    btnYes.textContent = "Aceptar";
    btnYes.className =
      "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-2";

    const btnNo = document.createElement("button");
    btnNo.textContent = "Cancelar";
    btnNo.className =
      "bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg";

    box.appendChild(text);
    box.appendChild(btnYes);
    box.appendChild(btnNo);
    container.appendChild(box);
    document.body.appendChild(container);

    btnYes.onclick = () => {
      onConfirm();
      document.body.removeChild(container);
    };
    btnNo.onclick = () => document.body.removeChild(container);
  }
}

// ==========================================
// 🔥 FIREBASE HELPERS
// ==========================================
class FirebaseHelpers {
  static async getUserData(uid) {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  static async updateUserData(userData) {
    if (!auth.currentUser) return;
    const ref = doc(db, "users", auth.currentUser.uid);
    await setDoc(ref, userData, { merge: true });
  }

  static async getCollection(collName) {
    const snap = await getDocs(collection(db, collName));
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async addToCollection(collName, data) {
    return await addDoc(collection(db, collName), data);
  }

  static async updateDocById(collName, id, data) {
    const ref = doc(db, collName, id);
    return await updateDoc(ref, data);
  }

  static async deleteDocById(collName, id) {
    const ref = doc(db, collName, id);
    return await deleteDoc(ref);
  }
}

// ==========================================
// 💾 LOCAL STORAGE HELPERS
// ==========================================
class LocalData {
  static getSharedData() {
    const data = localStorage.getItem("indiceia_shared");
    return data ? JSON.parse(data) : {};
  }

  static updateSharedData(newData) {
    const current = LocalData.getSharedData();
    const updated = { ...current, ...newData };
    localStorage.setItem("indiceia_shared", JSON.stringify(updated));
  }

  static clearSharedData() {
    localStorage.removeItem("indiceia_shared");
  }
}

export { Utils, FirebaseHelpers, LocalData };
