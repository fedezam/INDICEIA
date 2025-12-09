// ========================================
// DEMO C1_Napolitana con datos de ejemplo
// ========================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import C1_Napolitana from '../../../api/entity-factory/templates/C1_Napolitana/component.jsx';

// Datos de ejemplo que simulan el Bloque B
const demoEntityData = {
  bloque_B_contexto_comercial: {
    identity: {
      nombre_comercio: "La Napolitana"
    },
    contacto: {
      whatsapp_number: "5493412295316"
    },
    catalogo: {
      categorias: ["Pizzas", "Empanadas", "Bebidas"],
      items: [
        {
          id: "P01",
          nombre: "Margarita Clásica",
          categoria: "Pizzas",
          image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
          precio_mediana: 8500,
          precio_grande: 10500
        },
        {
          id: "P02",
          nombre: "Napolitana",
          categoria: "Pizzas",
          image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
          precio_mediana: 9000,
          precio_grande: 11000
        },
        {
          id: "P03",
          nombre: "Muzzarella",
          categoria: "Pizzas",
          image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          precio_mediana: 7500,
          precio_grande: 9500
        },
        {
          id: "E01",
          nombre: "Empanada de Carne",
          categoria: "Empanadas",
          image_url: "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop",
          precio: 800
        },
        {
          id: "E02",
          nombre: "Empanada de Jamón y Queso",
          categoria: "Empanadas",
          image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop",
          precio: 750
        },
        {
          id: "B01",
          nombre: "Coca Cola 1.5L",
          categoria: "Bebidas",
          image_url: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop",
          precio: 1500
        },
        {
          id: "B02",
          nombre: "Agua Mineral",
          categoria: "Bebidas",
          image_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop",
          precio: 800
        }
      ]
    }
  }
};

// Renderizar el componente
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <C1_Napolitana entityData={demoEntityData} />
  </React.StrictMode>
);
