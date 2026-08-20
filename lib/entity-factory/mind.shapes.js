// lib/entity-factory/mind.shapes.js
// ⟦ROLE⟧ Re-export de compatibilidad. Los shapes reales viven en
// ./shapes/*.js (un archivo por tipo, ver ./shapes/index.js como
// registry). Este archivo existe para que mind.builder.js y
// cualquier otro consumidor no necesiten cambiar su import — sigue
// siendo `import { shapes } from '../mind.shapes.js'` como siempre.
//
// Decisiones de diseño del sistema de shapes → ./shapes.decisions.md
// Protocolo para diseñar un shape nuevo → mind-shape-skill.md

export { shapes } from './shapes/index.js';
