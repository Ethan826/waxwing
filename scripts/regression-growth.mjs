// Regression row for the partialFirst growth check
// (test/fn-linear-growth.serial.test.mjs), probe in
// test/regression-growth.mjs. CONSTRUCTED, not historical: no earlier
// quadratic in the Specialize path was found in the history (dossier
// 18.132 authorizes a constructed one). Each parameter of a declaration is
// copied by index, and the index is found by scanning the whole parameter
// list first (`at + count - length`, which equals `at`). Every outcome is
// unchanged and the build is clean; the work per declaration becomes
// quadratic in its parameter count. The row shows the ratio assertion's
// sensitivity to that slowdown, not protection against a past bug.
export const growthRows = [
  {
    name: 'partialfirst-growth',
    edits: [
      {
        file: 'src/Features/Specialize/Body.purs',
        needle: '    parameters ← traverse (typed scope declared.span) '
          + 'declared.parameters\n',
        replacement: '    parameters ← traverse (rescanned declared)\n'
          + '      (Array.mapWithIndex (\\at _ → at) declared.parameters)\n'
      },
      {
        file: 'src/Features/Specialize/Body.purs',
        needle: '  inserted declared copy state = state\n',
        replacement: '  rescanned declared at = maybe\' '
          + '(internal TableLookup "rescan" declared.span)\n'
          + '    (typed scope declared.span)\n'
          + '    ( Array.index declared.parameters\n'
          + '        ( at + Array.foldl (\\count _ → count + 1) 0 '
          + 'declared.parameters\n'
          + '            - Array.length declared.parameters\n'
          + '        )\n'
          + '    )\n'
          + '  inserted declared copy state = state\n'
      }
    ],
    probe: 'partialfirst-growth',
    message: /growth ratio [\d.]+ for partialFirst exceeds 3: 20000 against/
  }
];
