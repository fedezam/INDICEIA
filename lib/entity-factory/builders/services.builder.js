// lib/entity-factory/builders/services.builder.js
import { hasData } from '../utils/hasData.js';

export async function buildServices(comercioRef, context) {
  try {
    const snapshot = await comercioRef.collection('servicios').get();
    if (snapshot.empty) return null;

    const docs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(s => s.activo === true);

    const padres = docs.filter(s => !s.parent_id);
    const hijos  = docs.filter(s =>  s.parent_id);

    const hijosPorPadre = {};
    hijos.forEach(h => {
      if (!hijosPorPadre[h.parent_id]) hijosPorPadre[h.parent_id] = [];
      hijosPorPadre[h.parent_id].push(h);
    });

    const servicios = padres.map(s => {
      const item = { n: s.nombre };
      if (hasData(s.descripcion))    item.desc = s.descripcion;
      if (hasData(s.disponibilidad)) item.disp = s.disponibilidad;
      if (hasData(s.semantic_notes)) item.semantic_notes = s.semantic_notes;

      const childItems = hijosPorPadre[s.id]; // ← rename
      if (s.tipo === 'complejo' && hasData(childItems)) {
        item.items = childItems.map(h => {
          const hi = { n: h.nombre };
          if (hasData(h.precio?.valor))  hi.p    = h.precio.valor;
          if (hasData(h.duracion))       hi.dur  = h.duracion;
          if (hasData(h.descripcion))    hi.desc = h.descripcion;
          if (hasData(h.semantic_notes)) hi.semantic_notes = h.semantic_notes;
          return hi;
        });
      } else {
        if (hasData(s.precio?.valor)) item.p   = s.precio.valor;
        if (hasData(s.duracion))      item.dur = s.duracion;
      }

      if (hasData(s.notas)) item.notas = s.notas;
      return item;
    });

    if (!servicios.length) return null;

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
    console.warn('⚠️ No se pudieron cargar servicios:', err.message);
    return null;
  }
}
