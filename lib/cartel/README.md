# 📦 Módulo Cartel

Este módulo se encarga de **envolver un QR existente** dentro de un cartel
listo para imprimir, compartir o exportar.

## ❌ Lo que NO hace
- No genera QR
- No accede a Firestore
- No conoce slugs ni landings
- No decide links ni CTAs

## ✅ Lo que SÍ hace
- Define textos e instrucciones del cartel
- Define layouts visuales
- Renderiza HTML final de cartel

---

## 📁 Archivos

### `cartel.config.js`
Contiene todos los textos:
- títulos
- instrucciones
- footer
- copy editable

👉 Cambiar textos **no rompe nada**.

---

### `cartel.templates.js`
Define cómo se ve el cartel:
- layout
- estilos
- estructura

👉 Se pueden agregar múltiples templates (A4, sticker, compacto).

---

### `cartel.renderer.js`
Función principal:

```js
renderCartel({
  comercioNombre,
  qrSvg,
  template
})
