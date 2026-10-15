// FX025 and R015 regression rows, imported by scripts/regression.mjs; their
// probes are in test/regression-ie.mjs. Each restores one defect in a
// whole, compiling form.
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
  }
];
