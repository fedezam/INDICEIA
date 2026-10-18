const fs = require('fs');

const ANY = {
  comercioData:      'entidadData',
  _comercioData:     '_entidadData',
  _comercioId:       '_entidadId',
  currentComercioId: 'currentEntidadId',
};
const CTX_PROP = { comercioId: 'entidadId' };
const CTX_NAMES = new Set(['ctx', 'context', 'baseContext', '_ctx']);

// proveedores de alias: se editan a mano al final de la fase 2
const EXCLUDE = [
  'src/services/firebase/context.js',
  'src/skeleton/adapters/firebaseAdapter.js',
  'src/skeleton/components/onboarding-button/update.js',
  'src/shared/entidadObjetivo.js',
];

const REPORT = process.env.CODEMOD_REPORT || 'codemod-report-props.txt';
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

module.exports = function transformer(file, api) {
  if (EXCLUDE.some((e) => file.path.replace(/\\/g, '/').endsWith(e))) return undefined;

  const j = api.jscodeshift;
  const root = j(file.source);
  const lines = [];
  let renamed = 0;
  const note = (tipo, node, extra = '') =>
    lines.push(`${tipo}\t${file.path}:${node.loc ? node.loc.start.line : '?'}\t${extra}`);

  const esContexto = (obj) => {
    if (!obj) return false;
    if (obj.type === 'Identifier') return CTX_NAMES.has(obj.name);
    if (obj.type === 'MemberExpression' || obj.type === 'OptionalMemberExpression') {
      return !obj.computed && obj.property.type === 'Identifier' && CTX_NAMES.has(obj.property.name);
    }
    return false;
  };

  root.find(j.Identifier).forEach((p) => {
    const name = p.node.name;
    const parent = p.parent.node;

    if (has(ANY, name)) { p.node.name = ANY[name]; renamed++; return; }
    if (has(CTX_PROP, name)
        && (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression')
        && parent.property === p.node && !parent.computed && esContexto(parent.object)) {
      p.node.name = CTX_PROP[name]; renamed++; return;
    }
    if (has(CTX_PROP, name)) {
      const esProp = (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && parent.property === p.node;
      if (esProp) note('PROPIEDAD', p.node, `.${name}`);
    }
  });

  // { entidadData: entidadData } → { entidadData }
  const compactar = (p) => {
    const n = p.node;
    if (n.shorthand || n.computed || !n.key || !n.value) return;
    if (n.key.type === 'Identifier' && n.value.type === 'Identifier' && n.key.name === n.value.name) n.shorthand = true;
  };
  root.find(j.ObjectProperty).forEach(compactar);
  root.find(j.Property).forEach(compactar);

  if (lines.length) fs.appendFileSync(REPORT, lines.join('\n') + '\n');
  if (!renamed) return undefined;
  return root.toSource();
};
