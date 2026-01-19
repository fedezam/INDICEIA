# 📦 Módulo Cartel

Este módulo se encarga de **envolver un QR existente** dentro de un cartel listo para imprimir, compartir o exportar.

Cartel es el sistema visual de presentación pública de entidades ÍndiceIA.

---

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

## 📁 Estructura de archivos

### `index.js`
Punto de entrada del módulo. Es el único archivo que deben importar las páginas.

### `cartel.config.js`
Normaliza y valida datos de entrada. Contiene todos los textos:
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

Registro de templates visuales disponibles.

---

### `cartel.renderer.js`
Renderiza el cartel en el DOM sin lógica de negocio.

Función principal:
```js
renderCartel({
  comercioNombre,
  qrSvg,
  template
})
```

---

## 💡 Uso básico
```js
import { initCartel } from "../lib/cartel/index.js"

initCartel({
  containerId: "cartel",
  data: comercio,
  template: "default"
})
```

---

## 🎯 Puntos clave

- Módulo desacoplado de la lógica de negocio
- Templates intercambiables
- Textos configurables sin código
- Solo renderiza, no decide
