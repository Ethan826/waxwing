// Perf-side regression proofs, run by `npm run perf` (scripts/perf.mjs)
// after the perf files, through the regression runner; never by verify.
// Each row restores one defect in an isolated copy like the routine rows,
// but its probe (test/perf-regression.mjs) holds an absolute time budget, so
// a fixed compiler passing and a restored defect failing is a performance
// qualification result. A later growth check (test/growth.mjs) is a
// candidate replacement for the budget.
export const perfRows = [
  {
    // A 20,000-type duplicate scan must not rescan per type.
    entry: 'test/perf-regression.mjs',
    name: 'duplicate-scan-timing',
    file: 'src/Features/Resolve/TypeValidation.purs',
    needle: 'uniqueCtor { repeats, entry }\n'
      + '    | repeats = reportEarliest globals entry.name\n'
      + '    | otherwise = Right unit',
    replacement: 'uniqueCtor { repeats, entry } = when repeats\n'
      + '    (reportEarliest globals entry.name)',
    probe: 'duplicate-scan-timing',
    message: /large-source duplicate regression took/
  }
];
