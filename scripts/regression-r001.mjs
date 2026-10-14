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
    // Record fields left in written order: a diagnostic prints them so
    // (R001 design §1, §6; unification pairs labels by name since Task 4).
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
    // A variable's uses are not checked against the settled sorts, so a
    // caller using a record parameter as an effect row passes.
    name: 'r001-settled-sort', file: 'src/Features/Resolve/Sorts.purs',
    needle: '  traverse_ (checked settled.given everything)\n'
      + '    (Array.zip (Array.zip final uses) perDeclaration) $> final\n',
    replacement: '  pure final\n',
    probe: 'r001-settled-sort', message: /settled sort/
  },
  {
    // Callers passing different sorts to one parameter are not diagnosed.
    name: 'r001-caller-conflict', file: 'src/Features/Resolve/SortCheck.purs',
    needle: '    | givenArgument given found.use = '
      + 'Left (callerClash everything found)\n',
    replacement: '    | givenArgument given found.use = Right unit\n',
    probe: 'r001-caller-conflict', message: /caller conflict/
  },
  {
    // The phases run once each, so a sort a caller gives a callee never
    // travels back up to the callee's other callers.
    name: 'r001-sort-feedback', file: 'src/Features/Resolve/RowSettle.purs',
    needle: '  else Loop\n    { known: Map.union fresh known\n',
    replacement: '  else Done\n    { known: Map.union fresh known\n',
    probe: 'r001-sort-feedback', message: /feedback/
  },
  {
    // The tails are decided against the rows flattened before the shared
    // fields unified, so a tail those fields bound is bound again.
    name: 'r001-field-bound-tail',
    file: 'src/Features/Check/UnifyRecord.purs',
    needle: '    if rebound reached one || rebound reached other then\n',
    replacement: '    if false then\n',
    probe: 'r001-field-bound-tail', message: /rebound/
  }
];
