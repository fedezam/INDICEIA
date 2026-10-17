// src/shared/entidadObjetivo.js
// ============================================================
// ⟦ENTIDAD⟧ Decide sobre QUÉ entidad opera una página mi-*
// (comercio, prestador, profesional, soporte).
//
// Contexto: usuarios.comercioId es la entidad "activa" del usuario
// (un solo valor), pero un usuario puede ser dueño de varias
// (entidades.duenoId es la fuente de verdad). Antes, cada mi-*.js
// asumía que la entidad activa era la suya: si era de otro tipo, la
// precargaba y al guardar le pisaba datos y entityType.
//
// Devuelve { modo, entidadId, entidad }:
//   'editar'    → la entidad activa es de este tipo y ya tiene nombre.
//   'crear'     → entidadId null = documento nuevo;
//                 entidadId con valor = borrador existente sin nombre,
//                 que se completa (comportamiento previo).
//   'redirigir' → la entidad activa es de OTRO tipo: esta página no le
//                 corresponde.
//
// Crear OTRA entidad a propósito: abrir la página con ?edit=true&nueva=1.
// (edit=true es necesario: sin él, flowController rebota cualquier página
// que no sea el próximo paso de la entidad activa, antes de llegar acá.)
//
// 'adicional' = true cuando se crea una entidad y el usuario ya tenía una
// activa. En ese caso la nueva NO hereda las capacidades del usuario
// (tipo-entidad las guardó para la primera entidad).
//
// Cuando se renombre comercioId → entidadId / entidadActivaId
// (fase 2), solo hay que tocar las dos primeras líneas de la función.
// ============================================================

export function resolveEntidadObjetivo(ctx, tipo, { aceptaSinTipo = false } = {}) {
  const activaId = ctx.comercioId || ctx.comercioData?.id || null;
  const activa   = ctx.comercioData || {};

  const editar   = { modo: 'editar',    entidadId: activaId, entidad: activa };
  const borrador = { modo: 'crear',     entidadId: activaId, entidad: activa };
  const nueva    = { modo: 'crear',     entidadId: null,     entidad: {}, adicional: !!activaId };
  const fuera    = { modo: 'redirigir', entidadId: null,     entidad: {}     };

  const adminViendo = ctx.isAdminViewing === true;
  const quiereNueva = new URLSearchParams(window.location.search).get('nueva') === '1';

  // Creación explícita de otra entidad (nunca en modo admin: ahí se edita la pedida).
  if (quiereNueva && !adminViendo) return nueva;

  // Sin entidad activa → primera entidad del usuario.
  if (!activaId) return nueva;

  const tieneNombre = !!activa.nombre;

  // Admin mirando una entidad ajena: se respeta la que pidió, sea del tipo que sea.
  if (adminViendo) return tieneNombre ? editar : borrador;

  // Entidad activa del mismo tipo (o sin tipo, en el caso legacy de comercio).
  const tipoActiva = activa.entityType || null;
  const mismoTipo  = tipoActiva === tipo || (!tipoActiva && aceptaSinTipo);
  if (mismoTipo) return tieneNombre ? editar : borrador;

  // La activa es de otro tipo: esta página no es para ella.
  return fuera;
}
