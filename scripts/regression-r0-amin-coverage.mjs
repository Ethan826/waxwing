// R0 a-min tranche 1 regression rows for the coverage accounting (Task
// 13, and Task 9's records, review 2 P2-1), spread into r0AminRows
// (scripts/regression-r0-amin.mjs); probes in
// test/regression-r0-amin-coverage.mjs. Each restores its defect in a
// compiling form: the call stays, behind `if false` or `when false`.
const effect = 'src/Features/Check/Generate/Effect.purs';
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
  },
  {
    // Task 9: a `with` over an MHandler records no installed-C
    // consumption (E5's `AtInstalledC`), so the fixture row
    // "installation's edge ρ partner ⊑ C label" loses its obligation.
    name: 'r0-amin-coverage-installed-c',
    file: effect,
    needle: '      *> consumedAt site span\n'
      + '        { site: AtInstalledC\n'
      + '        , source: fromMaybe rows.inference rows.clauses\n'
      + '        , target: context.ambient\n'
      + '        , marks: true\n'
      + '        , bare: true\n'
      + '        }\n',
    replacement: '      *> when false\n'
      + '        ( consumedAt site span\n'
      + '            { site: AtInstalledC\n'
      + '            , source: fromMaybe rows.inference rows.clauses\n'
      + '            , target: context.ambient\n'
      + '            , marks: true\n'
      + '            , bare: true\n'
      + '            }\n'
      + '        )\n',
    probe: 'r0-amin-coverage-installed-c',
    message: /lost their Consume\[AtInstalledC\] obligation: installation's/
  },
  {
    // Task 9: a `with` records no `Install` (E5), so the fixture row
    // "owned C at a use" loses its obligation.
    name: 'r0-amin-coverage-install',
    file: effect,
    needle: '  siteAt (at context path (ExprRule 21)) InstallSite span\n'
      + '    ( Install\n'
      + '        { frame: Frame path, handler: handlerType, ambient:'
      + ' context.ambient }\n'
      + '    )\n',
    replacement: '  when false\n'
      + '    ( siteAt (at context path (ExprRule 21)) InstallSite span\n'
      + '        ( Install\n'
      + '            { frame: Frame path, handler: handlerType, ambient:'
      + ' context.ambient }\n'
      + '        )\n'
      + '    )\n',
    probe: 'r0-amin-coverage-install',
    message: /lost their Install obligation: owned C at a use/
  }
];
