// lib/entity-factory/shapes/index.js
// ⟦ROLE⟧ Registry de micromentes. Único punto de agregación —
// agregar un tipo nuevo es agregar un archivo acá + una línea en
// este objeto, nada más se toca. mind.builder.js sigue importando
// `shapes` desde '../mind.shapes.js' (que re-exporta este objeto),
// no desde acá directamente — no hace falta tocar el builder.

import { comercio } from './comercio.js';
import { prestador } from './prestador.js';
import { profesional } from './profesional.js';
import { soporte } from './soporte.js';
import { filosofo } from './filosofo.js';

export const shapes = {
  comercio,
  prestador,
  profesional,
  soporte,
  filosofo,
};
