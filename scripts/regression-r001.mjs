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
  },
  {
    // An argument gives no sort to the caller's parameter, so a parameter
    // passed only to a record parameter stays effect sort.
    name: 'r001-callee-to-caller', file: 'src/Features/Resolve/RowSettle.purs',
    needle: '  callee applied = Map.lookup '
      + '(Tuple applied.callee applied.position) known\n',
    replacement: '  callee _ = Nothing\n',
    probe: 'r001-callee-to-caller', message: /callee to caller/
  },
  {
    // A variable's uses are not checked against each other after the sorts
    // settle, so a caller using a record parameter as an effect row passes.
    name: 'r001-settled-sort', file: 'src/Features/Resolve/Sorts.purs',
    needle: '  traverse_ (consistent (declaredTypes final)) final\n',
    replacement: '',
    probe: 'r001-settled-sort', message: /settled sort/
  },
  {
    // Callers passing different sorts to one parameter are not diagnosed.
    name: 'r001-caller-conflict', file: 'src/Features/Resolve/RowSettle.purs',
    needle: "maybe' accepted (Left <<< clash found.head)",
    replacement: "maybe' accepted (const (accepted unit))",
    probe: 'r001-caller-conflict', message: /caller conflict/
  }
];
