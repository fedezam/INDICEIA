// ============================================================
// lib/entity-factory/normalizers/normalizeProfessional.js
// ============================================================
//
// PROPÓSITO:
//   Derivar campos canónicos universales desde la estructura
//   rica de datos de un profesional, ANTES de que corran los
//   builders (context, seo, index, mind).
//
// QUÉ HACE:
//   Lee  → data.lugares[], data.cobertura.modalidades
//   Genera → data.ciudad, data.provincia, data.direccion,
//             data.ubicacion, data.horarios, data.tieneLocalFisico
//
// QUÉ NO HACE:
//   - No modifica builders, runtime ni contracts
//   - No borra data.lugares[] (los builders específicos lo usan)
//   - No infiere aristas (salud, legal, etc.)
//
// RESULTADO:
//   SEO, index-builder y context-builder reciben siempre
//   los campos canónicos que esperan, sin importar si la
//   entidad es profesional, comercio o prestador.
//
// ============================================================

/**
 * Encuentra el lugar principal de un profesional.
 * Criterio: primero activo con ciudad, o simplemente el primero.
 */
function resolveMainLocation(lugares) {
  if (!Array.isArray(lugares) || lugares.length === 0) return null;

  // Preferir el primero activo que tenga ciudad
  const conCiudad = lugares.filter(l => l.activo !== false && l.ciudad?.nombre);
  if (conCiudad.length > 0) return conCiudad[0];

  // Fallback: cualquier lugar con ciudad
  const cualquiera = lugares.find(l => l.ciudad?.nombre);
  if (cualquiera) return cualquiera;

  // Último recurso: el primer lugar
  return lugares[0];
}

/**
 * Deriva si tiene local físico desde las modalidades de cobertura.
 * Un profesional tiene "local físico" si atiende presencialmente.
 */
function deriveTieneLocalFisico(data) {
  // Desde cobertura.modalidades (fuente más confiable)
  if (Array.isArray(data.cobertura?.modalidades)) {
    return data.cobertura.modalidades.includes('presencial');
  }

  // Fallback: si hay lugares activos con dirección, asumir presencial
  if (Array.isArray(data.lugares) && data.lugares.length > 0) {
    return data.lugares.some(l => l.activo !== false && l.direccion);
  }

  return false;
}

/**
 * Normaliza datos de un profesional para que los builders
 * universales (seo, index, context) reciban el shape canónico.
 *
 * @param {Object} data — rawData de Firestore
 * @returns {Object} — data enriquecida con campos canónicos
 */
export function normalizeProfessional(data) {
  // Solo actuar sobre profesionales
  if (data.entityType !== 'profesional') return data;

  const normalized = { ...data };

  // ── 1. LUGAR PRINCIPAL ──────────────────────────────────────

  const mainLocation = resolveMainLocation(data.lugares);

  if (mainLocation) {

    // ── 2. CAMPOS PLANOS (para SEO, index, context) ──────────

    if (!normalized.ciudad && mainLocation.ciudad?.nombre) {
      normalized.ciudad = mainLocation.ciudad.nombre;
    }

    if (!normalized.provincia && mainLocation.provincia) {
      normalized.provincia = mainLocation.provincia;
    }

    if (!normalized.direccion && mainLocation.direccion) {
      normalized.direccion = mainLocation.direccion;
    }

    // ── 3. UBICACION CANÓNICA ────────────────────────────────
    // Corrige el bug: localidad.lat → localidad.coords.lat

    if (!normalized.ubicacion) {
      const ciudad = mainLocation.ciudad || {};

      normalized.ubicacion = {
        direccion:    mainLocation.direccion  || null,
        provincia:    mainLocation.provincia  || null,
        pais:         'Argentina',
        local_fisico: deriveTieneLocalFisico(data),
        localidad: {
          id:     ciudad.id     || null,
          nombre: ciudad.nombre || null,
          coords: {
            lat: ciudad.lat ?? null,   // ← fix: era localidad.lat directo
            lng: ciudad.lng ?? null,   // ← fix: era localidad.lng directo
          },
        },
      };
    }

    // ── 4. HORARIOS CANÓNICOS ────────────────────────────────
    // Los horarios de lugares[] ya vienen en el formato que
    // compileHorarios() espera: { open: bool, turnos: [{open, close}] }
    // Solo hay que elevarlos al nivel raíz.

    if (!normalized.horarios && mainLocation.horarios) {
      normalized.horarios = mainLocation.horarios;
    }
  }

  // ── 5. TIENE LOCAL FÍSICO ────────────────────────────────────

  if (normalized.tieneLocalFisico === undefined) {
    normalized.tieneLocalFisico = deriveTieneLocalFisico(data);
  }

  // ── 6. CONTACTO A NIVEL RAÍZ (desde lugar principal) ────────
  // context.builder lee data.whatsapp, data.telefono, data.email
  // directamente. Si el profesional los tiene en el lugar, los elevamos.

  if (mainLocation) {
    if (!normalized.whatsapp && mainLocation.whatsapp) {
      normalized.whatsapp = mainLocation.whatsapp;
    }
    if (!normalized.telefono && mainLocation.telefono) {
      normalized.telefono = mainLocation.telefono;
    }
    if (!normalized.email && mainLocation.email) {
      normalized.email = mainLocation.email;
    }
  }

  return normalized;
}
