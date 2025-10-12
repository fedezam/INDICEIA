// ===== Login Google — crear doc con nombre completo (fallback desde email) =====
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    console.log("🌐 Abriendo popup Google...");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user) throw new Error("No se obtuvo user desde Google.");

      console.log("✅ Login Google OK:", user.email, user.displayName);

      // referencia al doc
      const userRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userRef);

      // Preparar valores a guardar
      // fullName: preferimos displayName; si no existe, usamos la parte antes de @ del email
      const email = user.email || "";
      const display = (user.displayName || "").trim();
      const fullName = display || (email.split("@")[0] || "");
      
      // Intento de separar nombre/apellido (para conveniencia, pero opcional)
      let nombre = "";
      let apellido = "";
      if (fullName) {
        const parts = fullName.split(/\s+/).filter(Boolean);
        nombre = parts[0] || "";
        apellido = parts.slice(1).join(" ") || "";
      }

      // Si no existe el doc, lo creamos con todos los campos requeridos
      if (!userDoc.exists()) {
        const referralId = Math.random().toString(36).substring(2, 10).toUpperCase();
        await setDoc(userRef, {
          uid: user.uid,
          mail: email,
          nombre: fullName,      // <-- guardamos el "full name" en este campo
          apellido: apellido,    // <-- posible vacío, está bien
          referralId,
          fechaRegistro: serverTimestamp()
        });
        console.log("📄 Nuevo doc creado en usuarios:", user.uid);
      } else {
        // Si ya existe, podemos asegurarnos de que los campos mínimos estén (merge opcional)
        // (no sobrescribimos datos ya guardados por el usuario)
        const existing = userDoc.data() || {};
        const update = {};
        if (!existing.mail) update.mail = email;
        if (!existing.nombre) update.nombre = fullName;
        if (!existing.apellido) update.apellido = apellido;
        if (!existing.uid) update.uid = user.uid;
        if (Object.keys(update).length > 0) {
          await setDoc(userRef, update, { merge: true });
          console.log("🔄 Doc existente actualizado (merge):", Object.keys(update));
        } else {
          console.log("📂 Usuario ya tiene datos mínimos en Firestore");
        }
      }

      // redirigir sin pedir nada más
      window.location.href = "/src/pages/usuario.html";
    } catch (e) {
      console.error("⚠️ Error en login Google:", e);
      alert("Error al iniciar sesión con Google: " + (e.message || e));
    }
  });
}

