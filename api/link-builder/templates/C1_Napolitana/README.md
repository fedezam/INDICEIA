# C1_Napolitana - Template de Menú Simple

## 📋 Descripción

Template visual optimizado para negocios de comida con catálogo simple: **1 producto = 1 imagen**.

Perfecto para pizzerías, restaurantes, cafeterías, bares, panaderías donde los productos son claros y no necesitan múltiples fotos.

---

## ✨ Características

- ✅ **Categorías dinámicas**: Se generan automáticamente desde `bloque_B.catalogo.categorias`
- ✅ **Carrito funcional**: Agregar, remover, calcular totales
- ✅ **WhatsApp checkout**: Genera mensaje formateado con el pedido
- ✅ **Múltiples tamaños**: Soporta `precio_mediana` y `precio_grande` (opcional)
- ✅ **Responsive 100%**: Mobile-first, se adapta a tablet y desktop
- ✅ **Animaciones suaves**: Toast notifications, bounce en carrito
- ✅ **Sin datos hardcodeados**: Todo dinámico desde Bloque B

---

## 📦 Estructura de Datos Requerida

```json
{
  "bloque_B_contexto_comercial": {
    "identity": {
      "nombre_comercio": "La Napolitana"
    },
    "contacto": {
      "whatsapp_number": "5493412295316"
    },
    "catalogo": {
      "categorias": ["Pizzas", "Extras", "Bebidas"],
      "items": [
        {
          "id": "P01",
          "nombre": "Margarita Clásica",
          "categoria": "Pizzas",
          "image_url": "https://...",
          "precio_mediana": 8500,
          "precio_grande": 10500
        },
        {
          "id": "E01",
          "nombre": "Borde relleno",
          "categoria": "Extras",
          "image_url": "https://...",
          "precio": 1500
        }
      ]
    }
  }
}
```

---

## 🎨 Diseño Visual

### Paleta de Colores
- **Primary**: Slate 800 (header, badges)
- **Accent**: Amber 600 (precios, botones)
- **Background**: Gradient slate-gray
- **Cards**: White con shadow

### Tipografía
- Header: `text-sm` (14px)
- Product titles: `text-sm` (14px)
- Prices: `text-sm` (14px)
- Buttons: `text-xs` (12px)

### Espaciado
- Grid gap: `gap-2`
- Card padding: `p-2`
- Compact header: `px-3 py-1.5`

---

## 🔧 Uso con Claude

```javascript
// Claude genera el artifact así:
<artifact type="application/vnd.ant.react">
import C1_Napolitana from './templates/C1_Napolitana/component.jsx';

// Pasar entityData con Bloque B
<C1_Napolitana entityData={entityDataFromBloqueB} />
</artifact>
```

---

## 📱 Responsive Breakpoints

- **Mobile**: `grid-cols-1` (1 columna)
- **Tablet**: `md:grid-cols-2` (2 columnas)
- **Desktop**: `lg:grid-cols-3` (3 columnas)

---

## 🚀 Features Pro

### Carrito Inteligente
- IDs únicos por item (`cartId`)
- Soporte para variantes (mediana/grande)
- Cálculo automático de totales
- Animación bounce al agregar

### WhatsApp Integration
- Genera mensaje formateado
- Incluye IDs de productos
- Formato limpio y profesional
- Opens WhatsApp Web o app

### Toast Notifications
- Posición fija top-center
- Auto-dismiss en 2s
- Diseño compacto

---

## 🎯 Casos de Uso Ideales

| Negocio | Por qué funciona |
|---------|------------------|
| Pizzería | Múltiples tamaños, categorías claras |
| Restaurante | Menú organizado por tipo de plato |
| Cafetería | Bebidas, snacks, tortas |
| Panadería | Pan, facturas, tortas |
| Bar | Tragos, cervezas, picadas |
| Heladería | Sabores, potes, conos |

---

## ⚠️ Limitaciones

- Solo 1 imagen por producto
- No soporta variantes complejas (ej: toppings personalizables)
- WhatsApp debe estar configurado en Bloque B
- Sin sistema de filtros avanzados
- Sin búsqueda de productos

---

## 🔄 Changelog

### v1.0.0 (2025-11-12)
- ✅ Release inicial
- ✅ Categorías dinámicas
- ✅ Carrito funcional
- ✅ WhatsApp checkout
- ✅ Responsive completo

---

## 📞 Soporte

Para modificaciones o bugs: contacto@indiceia.com
