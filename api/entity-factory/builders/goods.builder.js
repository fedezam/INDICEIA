import { hasData } from '../utils/hasData.js';

/**
 * Construye el bloque goods según goods.schema.json.
 * Campos: enabled, moneda, secciones[{ id, titulo, tipo, prioridad, items[] }]
 */
export async function buildGoods(comercioRef, data) {
  try {
    const snapshot = await comercioRef.collection('productos').get();

    if (snapshot.empty) return { enabled: false };

    const items = snapshot.docs.map(doc => {
      const p = doc.data();

      return {
        id:          doc.id,
        nombre:      p.nombre,
        precio_final: p.precio_final,
        paused:      p.paused ?? false,
        ...(hasData(p.codigo)        && { codigo: p.codigo }),
        ...(hasData(p.descripcion)   && { descripcion: p.descripcion }),
        ...(hasData(p.categoria)     && { categoria: p.categoria }),
        ...(hasData(p.subcategoria)  && { subcategoria: p.subcategoria }),
        ...(hasData(p.marca)         && { marca: p.marca }),
        ...(hasData(p.stock)         && { stock: p.stock }),
        ...(hasData(p.disponibilidad)&& { disponibilidad: p.disponibilidad }),
        ...(hasData(p.imagen)        && { imagen: p.imagen }),
        ...(hasData(p.etiquetas)     && { etiquetas: p.etiquetas }),
        ...(hasData(p.atributos)     && { atributos: p.atributos }),
      };
    });

    return {
      enabled: true,
      moneda: data.moneda || 'ARS',
      secciones: [{
        id:       'principal',
        titulo:   data.nombreComercio || 'Catálogo',
        tipo:     'grid',
        prioridad: 1,
        items
      }]
    };

  } catch (err) {
    console.warn('⚠️ No se pudieron cargar productos:', err.message);
    return { enabled: false };
  }
}
