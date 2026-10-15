// FX025 and R015 regression rows, imported by scripts/regression.mjs; their
// probes are in test/regression-ie.mjs. Each restores one defect in a
// whole, compiling form.
const rowsAsTypes = 'rowsAsTypes indices declarations = traverse_ '
  + '(misusedIn declared)\n  (Array.filter hasRowParameter declarations)\n';
const unchecked = 'rowsAsTypes indices declarations = traverse_ '
  + '(misusedIn declared) []\n';
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
  }
];
