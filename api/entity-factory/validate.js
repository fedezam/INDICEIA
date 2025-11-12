// /api/entity-factory/validate.js

/**
 * Validation Module - Valida entidades contra schema 3.0.1
 */

import { Logger } from './utils/logger.js';

/**
 * 🔍 Validar entidad completa contra el schema estándar
 */
export async function validateEntity(entity) {
  const errors = [];
  const warnings = [];

  try {
    // 1️⃣ VALIDAR ESTRUCTURA BÁSICA
    if (!entity.meta) errors.push({ code: 'MISSING_META', message: 'meta block is required' });
    if (!entity.bloque_A_nucleo_LER) errors.push({ code: 'MISSING_BLOQUE_A', message: 'bloque_A_nucleo_LER is required' });
    if (!entity.bloque_B_contexto_comercial) errors.push({ code: 'MISSING_BLOQUE_B', message: 'bloque_B_contexto_comercial is required' });

    // 2️⃣ VALIDAR META
    if (entity.meta) {
      const { schema_version, version, author } = entity.meta;

      if (!schema_version) {
        errors.push({ code: 'MISSING_SCHEMA_VERSION', message: 'meta.schema_version is required' });
      } else if (schema_version !== '3.0.1') {
        warnings.push({ code: 'SCHEMA_VERSION_MISMATCH', message: `Schema version should be 3.0.1 (found ${schema_version})` });
      }

      if (!version) warnings.push({ code: 'MISSING_VERSION', message: 'meta.version is recommended' });
      if (!author) warnings.push({ code: 'MISSING_AUTHOR', message: 'meta.author is recommended' });
    }

    // 3️⃣ VALIDAR BLOQUE A
    const bloqueA = entity.bloque_A_nucleo_LER;
    if (bloqueA) {
      if (!bloqueA.glifos_core) errors.push({ code: 'MISSING_GLIFOS', message: 'bloque_A must have glifos_core' });
      if (!bloqueA.rutas_cognitivas) errors.push({ code: 'MISSING_RUTAS', message: 'bloque_A must have rutas_cognitivas' });
      if (!bloqueA.seguridad) errors.push({ code: 'MISSING_SEGURIDAD', message: 'bloque_A must have seguridad rules' });
    }

    // 4️⃣ VALIDAR BLOQUE B - IDENTIDAD
    const bloqueB = entity.bloque_B_contexto_comercial;
    if (bloqueB) {
      const { identity, contacto, catalogo } = bloqueB;

      // Identity
      if (!identity) {
        errors.push({ code: 'MISSING_IDENTITY', message: 'bloque_B must have identity' });
      } else {
        if (!identity.nombre_comercio) errors.push({ code: 'MISSING_NOMBRE_COMERCIO', message: 'identity.nombre_comercio is required' });
        if (!identity.id_comercio) errors.push({ code: 'MISSING_ID_COMERCIO', message: 'identity.id_comercio is required' });
      }

      // Contacto
      if (!contacto) {
        errors.push({ code: 'MISSING_CONTACTO', message: 'bloque_B must have contacto' });
      } else {
        const { whatsapp_number, email } = contacto;
        if (!whatsapp_number) {
          warnings.push({ code: 'MISSING_WHATSAPP', message: 'WhatsApp number not configured' });
        } else if (!/^\d{10,15}$/.test(whatsapp_number)) {
          errors.push({
            code: 'INVALID_WHATSAPP',
            message: `WhatsApp number invalid: ${whatsapp_number}`,
            field: 'contacto.whatsapp_number'
          });
        }

        if (!email) warnings.push({ code: 'MISSING_EMAIL', message: 'Email not configured' });
      }

      // Catálogo
      if (!catalogo) {
        errors.push({ code: 'MISSING_CATALOGO', message: 'bloque_B must have catalogo' });
      } else {
        const { categorias, items } = catalogo;

        if (!categorias?.length) errors.push({ code: 'EMPTY_CATEGORIAS', message: 'catalogo must have at least 1 category' });
        if (!items?.length) {
          errors.push({ code: 'EMPTY_ITEMS', message: 'catalogo must have at least 1 item' });
        } else {
          items.forEach((item, i) => validateItem(item, i, errors, warnings));
          const ids = items.map(i => i.id);
          const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
          if (duplicates.length) {
            errors.push({
              code: 'DUPLICATE_IDS',
              message: `Duplicate item IDs: ${duplicates.join(', ')}`,
              field: 'catalogo.items'
            });
          }
        }
      }
    }

    // 5️⃣ VALIDAR BLOQUE C
    const bloqueC = entity.bloque_C_visual_module;
    if (bloqueC) {
      const { template } = bloqueC;
      if (!template) warnings.push({ code: 'MISSING_TEMPLATE', message: 'bloque_C has no template defined' });
      else if (!template.id) errors.push({ code: 'MISSING_TEMPLATE_ID', message: 'bloque_C.template must have id' });
    }

    // 6️⃣ RESULTADO FINAL
    const passed = errors.length === 0;

    if (passed) Logger.info(`✅ Validation PASSED with ${warnings.length} warnings`);
    else Logger.error(`❌ Validation FAILED with ${errors.length} errors`);

    return {
      passed,
      errors,
      warnings,
      summary: {
        total_errors: errors.length,
        total_warnings: warnings.length,
        critical_errors: errors.filter(e => e.code.startsWith('MISSING')).length
      }
    };

  } catch (error) {
    Logger.error('Validation exception:', error);
    return {
      passed: false,
      errors: [{ code: 'VALIDATION_EXCEPTION', message: error.message }],
      warnings: []
    };
  }
}

/**
 * 🧩 Validar un item individual del catálogo
 */
function validateItem(item, index, errors, warnings) {
  const path = `catalogo.items[${index}]`;

  if (!item.id) errors.push({ code: 'MISSING_ITEM_ID', message: `Item at index ${index} has no id`, field: path });
  if (!item.nombre) errors.push({ code: 'MISSING_ITEM_NOMBRE', message: `Item ${item.id || index} has no nombre`, field: `${path}.nombre` });
  if (!item.categoria) errors.push({ code: 'MISSING_ITEM_CATEGORIA', message: `Item ${item.id} has no categoria`, field: `${path}.categoria` });

  // Al menos un precio
  if (!item.precio && !item.precio_mediana && !item.precio_grande) {
    errors.push({ code: 'MISSING_ITEM_PRECIO', message: `Item ${item.id} has no price`, field: `${path}.precio` });
  }

  // Validar precio
  if (item.precio != null) {
    if (typeof item.precio !== 'number' || item.precio < 0) {
      errors.push({ code: 'INVALID_PRECIO', message: `Item ${item.id} invalid precio: ${item.precio}`, field: `${path}.precio` });
    }
  }

  // Imagen recomendada
  if (!item.image_url && !item.images?.length) {
    warnings.push({ code: 'MISSING_IMAGE', message: `Item ${item.id} has no image`, field: `${path}.image_url` });
  }

  // Tags recomendados
  if (!item.tags?.length) {
    warnings.push({ code: 'MISSING_TAGS', message: `Item ${item.id} has no tags`, field: `${path}.tags` });
  }
}

/**
 * ⚡ Validación rápida (solo estructura mínima)
 */
export function quickValidate(entity) {
  return Boolean(
    entity?.meta &&
    entity.bloque_A_nucleo_LER &&
    entity.bloque_B_contexto_comercial?.catalogo?.items
  );
}
