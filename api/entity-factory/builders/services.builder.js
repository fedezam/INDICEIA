import { hasData } from '../utils/hasData.js';

/**
 * Construye el bloque services según services.schema.json.
 * Campos: id, nombre, modalidad[], disponibilidad, activo, descripcion?, precio?, duracion_minutos?, variantes?, notas?
 */
export async function buildServices(comercioRef) {
  try {
    const snapshot = await comercioRef.collection('servicios').get();

    if (snapshot.empty) return { enabled: false };

    const servicios = snapshot.docs.map(doc => {
      const s = doc.data();

      // Normalizar modalidad — siempre array (legacy puede venir como string)
      const modalidad = Array.isArray(s.modalidad)
        ? s.modalidad
        : (s.modalidad ? [s.modalidad] : []);

      return {
        id:            doc.id,
        nombre:        s.nombre,
        modalidad,
        disponibilidad: s.disponibilidad,
        activo:        s.activo === true,
        ...(hasData(s.descripcion)      && { descripcion: s.descripcion }),
        ...(hasData(s.precio)           && { precio: s.precio }),
        ...(hasData(s.duracion_minutos) && { duracion_minutos: s.duracion_minutos }),
        ...(hasData(s.variantes)        && { variantes: s.variantes }),
        ...(hasData(s.notas)            && { notas: s.notas }),
      };
    });

    return { enabled: true, servicios };

  } catch (err) {
    console.warn('⚠️ No se pudieron cargar servicios:', err.message);
    return { enabled: false };
  }
}
