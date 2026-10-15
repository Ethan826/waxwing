// FX025, R015, R016, R017 and R010 regression rows, imported by
// scripts/regression.mjs; their probes are in test/regression-ie.mjs.
// Each restores one defect in a whole, compiling form.
const rowsAsTypes = 'rowsAsTypes indices declarations = traverse_ '
  + '(misusedIn declared)\n  (Array.filter hasRowParameter declarations)\n';
const unchecked = 'rowsAsTypes indices declarations = traverse_ '
  + '(misusedIn declared) []\n';
const bodyUses = '              (typeOccurrences signature.declared '
  + 'reference)\n';
const noBodyUses = '              (const [] (typeOccurrences '
  + 'signature.declared reference))\n';
// Body types checked for row sorts only, as R016 first did (R017).
const everySort = '  differs sort = sort /= occurrence.sort\n';
const rowSortsOnly = '  differs sort = sort /= occurrence.sort && rows sort\n'
  + '  rows sort = sort /= Syntax.TypeSort\n'
  + '    && occurrence.sort /= Syntax.TypeSort\n';
// The instantiation rule judging every slot as a type: a record tail is
// invisible to it.
const asTypes = [
  {
    file: 'src/Features/Check/Instantiation.purs',
    needle: 'import Domain.Syntax (Diagnostic, Span, problemAt)\n',
    replacement: 'import Domain.Syntax (Diagnostic, Span, problemAt)\n'
      + 'import Domain.Syntax as Syntax\nimport Data.Tuple (Tuple(..))\n'
  },
  {
    file: 'src/Features/Check/Instantiation.purs',
    needle: '  slots function = judged function.sorts instantiation\n',
    replacement: '  slots function = map asType '
      + '(judged function.sorts instantiation)\n'
      + '  asType (Tuple _ ty) = Tuple Syntax.TypeSort ty\n'
  }
];
export const ieRows = [
  {
    // The unbound row variable lost its place: an internal error at 0.
    name: 'fx025-unbound-row',
    file: 'src/Features/Resolve/Row.purs',
    needle: '  missing span name _ = Left\n'
      + '    (Syntax.problemAt (Unbound UnboundTypeVariable name) span)\n',
    replacement: '  missing _ _ _ = Left (Syntax.problemAt '
      + '(Internal "Missing row variable")\n'
      + '    { start: Syntax.origin, end: Syntax.origin })\n',
    probe: 'fx025-unbound-row',
    message: /unbound row: E_INTERNAL Missing row variable/
  },
  {
    // No check of row parameters written as types: the effect row reaches
    // lowering as a type variable that was never numbered.
    name: 'r015-effect-row',
    file: 'src/Features/Resolve/Sorts.purs',
    needle: rowsAsTypes,
    replacement: unchecked,
    probe: 'r015-effect-row',
    message: /effect row as type: E_INTERNAL Invalid type variable/
  },
  {
    // The same unchecked use of a record row parameter is accepted.
    name: 'r015-record-row',
    file: 'src/Features/Resolve/Sorts.purs',
    needle: rowsAsTypes,
    replacement: unchecked,
    probe: 'r015-record-row',
    message: /record row as type: accepted/
  },
  {
    // Body types unchecked against the signature's sorts: an effect row
    // as a lambda's record tail reads as a missing field.
    name: 'r016-effect-as-record',
    file: 'src/Features/Resolve/BodySorts.purs',
    needle: bodyUses,
    replacement: noBodyUses,
    probe: 'r016-effect-as-record',
    message: /effect row as record: E_TYPE a is not a field of/
  },
  {
    // The same: a record row as a lambda's effect row is accepted.
    name: 'r016-record-as-effect',
    file: 'src/Features/Resolve/BodySorts.purs',
    needle: bodyUses,
    replacement: noBodyUses,
    probe: 'r016-record-as-effect',
    message: /record row as effect: accepted/
  },
  {
    // A signature's effect row as a lambda's parameter type reaches
    // lowering as a type variable that was never numbered.
    name: 'r017-row-as-type',
    file: 'src/Features/Resolve/BodySorts.purs',
    needle: everySort,
    replacement: rowSortsOnly,
    probe: 'r017-row-as-type',
    message: /row as type: E_INTERNAL Invalid type variable/
  },
  {
    // A signature's type variable as a lambda's record tail reads as a
    // missing field.
    name: 'r017-type-as-row',
    file: 'src/Features/Resolve/BodySorts.purs',
    needle: everySort,
    replacement: rowSortsOnly,
    probe: 'r017-type-as-row',
    message: /type as row: E_TYPE b is not a field of/
  },
  {
    // A call that nests its record row reaches the specialization limit.
    name: 'r010-nested-row',
    edits: asTypes,
    probe: 'r010-nested-row',
    message: /nested row: E_SPECIALIZATION More than 10000 specializations/
  },
  {
    // So does mutual recursion through a bare pass-back.
    name: 'r010-mutual-row',
    edits: asTypes,
    probe: 'r010-mutual-row',
    message: /mutual row: E_SPECIALIZATION More than 10000 specializations/
  }
];
