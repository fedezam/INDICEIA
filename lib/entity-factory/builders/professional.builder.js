// lib/entity-factory/builders/professional.builder.js

import { hasData } from '../utils/hasData.js';

export function buildProfessional(data) {
  const result = {};

  if (hasData(data.especialidad))        result.especialidad        = data.especialidad;
  if (hasData(data.experiencia))         result.experiencia         = `${data.experiencia} años`;
  if (hasData(data.titulo))              result.titulo              = data.titulo;
  if (hasData(data.institucionFormadora)) result.institucionFormadora = data.institucionFormadora;
  if (hasData(data.idiomas?.length))     result.idiomas             = data.idiomas;

  // Matrícula
  if (hasData(data.matricula?.numero)) {
    result.matricula = {
      numero:    data.matricula.numero,
      organismo: data.matricula.organismo || null,
    };
  }

  // Lugares de atención
  if (Array.isArray(data.lugares) && data.lugares.length) {
    result.lugares = data.lugares.map(l => ({
      nombre:    l.nombre,
      provincia: l.provincia,
      ciudad:    l.ciudad,
      direccion: l.direccion,
      dias:      l.dias || [],
      horario:   l.horario || null,
    }));
  }

  // Cobertura médica
  if (data.cobertura) {
    const cob = {};
    if (Array.isArray(data.cobertura.modalidades) && data.cobertura.modalidades.length)
      cob.modalidades = data.cobertura.modalidades;
    if (Array.isArray(data.cobertura.mutuales) && data.cobertura.mutuales.length)
      cob.mutuales = data.cobertura.mutuales;
    if (data.cobertura.particular !== undefined)
      cob.particular = data.cobertura.particular;
    if (hasData(data.cobertura.honorarios))
      cob.honorarios = data.cobertura.honorarios;
    if (hasData(cob)) result.cobertura = cob;
  }

  return hasData(result) ? { enabled: true, ...result } : null;
}
