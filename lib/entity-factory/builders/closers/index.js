// lib/entity-factory/builders/closers/index.js
// ⟦ROLE⟧ Registry de closers. Único punto de import para
// mind.builder.js — agregar un closer nuevo es agregar un archivo acá
// + una línea en este objeto, nada más se toca en mind.builder.js.

import { compileOrderClose } from './order.js';
import { compileLeadClose } from './lead.js';
import { compileServiceClose } from './service.js';
import { compileContactClose } from './contact.js';

export const CLOSING_COMPILERS = {
  order:   (ctx, hasVisual, comercioId) => compileOrderClose(ctx, hasVisual, comercioId),
  service: (ctx, hasVisual, comercioId) => compileServiceClose(ctx, comercioId),
  contact: (ctx, hasVisual, comercioId) => compileContactClose(ctx, comercioId),
  lead:    (ctx, hasVisual, comercioId) => compileLeadClose(ctx, comercioId),
};
