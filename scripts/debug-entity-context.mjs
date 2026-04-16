// scripts/debug-entity-context.js
import { buildEntityContext } from '../src/shared/entity-context.js';

// Simulá los datos de tu comercio de prueba
const testData = {
  categories: ["Pizzería", "minutas", "rotiseria"],
  ciudad: {  // formato legacy para probar compatibilidad
    id: "82014050",
    nombre: "Casilda",
    lat: -33.0446976480953,
    lng: -61.1642010904025
  },
  provincia: "Santa Fe"
};

const result = buildEntityContext(testData);
console.log('✅ buildEntityContext result:');
console.log(JSON.stringify(result, null, 2));