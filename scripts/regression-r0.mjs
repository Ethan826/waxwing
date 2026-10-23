// R0 shadow tranche regression rows, imported by scripts/regression.mjs;
// their probes are in test/regression-r0.mjs. Each restores one defect in
// a whole, compiling form.
export const r0Rows = [
  {
    // Task 1.2: the driver stops at the first failing body, as `traverse`
    // over Either did, so a later broken declaration is hidden (G-hide).
    name: 'r0-first-left-hides',
    file: 'src/Features/Check/Outcomes.purs',
    needle: '  bare = map (declared holders program) program.functions\n',
    replacement: '  bare = upTo (map (declared holders program)'
      + ' program.functions)\n'
      + '  upTo entries = maybe\' (const entries)\n'
      + '    (\\index → Array.take (index + 1) entries)\n'
      + '    (Array.findIndex failed entries)\n'
      + '  failed declaration = either (const true) (const false)'
      + ' declaration.report.today\n',
    probe: 'r0-first-left-hides',
    message: /second broken declaration hidden: E_TYPE Expected Int, found/
  }
];
