import { hasData } from '../utils/hasData.js';

/**
 * Construye el bloque goods según goods.schema.json.
 * Produce bloque_B_contexto_comercial — estructura que consumen los templates visuales.
 */
export async function buildGoods(comercioRef, context) {
  try {
    const snapshot = await comercioRef.collection('productos').get();
    if (snapshot.empty) return null;

    const items = snapshot.docs
      .filter(doc => !doc.data().paused)   // excluir pausados — el template no los necesita
      .map(doc => {
        const p = doc.data();

        // imagen: campo directo o fallback a atributos.url_imagen (legacy)
        // sanitizar espacios en URL — los espacios rompen el runtime visual
        const imagenRaw = p.imagen || p.atributos?.url_imagen || null;
        const imagen = imagenRaw ? imagenRaw.replace(/ /g, '_') : null;

        return {
          id:           doc.id,
          nombre:       p.nombre,
          precio_final: p.precio_final,
          paused:       p.paused ?? false,
          ...(hasData(p.codigo)         && { codigo: p.codigo }),
          ...(hasData(p.descripcion)    && { descripcion: p.descripcion }),
          ...(hasData(p.categoria)      && { categoria: p.categoria }),
          ...(hasData(p.subcategoria)   && { subcategoria: p.subcategoria }),
          ...(hasData(p.marca)          && { marca: p.marca }),
          ...(hasData(imagen)           && { imagen }),
          ...(hasData(p.stock)          && { stock: p.stock }),
          ...(hasData(p.disponibilidad) && { disponibilidad: p.disponibilidad }),
          ...(hasData(p.etiquetas)      && { etiquetas: p.etiquetas }),
          ...(hasData(p.atributos)      && { atributos: p.atributos }),
        };
      });

    if (!items.length) return null;

    // Categorías derivadas de los items — únicas, en orden de aparición
    // Garantiza que los tabs del template tengan items reales
    const categorias = [...new Set(
      items.map(i => i.categoria).filter(Boolean)
    )];

    return {
      bloque_B_contexto_comercial: {
        identity: {
          nombre_comercio: context.nombre || ''
        },
        contacto: {
          ...(hasData(context.contacto?.whatsapp) && { whatsapp_number: context.contacto.whatsapp })
        },
        catalogo: {
          categorias,
          items
        }
      }
    };

  } catch (err) {
    console.warn('⚠️ No se pudieron cargar productos:', err.message);
    return null;
  }
}
