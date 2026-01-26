// src/lib/entity-factory/rebuildEntity.js

import { buildEntityForCommerce } from "../../api/entity-factory/index.js";

export async function rebuildEntity(comercioId) {
  if (!comercioId) {
    throw new Error("comercioId requerido para rebuildEntity");
  }

  await buildEntityForCommerce(comercioId);
}
