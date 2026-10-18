// R001 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-r001.mjs. Each restores one defect in a whole,
// compiling form.
export const r001Rows = [
  {
    // No specialization-time printable check (BACKLOG E017): a type
    // variable instantiated with a function passes the checker and its Go
    // fails to compile (E_TOOL), as Go's own error shows.
    name: 'r001-print-ground', file: 'src/Features/Specialize.purs',
    needle: '  checkSites env state\n',
    replacement: '',
    probe: 'r001-print-ground',
    message: /E_TOOL: go build failed: \.\/main\.go:\d+:\d+: cannot use/
  },
  {
    // Record fields left in written order: a diagnostic prints them so
    // (R001 design §1, §6; unification pairs labels by name since Task 4),
    // `{ b: Bool, a: Int }` where the sorted `{ a: Int, b: Bool }` is due.
    name: 'r001-record-order', file: 'src/Domain/Type/Record.purs',
    needle: 'recordRow fields tails = { fields: sortFields fields,',
    replacement: 'recordRow fields tails = { fields,',
    probe: 'r001-record-order',
    message:
      /label order kept in a diagnostic: E_TYPE Expected \{ b: Bool, a: Int \}/
  },
  {
    // A record row argument takes no sort from its parameter, so a row
    // passed to a record parameter is read as an effect row, and `with
    // ...e` on it is accepted and runs.
    name: 'r001-row-sort-propagation',
    file: 'src/Features/Resolve/Occurrences.purs',
    needle: '    if sort == Syntax.RecordSort then sort else Syntax.RowSort',
    replacement: '    if sort == Syntax.TypeSort then sort else Syntax.RowSort',
    probe: 'r001-row-sort-propagation',
    message: /row sort propagation lost: ran\n/
  },
  {
    // A repeated label in a record type is not diagnosed: the program is
    // accepted and runs.
    name: 'r001-duplicate-field', file: 'src/Features/Resolve/TypeRef.purs',
    needle: '    traverse_ repeatedField (repeatedLabel fields)\n',
    replacement: '',
    probe: 'r001-duplicate-field',
    message: /duplicate field accepted: ran\n/
  },
  {
    // An argument gives no sort to the caller's parameter, so a parameter
    // passed only to a record parameter stays effect sort, so the clash is
    // reported against Outer's `s`, not f's `e`.
    name: 'r001-callee-to-caller', file: 'src/Features/Resolve/RowSettle.purs',
    needle: '  callee applied = Map.lookup '
      + '(Tuple applied.callee applied.position) known\n',
    replacement: '  callee _ = Nothing\n',
    probe: 'r001-callee-to-caller',
    message: /caller propagation lost: E_TYPE s is an effect row, not a record/
  },
  {
    // A variable's uses are not checked against the settled sorts, so a
    // caller using a record parameter as an effect row passes the sort
    // check and reaches the checker, which fails internally.
    name: 'r001-settled-sort', file: 'src/Features/Resolve/Sorts.purs',
    needle: '  traverse_ (checked settled.given everything)\n'
      + '    (Array.zip (Array.zip final uses) perDeclaration) $> final\n',
    replacement: '  pure final\n',
    probe: 'r001-settled-sort',
    message: /settled sort not enforced: E_INTERNAL Invalid type variable/
  },
  {
    // Callers passing different sorts to one parameter are not diagnosed;
    // the checker then fails internally.
    name: 'r001-caller-conflict', file: 'src/Features/Resolve/SortCheck.purs',
    needle: '    | givenArgument given found.use = '
      + 'Left (callerClash everything found)\n',
    replacement: '    | givenArgument given found.use = Right unit\n',
    probe: 'r001-caller-conflict',
    message: /caller conflict accepted: E_INTERNAL Invalid type variable/
  },
  {
    // The phases run once each, so a sort a caller gives a callee never
    // travels back up to the callee's other callers, so the clash is
    // reported against C2's `b`, not f's `e`.
    name: 'r001-sort-feedback', file: 'src/Features/Resolve/RowSettle.purs',
    needle: '  else Loop\n    { known: Map.union fresh known\n',
    replacement: '  else Done\n    { known: Map.union fresh known\n',
    probe: 'r001-sort-feedback',
    message: /feedback to callers lost: E_TYPE b is an effect row, not a record/
  },
  {
    // The tails are decided against the rows flattened before the shared
    // fields unified, so a tail those fields bound is bound again: the
    // mismatch passes and Go rejects the struct it was given.
    name: 'r001-field-bound-tail',
    file: 'src/Features/Check/UnifyRecord.purs',
    needle: '    if rebound reached one || rebound reached other then\n',
    replacement: '    if false then\n',
    probe: 'r001-field-bound-tail',
    message:
      /rebound: E_TOOL: go build failed: \.\/main\.go:\d+:\d+: cannot use/
  },
  {
    // A layout keyed by its fields in written order: an open row's fields
    // and its tail's spliced in after them make a second layout, a second
    // Go struct, for one record type (R001 design §5).
    name: 'r001-sorted-layout', file: 'src/Features/Specialize/Layouts.purs',
    needle: '  fields = sortFields written\n',
    replacement: '  fields = written\n',
    probe: 'r001-sorted-layout',
    message:
      /written-order layout split one record type: E_TOOL: [^]*cannot use/
  },
  {
    // A meta tail bound to a label it lacks (rule 4), so `{ a: Int, ...r }`
    // with `r` bound to `{ a: Int }` passes; lowering then meets `a` twice,
    // which the record guard reports (before the guard, `go build` failed
    // with the field redeclared).
    name: 'r001-lacks', file: 'src/Features/Check/RecordTail.purs',
    // (`Array.findMap` since R005 Tranche B Task 3: the lack's reason
    // comes with the label.)
    needle: '    (Array.findMap forbidden (map fst fields))\n',
    replacement: '    (Array.findMap forbidden [])\n',
    probe: 'r001-lacks',
    message: /lacks: E_INTERNAL Duplicate record label/
  },
  {
    // Two open tails each extended with their own fresh remainder (rule 3),
    // so the remainder one use fixes is not the other's.
    name: 'r001-shared-remainder',
    edits: [
      {
        file: 'src/Features/Check/RecordTail.purs',
        needle: '  fresh = Subst bindings { fresh = bindings.fresh - 1 }\n',
        replacement: '  fresh = Subst bindings { fresh = bindings.fresh - 2 }\n'
      },
      {
        file: 'src/Features/Check/RecordTail.purs',
        needle: '  bindTheirs reached = bindTail failed reached theirs.meta '
          + 'theirs.fields\n    remainder\n',
        replacement: '  bindTheirs reached = bindTail failed reached '
          + 'theirs.meta theirs.fields\n'
          + '    (Just (Meta (bindings.fresh - 1)))\n'
      }
    ],
    probe: 'r001-shared-remainder',
    message: /independently: E_TOOL: go build failed: .*cannot use/
  },
  {
    // Every field used in place in the struct literal, so Go evaluates the
    // fields in sorted label order, not as written (R001 design §5).
    name: 'r001-field-order', file: 'src/Format/Go/Record.purs',
    needle: '  IR.Local _ → true\n  _ → false\n',
    replacement: '  IR.Local _ → true\n  _ → true\n',
    probe: 'r001-field-order', message: /field order left to Go: a\nb\n/
  },
  {
    // Layouts keyed by labels alone, so `{ x: Int }` and `{ x: Text }`
    // share one Go struct.
    name: 'r001-shape-types',
    edits: [
      {
        file: 'src/Features/Specialize/Layouts.purs',
        needle: '  (Map.lookup fields layouts.numbers)\n',
        replacement: '  (Map.lookup shape layouts.numbers)\n'
      },
      {
        file: 'src/Features/Specialize/Layouts.purs',
        needle: '{ numbers: Map.insert fields layouts.count',
        replacement: '{ numbers: Map.insert shape layouts.count'
      },
      {
        file: 'src/Features/Specialize/Layouts.purs',
        needle: '  fields = sortFields written\n',
        replacement: '  fields = sortFields written\n'
          + '  shape = map (map (const IR.TUnit)) fields\n'
      }
    ],
    probe: 'r001-shape-types',
    message: /field types: E_TOOL: [^]*cannot use/
  },
  {
    // C1 (final review): a type written in a body is not held to its
    // signature's lacks sets, so `{ a: Int, ...r }` in a lambda annotation
    // under `p: { ...r }` passes and `r` may be `{ a: Bool }`; lowering
    // then meets `a` twice, which the record guard reports.
    name: 'r001-body-lacks', file: 'src/Features/Resolve/Lacking.purs',
    needle: '  if Array.elem Syntax.RecordSort signature.sorts then Just\n',
    replacement: '  if false then Just\n',
    probe: 'r001-body-lacks',
    message: /signature tail: E_INTERNAL Duplicate record label/
  },
  {
    // C1 defence in depth: a record whose written labels and tail's image
    // share a label is lowered to a layout declaring that field twice,
    // `{ a, a }`.
    name: 'r001-record-guard', file: 'src/Features/Specialize/Record.purs',
    needle: '  repeated spliced = Set.size (Set.fromFoldable (map fst spliced))'
      + '\n    /= Array.length spliced\n',
    replacement: '  repeated _ = false\n',
    probe: 'r001-record-guard',
    message: /a label declared twice was lowered: \{ a, a \}\n/
  }
];
