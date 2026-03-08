import { hasData } from '../utils/hasData.js'

/**
 * Builder canónico de goods
 * Produce estructura universal consumida por templates.
 */

export async function buildGoods(comercioRef, context) {

  try {

    const snapshot = await comercioRef.collection('productos').get()

    if (snapshot.empty) {
      return { goods: [] }
    }

    const goods = snapshot.docs
      .map(doc => {

        const p = doc.data()

        if (p.paused === true) return null

        // compatibilidad imagen legacy
        const imagen =
          p.imagen ||
          p.atributos?.url_imagen ||
          null

        const item = {

          id: doc.id,
          nombre: p.nombre,

          ...(hasData(p.descripcion) && {
            descripcion: p.descripcion
          }),

          ...(hasData(p.categoria) && {
            categoria: p.categoria
          }),

          ...(hasData(p.subcategoria) && {
            subcategoria: p.subcategoria
          }),

          ...(hasData(p.marca) && {
            marca: p.marca
          }),

          ...(hasData(imagen) && {
            imagen
          }),

          ...(hasData(p.stock) && {
            stock: p.stock
          }),

          ...(hasData(p.disponibilidad) && {
            disponibilidad: p.disponibilidad
          }),

          ...(hasData(p.etiquetas) && {
            etiquetas: p.etiquetas
          })

        }

        /**
         * Variantes (nuevo estándar universal)
         */

        if (Array.isArray(p.variantes) && p.variantes.length > 0) {

          item.variantes = p.variantes.map(v => ({

            id: v.id || v.label,

            label: v.label || v.nombre,

            precio: v.precio

          }))

        }

        /**
         * Producto simple
         */

        else if (hasData(p.precio_final)) {

          item.precio_final = p.precio_final

        }

        return item

      })
      .filter(Boolean)


    return {
      goods
    }

  }

  catch (err) {

    console.warn(
      '⚠️ goods.builder error:',
      err.message
    )

    return { goods: [] }

  }

}
