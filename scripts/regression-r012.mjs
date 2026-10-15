// R012 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-r012.mjs. Each restores one defect in a whole,
// compiling form.
export const r012Rows = [
  {
    // A record parameter takes only `...r`: a record type argument is the
    // misleading sort error.
    name: 'r012-record-argument',
    file: 'src/Features/Resolve/TypeArguments.purs',
    needle: '        Syntax.TypeArgument reference → recordType resolvers '
      + 'effects\n          reference\n',
    replacement: '        Syntax.TypeArgument reference → sortError true\n'
      + '          (Syntax.typeRefSpan reference)\n',
    probe: 'r012-record-argument',
    message: /record argument: E_TYPE Expected an effect row, found a type/
  },
  {
    // No clash check: the declaration's label and the argument's meet in
    // lowering, which the record guard reports.
    name: 'r012-argument-clash',
    file: 'src/Features/Resolve/ArgumentClash.purs',
    needle: 'clashIn tables reference =\n'
      + '  if hasRecordParameters tables.types then',
    replacement: 'clashIn tables reference =\n  if false then',
    probe: 'r012-argument-clash',
    message: /argument clash: E_INTERNAL Duplicate record label/
  },
  {
    // Only a `...r` alone passes its labels on: a record argument's tail
    // implies none, so a caller fills r with x and lowering meets x twice.
    name: 'r012-argument-lacks', file: 'src/Features/Resolve/Lacking.purs',
    needle: 'passed tables argument = maybe [] labelled argument.tail\n',
    replacement: 'passed tables argument =\n'
      + '  if Array.null argument.fields then maybe [] labelled argument.tail\n'
      + '  else []\n',
    probe: 'r012-argument-lacks',
    message: /argument tail: E_INTERNAL Duplicate record label/
  },
  {
    // The written position read as the variable's place: after an effect
    // row parameter it names another variable, which writes no label.
    name: 'r012-slot-position', file: 'src/Features/Resolve/Lacking.purs',
    needle: '    (slotOf info argument.position)\n',
    replacement: '    (const argument.position info)\n',
    probe: 'r012-slot-position',
    message: /slot position: E_INTERNAL Duplicate record label/
  },
  {
    // `{ ...s }` is a record tail to the sort solver, so its sort never
    // reaches the callee, which stays an effect row.
    name: 'r012-spread-argument',
    file: 'src/Features/Resolve/Occurrences.purs',
    needle: '    if rowSlot callee position then asRow found else found\n',
    replacement: '    found\n',
    probe: 'r012-spread-argument',
    message: /spread argument: E_TYPE Expected an effect row, found a type/
  },
  {
    // Record arguments judged as types: a tail is no variable there, so a
    // row growing through recursion is admitted.
    name: 'r012-nested-row',
    file: 'src/Features/Check/NestedArguments.purs',
    needle: '  if sort == Syntax.RecordSort then bareRow ty || '
      + 'not (mentionsRow ty)\n',
    replacement: '  if sort == Syntax.RecordSort then admissible always ty\n',
    probe: 'r012-nested-row', message: /growing row: accepted/
  },
  {
    // Only type arguments judged and walked (the rule before R012): a
    // reference inside a record argument is never reached.
    name: 'r012-nested-walk',
    edits: [
      {
        file: 'src/Features/Check/NestedArguments.purs',
        needle: 'judged sorts arguments = Array.zip '
          + '(Array.filter rowFree sorts) arguments\n',
        replacement: 'judged sorts arguments = Array.filter typeOnly\n'
          + '  (Array.zip (Array.filter rowFree sorts) arguments)\n'
      },
      {
        file: 'src/Features/Check/NestedArguments.purs',
        needle: '  rowFree sort = sort /= Syntax.RowSort\n',
        replacement: '  rowFree sort = sort /= Syntax.RowSort\n'
          + '  typeOnly (Tuple sort _) = sort == Syntax.TypeSort\n'
      },
      {
        file: 'src/Features/Check/NestedArguments.purs',
        needle: '    Syntax.RecordSort, TypeArgument found → Just found\n'
          + '    Syntax.RecordSort, RowArgument '
          + '(RowRef span [] (Just (Spread name))) →\n'
          + '      Just (RecordRef span [] (Just { name, span }))\n',
        replacement: ''
      }
    ],
    probe: 'r012-nested-walk', message: /nested reference: accepted/
  }
];
