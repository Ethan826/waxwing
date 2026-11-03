// Tranche 2 Task 13 regression rows (honest packages through I3 and the
// validator; design §I Task 8, dossier §18.155 (7), (8)), spread into
// t2Rows (scripts/regression-r0-t2.mjs); probes in
// test/regression-r0-t2-honest.mjs. Each restores one defect in a whole,
// compiling form: the gate's rows edit the test helpers (its own copy
// of test/), the others the compiler.
const gate = 'test/r0-t2-honest-gate.mjs';
const repinRule = 'test/r0-t2-honest-repin.mjs';
const fell = "  .filter(key => now[key] < old[key])\n";

const helper = (name, file, needle, replacement, probe, message) =>
  ({ name, tree: 'test', edits: [{ file, needle, replacement }], probe,
    message });

export const t2HonestRows = [
  // Admission takes a refusal `certify` accepts into (b).
  helper('r0-t2-honest-admits-refusal', gate,
    '    if (!unjudged.includes(entry.at) || !isUnjudged(entry.refusal)\n'
      + '      || !entry.sameG0 || entry.certify !== entry.refusal)\n',
    '    if (entry.certify !== \'accepted\' && !entry.sameG0)\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"otherRefusal"/),
  // List (b) by kind, not identity: a new RequirementUnjudged with G0's
  // own refusal is admitted.
  helper('r0-t2-honest-unnamed-refusal', gate,
    '    if (!unjudged.includes(entry.at) || !isUnjudged(entry.refusal)\n',
    '    if (!isUnjudged(entry.refusal)\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"newRefusal"/),
  // The four ForcedTail refusals admitted by class, not identity
  // (§18.157): a fifth is admitted.
  helper('r0-t2-honest-forced-unnamed', gate,
    '    if (!forcedTail.includes(entry.at) '
      + '|| entry.certify !== \'accepted\')\n',
    '    if (entry.certify !== \'accepted\')\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"fifthAdmitted"/),
  // The pinned ForcedTail list left out of the gate's comparison: a
  // fifth, or one of the four gone, passes the list check.
  helper('r0-t2-honest-forced-ungated', gate,
    '    ...apart(\'ForcedTail\', listed(pin.forcedTail),\n',
    '    ...apart(\'ForcedTail\', listed(observed.forcedTail),\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"forcedMissing"/),
  // The re-pin rule without its vanished check: an entry leaves (a) or
  // (b) unexplained.
  helper('r0-t2-honest-repin-vanish', repinRule,
    '.filter(entry => !kept.has(entry.at))\n',
    '.filter(entry => !kept.has(entry.at) && false)\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"repinVanish"/),
  // A floor lowered by one passes the re-pin rule unexplained.
  helper('r0-t2-honest-repin-floor', repinRule, fell,
    '  .filter(key => now[key] < old[key] - 1)\n',
    'r0-t2-honest-gate', /r0-t2-honest-gate: .*"repinLowered"/),
  // The pre-§18.157 rule: an explanation permits a lower floor or
  // candidate count.
  helper('r0-t2-honest-repin-explained', repinRule,
    '        problems.push(...fallen(name, old, now));\n',
    '        (options.explanation === undefined ? problems : covers)\n'
      + '          .push(...fallen(name, old, now));\n',
    'r0-t2-honest-gate',
    /r0-t2-honest-gate: .*"explainedFloor","explainedCandidates"/),
  // Earlier explanations dropped on a re-pin.
  helper('r0-t2-honest-repin-keeps', repinRule,
    '    explanations: [...before?.explanations ?? [], ...added] } };\n',
    '    explanations: [...added] } };\n',
    'r0-t2-honest-gate', /explanations not carried forward/),
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
