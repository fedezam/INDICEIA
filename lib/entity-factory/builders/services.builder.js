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
        const modalidad = Array.isArray(s.modalidad)
          ? s.modalidad
          : (s.modalidad ? [s.modalidad] : []);

        const item = {
          n: s.nombre,
          modalidad,
        };

        if (hasData(s.precio))           item.p     = s.precio;
        if (hasData(s.duracion_minutos)) item.dur   = s.duracion_minutos;
        if (hasData(s.disponibilidad))   item.disp  = s.disponibilidad;
        if (hasData(s.variantes))        item.v     = s.variantes;
        if (hasData(s.descripcion))      item.desc  = s.descripcion;
        if (hasData(s.notas))            item.notas = s.notas;

        return item;
      });

    if (!servicios.length) return null;

    const perfil = {};
    if (context?.entityType === 'prestador') {
      if (hasData(context.especialidad)) perfil.especialidad = context.especialidad;
      if (hasData(context.experiencia))  perfil.experiencia  = context.experiencia;
      if (hasData(context.zona))         perfil.zona         = context.zona;
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
