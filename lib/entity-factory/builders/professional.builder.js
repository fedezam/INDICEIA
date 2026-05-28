// lib/entity-factory/builders/professional.builder.js

import { hasData } from '../utils/hasData.js';

export function buildProfessional(data) {
  const result = {};

  if (hasData(data.especialidad))         result.especialidad         = data.especialidad;
  if (hasData(data.experiencia))          result.experiencia          = `${data.experiencia} años`;
  if (hasData(data.titulo))               result.titulo               = data.titulo;
  if (hasData(data.institucionFormadora)) result.institucionFormadora = data.institucionFormadora;
  if (hasData(data.idiomas?.length))      result.idiomas              = data.idiomas;

  // Matrícula
  if (hasData(data.matricula?.numero)) {
    result.matricula = {
      numero:    data.matricula.numero,
      organismo: data.matricula.organismo || null,
    };
  }

  // Lugares de atención
  // Solo lugares activos, con shape semántico para el LLM.
  // Sin lat/lng ni IDs — eso es infraestructura, no semántica.
  if (Array.isArray(data.lugares) && data.lugares.length) {
    const lugaresActivos = data.lugares
      .filter(l => l.activo !== false)
      .map(l => {
        const lugar = {
          nombre:    l.nombre        || null,
          ciudad:    l.ciudad?.nombre || null,
          provincia: l.provincia     || null,
          direccion: l.direccion     || null,
        };

        // Horarios — solo días abiertos con turnos reales
        // Formato Firestore: { lunes: { open: true, turnos: [{open, close}] } }
        if (l.horarios && typeof l.horarios === 'object') {
          const diasAbiertos = {};
          Object.entries(l.horarios).forEach(([dia, cfg]) => {
            if (cfg?.open && Array.isArray(cfg.turnos) && cfg.turnos.length) {
              const turnos = cfg.turnos
                .filter(t => t.open && t.close)
                .map(t => `${t.open}–${t.close}`);
              if (turnos.length) diasAbiertos[dia] = turnos;
            }
          });
          if (Object.keys(diasAbiertos).length) lugar.horarios = diasAbiertos;
        }

        // Contacto del lugar — solo si existe
        const contacto = {};
        if (hasData(l.whatsapp)) contacto.whatsapp = l.whatsapp;
        if (hasData(l.telefono)) contacto.telefono = l.telefono;
        if (hasData(l.email))    contacto.email    = l.email;
        if (hasData(contacto))   lugar.contacto    = contacto;

        return lugar;
      });

    if (lugaresActivos.length) result.lugares = lugaresActivos;
  }

  // Cobertura
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

  // Consultas — tipos de atención que ofrece el profesional
  if (Array.isArray(data.consultas) && data.consultas.length) {
    result.consultas = data.consultas.map(c => {
      const consulta = {
        nombre:    c.nombre      || null,
        descripcion: c.descripcion || null,
      };
      if (c.duracion_minutos) consulta.duracion_minutos = c.duracion_minutos;
      if (c.precio?.tipo === 'fijo' && c.precio.valor) {
        consulta.precio = { tipo: 'fijo', valor: c.precio.valor, moneda: c.precio.moneda || 'ARS' };
      } else {
        consulta.precio = { tipo: 'consultar' };
      }
      return consulta;
    });
  }

  return hasData(result) ? { enabled: true, ...result } : null;
}
