// Tranche 2 Task 13 regression rows (honest packages through I3 and the
// validator; design §I Task 8, dossier §18.155 (7), (8)), spread into
// t2Rows (scripts/regression-r0-t2.mjs); probes in
// test/regression-r0-t2-honest.mjs. Each restores one defect in a whole,
// compiling form: the gate's rows edit the test helpers (its own copy
// of test/), the others the compiler.
const gate = 'test/r0-t2-honest-gate.mjs';

const helper = (name, file, needle, replacement, probe, message) =>
  ({ name, tree: 'test', edits: [{ file, needle, replacement }], probe,
    message });

export const t2HonestRows = [
  // The pin script's admission takes any refusal G0 also gives: a
  // validator refusal certify accepts is admitted into (b).
  helper('r0-t2-honest-admits-refusal', gate,
    '    if (!isUnjudged(entry.refusal) || !entry.sameG0\n'
      + '      || entry.certify !== entry.refusal)\n',
    '    if (!entry.sameG0 && entry.certify !== \'accepted\')\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"otherRefusal"/),
  // The lists compared one way only: a pinned entry that vanished
  // passes.
  helper('r0-t2-honest-one-way', gate,
    '  ...pinned.filter(item => !found.includes(item))\n',
    '  ...pinned.filter(item => !found.includes(item) && false)\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"removedEntry"/),
  // The floor read as one lower than pinned.
  helper('r0-t2-honest-floor', gate,
    '    ...(observed.validated >= pin.floor ? []\n',
    '    ...(observed.validated >= pin.floor - 1 ? []\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"belowFloor"/),
  // Ruling (8)'s stages looked for at the wrong site kind: none found,
  // and the check would hold vacuously; its count detects it.
  helper('r0-t2-honest-stages-found', 'test/r0-t2-honest-stages.mjs',
    "    if (named(site.site) !== 'AtStage' || named(role) !== 'Consumed')\n",
    "    if (named(site.site) !== 'AtCall' || named(role) !== 'Consumed')\n",
    'r0-t2-honest-stages', /r0-t2-honest-stages: 0 dropped stages/),
  {
    // Holes left unsettled: a dropped stage keeps its hole tail, so it
    // does not settle empty (ruling (8)'s second part detects it).
    name: 'r0-t2-honest-stage-settle',
    file: 'src/Features/Check/Strategy/Effects/Package.purs',
    needle: 'settleRow row = { labels: map settleLabel row.labels, '
      + 'tail: rigid =<< row.tail }\n',
    replacement: 'settleRow row = { labels: map settleLabel row.labels, '
      + 'tail: row.tail }\n',
    probe: 'r0-t2-honest-stages',
    message: /r0-t2-honest-stages: .*does not settle empty/
  },
  {
    // The implicit annotation tail left `EffRigid ι` (design §B.5, the
    // generation correction reverted): H2 fails. Observed: 10 of the 11
    // refuse (9 `ObligationFailed` at their `InstallR` consumption, 1
    // `NotCertifiable RigidExact`), not at E1 as §B.5 reasoned;
    // form.annotation-label.json#g validates either way.
    name: 'r0-t2-honest-annotation-rigid',
    file: 'src/Features/Check/Generate/Marked.purs',
    needle: '    | variable == EffRigid implicit = EffFresh path EffectOf\n',
    replacement: '    | variable == EffRigid implicit && false ='
      + ' EffFresh path EffectOf\n',
    probe: 'r0-t2-honest-annotated',
    message: /r0-t2-honest-annotated: 10 of 11 not validated/
  }
];
