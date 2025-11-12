{
  "template_id": "C1_Napolitana",
  "version": "1.0.0",
  "name": "Menú Simple - Napolitana Style",
  "description": "Template para menús con 1 imagen por producto. Ideal para restaurantes, pizzerías, cafeterías.",
  
  "author": {
    "name": "Claude Sonnet 4.5 + Fede Zambrano",
    "date": "2025-11-12"
  },
  
  "visual_specs": {
    "layout_type": "grid",
    "products_per_row": {
      "mobile": 1,
      "tablet": 2,
      "desktop": 3
    },
    "image_aspect_ratio": "16:9",
    "image_height": "h-40",
    "card_style": "rounded-xl shadow-lg",
    "spacing": "gap-2"
  },
  
  "color_palette": {
    "primary": "slate-800",
    "primary_light": "slate-700",
    "accent": "amber-600",
    "accent_hover": "amber-700",
    "background": "slate-50",
    "background_gradient": "from-slate-50 via-gray-50 to-slate-100",
    "toast_bg": "slate-700",
    "card_bg": "white"
  },
  
  "typography": {
    "header_size": "text-sm",
    "tab_size": "text-xs",
    "product_title": "text-sm",
    "price": "text-sm",
    "toast": "text-xs"
  },
  
  "required_data_structure": {
    "bloque_B": {
      "identity": {
        "nombre_comercio": "string (required)"
      },
      "contacto": {
        "whatsapp_number": "string (required, sin espacios ni guiones)"
      },
      "catalogo": {
        "categorias": "array<string> (required, min 1)",
        "items": "array<object> (required)",
        "items_schema": {
          "id": "string (required, unique)",
          "nombre": "string (required)",
          "categoria": "string (required, debe existir en categorias[])",
          "image_url": "string (optional, usa placeholder si falta)",
          "precio": "number (required si no hay precio_mediana/grande)",
          "precio_mediana": "number (optional)",
          "precio_grande": "number (optional)"
        }
      }
    }
  },
  
  "features": {
    "dynamic_tabs": true,
    "multi_category": true,
    "shopping_cart": true,
    "whatsapp_checkout": true,
    "responsive": true,
    "animations": true,
    "toast_notifications": true,
    "multiple_sizes": true,
    "image_fallback": true
  },
  
  "supported_business_types": [
    "pizzería",
    "restaurante",
    "cafetería",
    "bar",
    "panadería",
    "heladería",
    "comida rápida",
    "delivery"
  ],
  
  "pricing_models": {
    "single_price": {
      "supported": true,
      "field": "precio"
    },
    "multi_size": {
      "supported": true,
      "fields": ["precio_mediana", "precio_grande"],
      "labels": ["Mediana", "Grande"]
    }
  },
  
  "mobile_optimized": true,
  "tablet_optimized": true,
  "desktop_optimized": true,
  
  "performance": {
    "lazy_loading": false,
    "image_optimization": "browser_native",
    "bundle_size_kb": "~12"
  },
  
  "accessibility": {
    "keyboard_navigation": true,
    "screen_reader_friendly": true,
    "color_contrast_wcag": "AA"
  },
  
  "customization_options": {
    "colors": "modifiable via Tailwind classes",
    "spacing": "modifiable via Tailwind classes",
    "typography": "modifiable via Tailwind classes",
    "icons": "uses lucide-react (swappable)"
  },
  
  "known_limitations": [
    "Solo soporta 1 imagen por producto",
    "WhatsApp debe estar configurado en bloque B",
    "Categorías deben estar definidas previamente",
    "No soporta variantes de producto complejas"
  ],
  
  "changelog": [
    {
      "version": "1.0.0",
      "date": "2025-11-12",
      "changes": [
        "Release inicial",
        "Soporte para categorías dinámicas",
        "Carrito funcional",
        "Integración WhatsApp",
        "Responsive completo"
      ]
    }
  ],
  
  "next_version_features": [
    "Filtros por tags",
    "Búsqueda de productos",
    "Favoritos",
    "Modo oscuro",
    "Soporte para descuentos visuales"
  ]
}
