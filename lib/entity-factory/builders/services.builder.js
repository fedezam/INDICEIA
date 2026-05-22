// lib/entity-factory/builders/services.builder.js
import { hasData } from '../utils/hasData.js';

export async function buildServices(comercioRef, context) {
  try {
    const snapshot = await comercioRef.collection('servicios').get();
    if (snapshot.empty) return null;

    // 1. Carga y filtrado inicial
    const docs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(s => s.activo === true); // Solo servicios activos

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
      const item = { n: s.nombre };
      
      // Campos estándar del padre
      if (hasData(s.descripcion))    item.desc = s.descripcion;
      if (hasData(s.disponibilidad)) item.disp = s.disponibilidad;
      if (hasData(s.semantic_notes)) item.semantic_notes = s.semantic_notes;
      if (hasData(s.notas))          item.notas = s.notas; // Soporte legacy si existe

      // Lógica de Jerarquía:
      // Si existen hijos en la DB para este ID, ES un servicio complejo/agrupador.
      // Ignoramos s.tipo para evitar errores de sincronización de metadata.
      const childItems = hijosPorPadre[s.id];

      if (hasData(childItems) && childItems.length > 0) {
        item.items = childItems.map(h => {
          const hi = { n: h.nombre };
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
      if (hasData(context.zona_cobertura)) perfil.zona_cobertura = context.zona_cobertura;
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
