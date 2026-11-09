// The hole contract's lacks/disjoint amendment regression rows
// (docs/plans/r0-hole-contract-amendment.md), the read-back's sort
// carry (Task 4.4b's review) and Task 4.5's hint row, spread into r0Rows
// (scripts/regression-r0.mjs); probes in test/regression-r0-witness.mjs
// and, for the hint row, test/regression-r0-online.mjs.
const file = 'src/Features/Check/Strategy/HoleContract.purs';

const substitutionFile = 'src/Features/Check/Strategy/Substitution.purs';

export const r0WitnessRows = [
  {
    // The equation arm judged at the defaults: route's `u`, whose
    // unequal equation holds once `u` is `{}`, is admitted (E9).
    name: 'r0-hole-equation-defaulted',
    file,
    needle: '    | under images one == under images other → []\n',
    replacement: '    | either (const false) (const true)'
      + ' (atomUnder known (map settled images) entry) → []\n',
    probe: 'r0-hole-contract-skipped',
    message: /route's defaulted u was witnessed: Witnessed/
  },
  {
    // The lacks/disjoint arm judging without the defaults: a hole tail
    // has no facts, so `{}`'s atoms are refused (R022's probes).
    name: 'r0-hole-arm-defaults-skipped',
    file,
    needle: '    (atomUnder known (map settled images) entry)\n',
    replacement: '    (atomUnder known images entry)\n',
    probe: 'r0-hole-arm-defaults-skipped',
    message: /r022-disjoint: no witness at the default: HoleContract/
  },
  {
    // Task 4.4b's carry: the sort applied at every position, so a
    // row-sorted rest's bare hole reads as a row tail, where lowering
    // reads it as `Int` (Specialize/Body.purs `copyRest`).
    name: 'r0-readback-sort-everywhere',
    file: 'src/Features/Check/Strategy/ReadBack/Position.purs',
    needle: '  plain = map Plain\n',
    replacement: '  plain = map BySort\n',
    probe: 'r0-readback-sort-everywhere',
    message: /the rest's bare hole read as Record/
  },
  {
    // Task 4.5 fix round (review minor 2): only the constructor
    // pattern's slot arm reads by sort, where lowering reads the
    // pattern's type plainly (Specialize/Body.purs `copyPattern`).
    name: 'r0-readback-pattern-slot-sorted',
    file: 'src/Features/Check/Strategy/ReadBack/Position.purs',
    needle: '  AtPattern (Checked.Pattern found) → Plain <$>\n',
    replacement: '  AtPattern (Checked.Pattern found) → BySort <$>\n',
    probe: 'r0-readback-pattern-slot-sorted',
    message: /the pattern slot's bare hole read as Record/
  },
  {
    // Task 4.5 fix round (ruling R-b3): the online search's hint drops
    // today's text, keeping only the place.
    name: 'r0-hint-text-dropped',
    file: 'src/Features/Check/Strategy/Online.purs',
    needle: '      <> legacyText diagnostic\n',
    replacement: '      <> const "" (legacyText diagnostic)\n',
    probe: 'r0-hint-text-dropped',
    message: /no legacy text: untrusted search hint/
  },
  {
    // BACKLOG R026, restored on the package path (dossier §18.172): the
    // check judges the certificate's pre-default σ while the witness binds
    // the package, so a forged package the check never sees reaches `build`.
    name: 'r0-certified-split',
    edits: [
      { file: substitutionFile,
        needle: 'validate = validatedBy resultOf\n',
        replacement: 'validate problem package = validatedBy resultOf problem'
          + ' (erase (settle package)) package\n' },
      { file: substitutionFile,
        needle: '  ∷ RecordedProblem → EffectPackage → '
          + 'Either CheckRefusal Certified\n'
          + 'certifyPackage = validatedBy minted\n',
        replacement: '  ∷ RecordedProblem → Substitution → EffectPackage → '
          + 'Either CheckRefusal Certified\n'
          + 'certifyPackage problem judged package = validatedBy minted '
          + 'problem (map settled judged) package\n' },
      { file: substitutionFile,
        needle: '  → RecordedProblem\n  → EffectPackage\n'
          + '  → Either CheckRefusal r\n'
          + 'validatedBy finish problem package = do\n',
        replacement: '  → RecordedProblem\n  → Substitution\n'
          + '  → EffectPackage\n  → Either CheckRefusal r\n'
          + 'validatedBy finish problem judged package = do\n' },
      { file: substitutionFile,
        needle: '  validity ← checkSubstitution problem '
          + '(erase (settle package))\n',
        replacement: '  validity ← checkSubstitution problem judged\n' },
      { file: substitutionFile,
        needle: '  judgeObligations problem completed\n', replacement: '' },
      { file: 'src/Features/Check/Strategy/Online.purs',
        needle: '  either unread (certifyPackage problem) '
          + 'certificate.effects\n',
        replacement: '  either unread (certifyPackage problem '
          + 'certificate.unsettled)\n    certificate.effects\n' }
    ],
    probe: 'r0-certified-split',
    message: /id2 forged to Bool was Solved/
  }
];
