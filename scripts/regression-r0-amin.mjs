// R0 a-min tranche 1 regression rows, spread into r0Rows
// (scripts/regression-r0.mjs); probes in test/regression-r0-amin.mjs.
// Each restores one defect in a whole, compiling form.
export const r0AminRows = [
  {
    // Task 15: the duplicate-write check bypassed, so a second write at
    // one path is folded by `Map.insert` and overwrites the first.
    name: 'r0-amin-duplicate-effect',
    file: 'src/Features/Check/Generate/Assemble.purs',
    needle: 'checked items = case duplicate items of\n',
    replacement: 'checked items = case (Nothing ∷ Maybe (Tuple String Path))'
      + ' of\n',
    probe: 'r0-amin-duplicate-effect',
    message: /a duplicate NodeAt write went undetected/
  }
];
