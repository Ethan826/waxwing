// R001 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-r001.mjs. Each restores one defect in a whole,
// compiling form.
export const r001Rows = [
  {
    // No specialization-time printable check (BACKLOG E017): a type
    // variable instantiated with a function passes the checker and fails
    // `go build` (E_TOOL).
    name: 'r001-print-ground', file: 'src/Features/Specialize.purs',
    needle: '  checkSites env state\n',
    replacement: '',
    probe: 'r001-print-ground', message: /E_TOOL/
  },
  {
    // Record fields left in written order: `{ a, b }` and `{ b, a }` are
    // two types, so equal records no longer unify (R001 design §1).
    name: 'r001-record-order', file: 'src/Domain/Type/Record.purs',
    needle: 'recordRow fields tail = { fields: sortFields fields, tail }',
    replacement: 'recordRow fields tail = { fields, tail }',
    probe: 'r001-record-order', message: /label order/
  },
  {
    // A record row argument takes no sort from its parameter, so a row
    // passed to a record parameter is read as an effect row.
    name: 'r001-row-sort-propagation',
    file: 'src/Features/Resolve/Occurrences.purs',
    needle: '    if sort == Syntax.RecordSort then sort else Syntax.RowSort',
    replacement: '    if sort == Syntax.TypeSort then sort else Syntax.RowSort',
    probe: 'r001-row-sort-propagation', message: /propagation/
  },
  {
    // A repeated label in a record type is not diagnosed.
    name: 'r001-duplicate-field', file: 'src/Features/Resolve/TypeRef.purs',
    needle: '    traverse_ repeatedField (repeatedLabel fields)\n',
    replacement: '',
    probe: 'r001-duplicate-field', message: /duplicate field/
  }
];
