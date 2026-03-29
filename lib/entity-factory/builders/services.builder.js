// lib/entity-factory/builders/services.builder.js
// ⟦ROLE⟧ Compila servicios de Firebase → formato comprimido para LLM.
// Filtra inactivos. NO incluye IDs de Firestore ni flags redundantes.

import { hasData } from '../utils/hasData.js';

export async function buildServices(comercioRef, data) {
  try {
    const snapshot = await comercioRef.collection('servicios').get();
    if (snapshot.empty) return null;

    const servicios = snapshot.docs
      .map(doc => doc.data())
      .filter(s => s.activo === true)          // inactivos fuera
      .map(s => {
        const modalidad = Array.isArray(s.modalidad)
          ? s.modalidad
          : (s.modalidad ? [s.modalidad] : []);

        const item = {
          n: s.nombre,
          modalidad,
        };

        // Solo incluir campos que aporten info real al LLM
        if (hasData(s.precio))           item.p    = s.precio;
        if (hasData(s.duracion_minutos)) item.dur  = s.duracion_minutos;
        if (hasData(s.disponibilidad))   item.disp = s.disponibilidad;
        if (hasData(s.variantes))        item.v    = s.variantes;
        if (hasData(s.descripcion))      item.desc = s.descripcion;
        if (hasData(s.notas))            item.notas = s.notas;

        return item;
      });

    if (!servicios.length) return null;

    // Perfil del prestador — solo si es entityType prestador
    const perfil = {};
    if (data?.entityType === 'prestador') {
      if (hasData(data.especialidad)) perfil.especialidad = data.especialidad;
      if (hasData(data.experiencia))  perfil.experiencia  = `${data.experiencia} años`;
      if (hasData(data.zona))         perfil.zona         = data.zona;
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
