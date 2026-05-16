// lib/entity-factory/builders/services.builder.js
// ⟦ROLE⟧ Compila servicios de Firebase → formato comprimido para LLM.
// Filtra inactivos. NO incluye IDs de Firestore ni flags redundantes.
import { hasData } from '../utils/hasData.js';

export async function buildServices(comercioRef, context) {
  try {
    const snapshot = await comercioRef.collection('servicios').get();
    if (snapshot.empty) return null;

    const servicios = snapshot.docs
      .map(doc => doc.data())
      .filter(s => s.activo === true)
      .map(s => {
        const item = { n: s.nombre };

        // Precio: solo si es simple y tiene valor definido
        if (s.tipo !== 'complejo' && hasData(s.precio?.valor)) {
          item.p = s.precio.valor;
        }

        // Items + unidad: solo si es complejo
        if (s.tipo === 'complejo') {
          if (hasData(s.unidad)) item.unidad = s.unidad;
          if (hasData(s.items))  item.items  = s.items;
        }

        if (hasData(s.duracion_minutos)) item.dur   = s.duracion_minutos;
        if (hasData(s.disponibilidad))   item.disp  = s.disponibilidad;
        if (hasData(s.descripcion))      item.desc  = s.descripcion;
        if (hasData(s.notas))            item.notas = s.notas;

        return item;
      });

    if (!servicios.length) return null;

    const perfil = {};
    if (context?.entityType === 'prestador') {
      if (hasData(context.especialidad))     perfil.especialidad     = context.especialidad;
      if (hasData(context.experiencia))      perfil.experiencia      = context.experiencia;
      if (hasData(context.zona_cobertura))   perfil.zona_cobertura   = context.zona_cobertura;
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
