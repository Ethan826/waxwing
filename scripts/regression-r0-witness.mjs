// The hole contract's lacks/disjoint amendment regression rows
// (docs/plans/r0-hole-contract-amendment.md) and the read-back's sort
// carry (Task 4.4b's review), spread into r0Rows
// (scripts/regression-r0.mjs); probes in test/regression-r0-witness.mjs.
const file = 'src/Features/Check/Strategy/HoleContract.purs';

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
    needle: '  plain = map readType\n',
    replacement: '  plain = map (readSorted sort)\n',
    probe: 'r0-readback-sort-everywhere',
    message: /the rest's bare hole read as Record/
  }
];
