// scripts/codemod/rename-vars.cjs
// ============================================================
// Renombra VARIABLES y FUNCIONES comercio* → entidad* usando el AST.
// NO toca nada que sea un contrato o un dato persistido:
//   · cadenas ('comercioId' en where(), idField, etc.)
//   · propiedades (obj.comercioId, userData.comercioId)
//   · claves de objeto ({ comercioId: x }, body de APIs, campos de Firestore)
// Si un renombre pisaría otra variable ya existente (choque de nombres),
// lo saltea y lo informa. Todo lo que no toca queda en el reporte,
// que es exactamente la lista de lo que hay que decidir a mano.
// ============================================================
const fs = require('fs');

const MAP = {
  comercioId:              'entidadId',
  comercioData:            'entidadData',
  getComercioId:           'getEntidadId',
  nuevoComercioId:         'nuevaEntidadId',
  currentComercioId:       'currentEntidadId',
  updateComercioData:      'updateEntidadData',
  getComercioData:         'getEntidadData',
  saveComercioData:        'saveEntidadData',
  requireComercioId:       'requireEntidadId',
  resolvedComercioId:      'resolvedEntidadId',
  normalizeComercioData:   'normalizeEntidadData',
  comercioDataNormalizada: 'entidadDataNormalizada',
  getCurrentComercioId:    'getCurrentEntidadId',
  getCurrentComercioData:  'getCurrentEntidadData',
};

const REPORT = process.env.CODEMOD_REPORT || 'codemod-report.txt';

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const lines = [];
  let renamed = 0;
  const note = (tipo, node, extra = '') =>
    lines.push(`${tipo}\t${file.path}:${node.loc ? node.loc.start.line : '?'}\t${extra}`);

  root.find(j.Identifier).forEach((p) => {
    const from = p.node.name;
    const to = MAP[from];
    if (!to) return;
    const parent = p.parent.node;

    // obj.comercioId  → propiedad: no se toca
    if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression')
        && parent.property === p.node && !parent.computed) {
      note('PROPIEDAD', p.node, `.${from}`);
      return;
    }
    // { comercioId: x }  → clave: no se toca (el valor sí se evalúa aparte)
    if ((parent.type === 'ObjectProperty' || parent.type === 'Property')
        && parent.key === p.node && !parent.computed) {
      note('CLAVE', p.node, `${from}${parent.shorthand ? ' (shorthand: se vuelve explícita)' : ''}`);
      return;
    }
    // choque de nombres: ya existe `to` visible desde este punto
    let choque = null;
    try { choque = p.scope && p.scope.lookup(to); } catch (e) { /* sin scope */ }
    if (choque) {
      note('CHOQUE', p.node, `${from} → ${to} (ya existe ${to} en el scope)`);
      return;
    }
    p.node.name = to;
    renamed++;
  });

  // Los shorthand cuya clave y valor ya no coinciden pasan a forma explícita: { comercioId: entidadId }
  const fixShorthand = (p) => {
    const n = p.node;
    if (!n.shorthand) return;
    const v = n.value && n.value.type === 'AssignmentPattern' ? n.value.left : n.value;
    if (v && n.key && v.name && v.name !== n.key.name) n.shorthand = false;
  };
  root.find(j.ObjectProperty).forEach(fixShorthand);
  root.find(j.Property).forEach(fixShorthand);

  // Cadenas que contienen un nombre viejo: contrato o campo de Firestore → a mano
  root.find(j.Literal).forEach((p) => {
    const v = p.node.value;
    if (typeof v === 'string' && MAP[v]) note('CADENA', p.node, `'${v}'`);
  });

  if (lines.length) fs.appendFileSync(REPORT, lines.join('\n') + '\n');
  if (!renamed) return undefined;
  return root.toSource();
};
