// R0 a-min tranche 1 regression row for the effect pin (Task 14),
// spread into r0AminRows (scripts/regression-r0-amin.mjs); probe in
// test/regression-r0-amin-effects-pin.mjs. It restores the defect in a
// compiling form: the call stays, behind `when false`.
export const effectsPinRows = [
  {
    // Task 14: one recorded obligation kind (E9's FailConcrete) is
    // dropped, so every declaration with a `fail` has a different
    // effect problem and its digest leaves test/fixtures/r0/effects.json.
    name: 'r0-amin-effects-pin-obligation',
    file: 'src/Features/Check/Generate/Obligation.purs',
    needle: '  siteAt site PayloadHead span (FailConcrete payload)\n',
    replacement: '  when false $\n'
      + '    siteAt site PayloadHead span (FailConcrete payload)\n',
    probe: 'r0-amin-effects-pin-obligation',
    message: /effect pin: \d+ of \d+ sampled declarations moved/
  }
];
