// R0 a-min tranche 1 regression row for the coverage accounting (Task
// 13), spread into r0AminRows (scripts/regression-r0-amin.mjs); probe in
// test/regression-r0-amin-coverage.mjs. It restores the defect in a
// compiling form: the call stays, behind `if false`.
export const coverageRows = [
  {
    // Task 13: an E1 listed beside a G0 atom records no `Equal`, so every
    // fixture row of test/fixtures/r0/effects-coverage.json that names
    // `Equal` loses its obligation. (The effect-only sites O1 and O2 go
    // through Obligation.purs `equalAt` and are covered by Task 7's rows.)
    name: 'r0-amin-coverage-equal',
    file: 'src/Features/Check/Generate/Out.purs',
    needle: '    , effects = [ Obliged (besideAtom origin'
      + ' (Equal left right)) ]\n',
    replacement: '    , effects =\n'
      + '        if false\n'
      + '          then [ Obliged (besideAtom origin (Equal left right)) ]\n'
      + '          else []\n',
    probe: 'r0-amin-coverage-equal',
    message: /coverage fixture rows lost their Equal obligation/
  },
  {
    // Task 13: `consumeAt` records nothing, so every fixture row naming
    // `Consume` at a stage site (call, callback) loses its obligation.
    // The `defer` consumption goes through `deferAt` and stays.
    name: 'r0-amin-coverage-consume',
    file: 'src/Features/Check/Generate/Obligation.purs',
    needle: 'consumeAt place span stage target = effected\n',
    replacement: 'consumeAt place span stage target = when false $ effected\n',
    probe: 'r0-amin-coverage-consume',
    message: /coverage fixture rows lost their Consume obligation/
  }
];
