import { hasData } from '../utils/hasData.js';

/**
 * Construye el bloque goods según goods.schema.json.
 * Produce { goods: [] } — estructura canónica consumida por templates visuales.
 */
export async function buildGoods(comercioRef, context) {
  try {
    const snapshot = await comercioRef.collection('productos').get();
    if (snapshot.empty) return null;

    const items = snapshot.docs
      .filter(doc => !doc.data().paused)
      .map(doc => {
        const p = doc.data();

        return {
          id:           doc.id,
          nombre:       p.nombre,
          precio_final: p.precio_final,
          ...(hasData(p.codigo)         && { codigo: p.codigo }),
          ...(hasData(p.descripcion)    && { descripcion: p.descripcion }),
          ...(hasData(p.categoria)      && { categoria: p.categoria }),
          ...(hasData(p.subcategoria)   && { subcategoria: p.subcategoria }),
          ...(hasData(p.marca)          && { marca: p.marca }),
          ...(hasData(p.stock)          && { stock: p.stock }),
          ...(hasData(p.disponibilidad) && { disponibilidad: p.disponibilidad }),
          ...(hasData(p.etiquetas)      && { etiquetas: p.etiquetas }),
          ...(hasData(p.variantes)      && { variantes: p.variantes }),
        };
      });

    if (!items.length) return null;

    return { goods: items };

  } catch (err) {
    console.warn('⚠️ No se pudieron cargar productos:', err.message);
    return null;
  }
}
