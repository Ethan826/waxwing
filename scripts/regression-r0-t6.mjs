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

export const t6Rows = [
  // The defect the minting comparison found: a ClaimsComplete decline
  // (`NotCertifiable`, `RecordDefect`) labelled DEFECT.
  helper('r0-t6-rt8-declines-defect', account,
    '  const read = named(reading(attempt));\n',
    "  const read = named(attempt.value1) === 'Heuristic'\n"
      + "    ? named(reading(attempt)) : refusal(attempt) === 'RequirementOpen'"
      + "\n    ? 'Declines' : 'RefusedComplete';\n",
    /r0-t6-tooling: .*"NotCertifiable ClaimsComplete: DEFECT/),
  // A Heuristic candidate's decline read as the ambiguous read-back.
  helper('r0-t6-rt8-heuristic-ambiguous', account,
    "  case 'Declines': return refusal(attempt) === 'RequirementOpen'\n",
    "  case 'Declines': if (named(attempt.value1) === 'Heuristic')\n"
      + "    return 'ambiguous several-tail read-back (Heuristic)';\n"
      + "    return refusal(attempt) === 'RequirementOpen'\n",
    /r0-t6-tooling: .*"RecordDefect Heuristic: ambiguous/),
  // A decline where today refuses labelled DEFECT.
  helper('r0-t6-rt8-refused-decline-defect', account,
    "  case 'CheckFailed': return named(reading(attempt)) === 'Declines'\n",
    "  case 'CheckFailed': return false\n",
    /r0-t6-tooling: .*"RecordDefect today refuses: DEFECT/),
  // The window's classifier throwing at load on an RT8 defect.
  helper('r0-t6-window-defect-throws', classes,
    "  if (facts.rt8.startsWith('DEFECT')) return rt8DefectClass;\n",
    "  if (facts.rt8.startsWith('DEFECT')) fail(facts, 'an RT8 defect');\n",
    /r0-t6-tooling: .*"RT8 defect, compiles: threw/),
  // An RT8 defect relabelled as agreement (no row).
  helper('r0-t6-window-defect-harmless', classes,
    "import { rt8DefectClass } from './r0-shadow-table.mjs';\n",
    'const rt8DefectClass = null;\n',
    /r0-t6-tooling: .*"RT8 defect, compiles: null/),
  // An RT8 defect left out of the summary's defects.
  helper('r0-t6-window-defect-unreported', summary,
    '  ...programs.flatMap(rowsOf).filter(row => row.class === rt8DefectClass)'
      + '\n    .map(row => `${row.at}: ${row.rt8}`)]\n',
    '  ]\n',
    /r0-t6-tooling: .*"RT8 defect listed/),
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
