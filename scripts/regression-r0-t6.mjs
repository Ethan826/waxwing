// T6 regression rows (dossier §18.161 (4): RT8 reads declines as
// declines, the window reports RT8 defects), for the tranche 2
// registry; probe in test/regression-r0-t6.mjs. Each restores one defect
// in the test helpers (its own copy of test/), in a whole, running form.
// Each name carries `t6` for activation-gate criterion 4.
const account = 'test/r0-rt8-account.mjs';
const classes = 'test/r0-shadow-classes.mjs';
const summary = 'test/r0-shadow-summary.mjs';

const helper = (name, file, needle, replacement, message) =>
  ({ name, tree: 'test', edits: [{ file, needle, replacement }],
    probe: 'r0-t6-tooling', message });

const refusals = 'test/r0-rt8-refusals.mjs';

export const t6Rows = [
  // The defect the minting comparison found: a ClaimsComplete decline
  // (`NotCertifiable`) labelled DEFECT.
  helper('r0-t6-rt8-declines-defect', refusals,
    "  case 'Declines': {\n",
    "  case 'Declines': if (named(attempt.value1) !== 'Heuristic')\n"
      + '    return `DEFECT: candidate refused, ${refusal(attempt)}`;\n'
      + '  {\n',
    /r0-t6-tooling: .*"NotCertifiable ClaimsComplete: DEFECT/),
  // A Heuristic candidate's decline read as the ambiguous read-back.
  helper('r0-t6-rt8-heuristic-ambiguous', refusals,
    '  switch (named(read)) {\n',
    "  if (named(attempt.value1) === 'Heuristic') return ambiguousClass;\n"
      + '  switch (named(read)) {\n',
    /r0-t6-tooling: .*"NotCertifiable Heuristic: ambiguous/),
  // A decline where today refuses labelled DEFECT.
  helper('r0-t6-rt8-refused-decline-defect', refusals,
    "  if (named(read) !== 'Declines' || refusal(attempt) === "
      + "'RequirementUnjudged')\n",
    '  if (true)\n',
    /r0-t6-tooling: .*"NotCertifiable today refuses: DEFECT/),
  // Fix round 1, C1: a RecordDefect read as an intended decline, as
  // Decide's `reading` alone would read it.
  { name: 'r0-t6-rt8-record-defect-declines', tree: 'test',
    edits: [{ file: refusals,
      needle: "    && refusal(attempt) === 'RecordDefect')\n",
      replacement: "    && refusal(attempt) === 'RecordDefect' && false)\n" },
    { file: refusals,
      needle: "  EffectsUnchecked: 'a limitation', EffectsUnread: 'a read"
        + " fault' };\n",
      replacement: "  EffectsUnchecked: 'a limitation', EffectsUnread: 'a read"
        + " fault',\n  RecordDefective: 'a limitation' };\n" }],
    probe: 'r0-t6-tooling',
    message: /r0-t6-tooling: .*"RecordDefect ClaimsComplete: declined by/ },
  // Fix round 1, I1: a verdict's RecordDefective block counted expected.
  helper('r0-t6-rt8-record-block-expected', refusals,
    '  return recordBlocked(decision.verdict)\n', '  return false\n',
    /r0-t6-tooling: .*"RecordDefective block, Accepted: \(a\) blocked/),
  // Fix round 1, I2: a validator refusal of a Heuristic candidate read
  // as the ambiguous several-tail read-back.
  helper('r0-t6-rt8-heuristic-validator-ambiguous', refusals,
    "  case 'RefusedHeuristic': return g0Refusals.includes(refusal(attempt))"
      + '\n',
    "  case 'RefusedHeuristic': return true\n",
    /r0-t6-tooling: .*"Malformed Heuristic: ambiguous/),
  // The window's classifier throwing at load on an RT8 defect.
  helper('r0-t6-window-defect-throws', classes,
    "  if (facts.rt8.startsWith('DEFECT')) return rt8DefectClass;\n",
    "  if (facts.rt8.startsWith('DEFECT')) fail(facts, 'an RT8 defect');\n",
    /r0-t6-tooling: .*"RT8 defect, compiles: threw/),
  // An RT8 defect relabelled as agreement (no row).
  helper('r0-t6-window-defect-harmless', classes,
    'import { compilingDecline, refusedDecline, rt8DefectClass }\n',
    'const rt8DefectClass = null;\n'
      + 'import { compilingDecline, refusedDecline }\n',
    /r0-t6-tooling: .*"RT8 defect, compiles: null/),
  // An RT8 defect left out of the summary's defects.
  helper('r0-t6-window-defect-unreported', summary,
    '    .map(row => `${row.at}: ${row.rt8}`)]\n',
    '    .filter(row => false)]\n',
    /r0-t6-tooling: .*"RT8 defect listed/),
  // Fix round 1, M4: a known defect's RT8 defect left out.
  helper('r0-t6-window-known-defect-unlisted', summary,
    "filter(row => row.rt8.startsWith('DEFECT'))",
    "filter(row => row.class !== 'defect' && row.rt8.startsWith('DEFECT'))",
    /r0-t6-tooling: .*"known and RT8 defect both listed/),
  // A check's decline with no window class: the classifier throws.
  helper('r0-t6-window-decline-unclassed', classes,
    '  if (checkDeclined.test(rt8))\n', '  if (false)\n',
    /r0-t6-tooling: .*"decline, compiles: threw/),
  // T6's classes listed when absent, which would move window.json.
  helper('r0-t6-window-always-listed', summary,
    '    ...Object.keys(t6Classes).filter(name => present.has(name))];\n',
    '    ...Object.keys(t6Classes)];\n',
    /r0-t6-tooling: .*"no T6 class unless present/)
];
