// lib/entity-factory/builders/services.builder.js
import { hasData } from '../utils/hasData.js';

export async function buildServices(comercioRef, context) {
  try {
    const snapshot = await comercioRef.collection('servicios').get();
    if (snapshot.empty) return null;

    // 1. Carga y filtrado inicial (solo servicios activos).
    //    `!== false` tolera entidades viejas donde `activo` no existe.
    const docs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(s => s.activo !== false);

    if (!docs.length) return null;

    // 2. Separación jerárquica estricta
    const padres = docs.filter(s => !s.parent_id);
    const hijos  = docs.filter(s =>  s.parent_id);

    // 3. Indexación rápida de hijos por ID de padre
    const hijosPorPadre = {};
    hijos.forEach(h => {
      if (!hijosPorPadre[h.parent_id]) hijosPorPadre[h.parent_id] = [];
      hijosPorPadre[h.parent_id].push(h);
    });

    // 4. Construcción del árbol de servicios
    const servicios = padres.map(s => {
      // Si existen hijos en la DB para este ID, ES un servicio agrupador.
      // Ignoramos s.tipo para evitar errores de sincronización de metadata.
      const childItems  = hijosPorPadre[s.id];
      const esAgrupador = hasData(childItems) && childItems.length > 0;

      // El agrupador NO lleva id: no es elegible por sí solo.
      // El servicio simple SÍ lleva id: es lo que el cliente pide.
      const item = esAgrupador
        ? { n: s.nombre }
        : { id: s.id, n: s.nombre };

      // Campos estándar del padre
      if (hasData(s.descripcion))    item.desc = s.descripcion;
      if (hasData(s.disponibilidad)) item.disp = s.disponibilidad;
      if (hasData(s.semantic_notes)) item.semantic_notes = s.semantic_notes;
      if (hasData(s.notas))          item.notas = s.notas; // Soporte legacy

      if (esAgrupador) {
        // Cada variante es una hoja elegible: lleva su propio id
        item.items = childItems.map(h => {
          const hi = { id: h.id, n: h.nombre };
          if (hasData(h.precio?.valor))  hi.p    = h.precio.valor;
          if (hasData(h.duracion))       hi.dur  = h.duracion;
          if (hasData(h.descripcion))    hi.desc = h.descripcion;
          if (hasData(h.semantic_notes)) hi.semantic_notes = h.semantic_notes;
          if (hasData(h.disponibilidad)) hi.disp = h.disponibilidad;
          return hi;
        });
      } else {
        // Servicio simple: precio y duración van al nivel raíz
        if (hasData(s.precio?.valor)) item.p   = s.precio.valor;
        if (hasData(s.duracion))      item.dur = s.duracion;
      }

      return item;
    });

    if (!servicios.length) return null;

    // 5. Enriquecimiento del perfil (solo para prestadores)
    const perfil = {};
    if (context?.entityType === 'prestador') {
      if (hasData(context.especialidad))   perfil.especialidad   = context.especialidad;
      if (hasData(context.experiencia))    perfil.experiencia    = context.experiencia;
      const zonaCobertura = context.ubicacion?.zona_cobertura;
      if (hasData(zonaCobertura)) perfil.zona_cobertura = zonaCobertura;
    }

    return {
      enabled: true,
      ...(hasData(perfil) && { perfil }),
      servicios,
    };

  } catch (err) {
    console.warn('⚠️ Error crítico en buildServices:', err.message);
    return null;
  }
}
