/**
 * Mapas estáticos para relaciones de complementariedad y patrones de fallback.
 * Fáciles de tuneear sin tocar lógica.
 */

export const COMPLEMENTARY_BY_TYPE = {
  restaurante: ['heladeria', 'bar', 'cafeteria'],
  cafeteria:   ['panaderia', 'coworking', 'restaurante'],
  veterinaria: ['petshop'],
  farmacia:    ['perfumeria'],
  gimnasio:    ['dietetica'],
};

export const FALLBACK_PATTERNS = [
  'abre-tarde',
  'abre-todos-los-dias',
  'abre-fines-de-semana',
];