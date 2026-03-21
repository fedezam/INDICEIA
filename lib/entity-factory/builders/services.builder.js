import { hasData } from '../utils/hasData.js';

export async function buildServices(comercioRef, data) {
  try {
    const snapshot = await comercioRef.collection('servicios').get();
    if (snapshot.empty) return null;

    const servicios = snapshot.docs.map(doc => {
      const s = doc.data();
      const modalidad = Array.isArray(s.modalidad)
        ? s.modalidad
        : (s.modalidad ? [s.modalidad] : []);

      return {
        id:             doc.id,
        nombre:         s.nombre,
        modalidad,
        disponibilidad: s.disponibilidad,
        activo:         s.activo === true,
        ...(hasData(s.descripcion)      && { descripcion:      s.descripcion }),
        ...(hasData(s.precio)           && { precio:           s.precio }),
        ...(hasData(s.duracion_minutos) && { duracion_minutos: s.duracion_minutos }),
        ...(hasData(s.variantes)        && { variantes:        s.variantes }),
        ...(hasData(s.notas)            && { notas:            s.notas }),
      };
    });

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
