// Tranche 2 Task 16 regression rows (the A2 activation gate,
// docs/plans/2026-11-03-a2-activation-gate.md), for the tranche 2
// registry; probe in test/regression-r0-t2-activation.mjs. Each restores
// one defect in the gate's test helpers (its own copy of test/), in a
// whole, compiling form.
const evidence = 'test/r0-t2-activation-evidence.mjs';
const pin = 'test/r0-t2-activation-pin.mjs';
const gate = 'test/r0-t2-activation-gate.mjs';

const helper = (name, file, needle, replacement, message) =>
  ({ name, tree: 'test', edits: [{ file, needle, replacement }],
    probe: 'r0-t2-activation-gate', message });

export const t2ActivationRows = [
  // A ruling the status does not cite read as recorded.
  helper('r0-t2-activation-absent-met', evidence,
    "    return { met: false, line: 'ruling recorded: no' };\n",
    "    return { met: true, line: 'ruling recorded: no' };\n",
    /r0-t2-activation-gate: .*"c6Unruled"/),
  // A cited section taken as the ruling without naming the matter.
  helper('r0-t2-activation-section-unread', evidence,
    '  if (!text.includes(token))\n',
    '  if (false && !text.includes(token))\n',
    /r0-t2-activation-gate: .*"c6WrongSection"/),
  // A1's count not checked: a candidate on no list passes.
  helper('r0-t2-activation-uncounted', pin,
    '      || d.floor + listed !== d.candidates)\n',
    '      || false)\n',
    /r0-t2-activation-gate: .*"uncounted"/),
  // ForcedTail admitted by class, not by the four names (§18.157).
  helper('r0-t2-activation-forced-class', pin,
    '  ...d.forcedTail.filter(entry => !forcedTail.includes(entry.at)\n'
      + '    || !String',
    '  ...d.forcedTail.filter(entry => false\n    || !String',
    /r0-t2-activation-gate: .*"fifthForced"/),
  // A section up to §18.157 read as a ruling (review I1): §18.157
  // itself records C6 as undecided.
  helper('r0-t2-activation-any-section', evidence,
    '  if (!isLater(cite))\n',
    '  if (false && !isLater(cite))\n',
    /r0-t2-activation-gate: .*"c6Early"/),
  // §18.157's figures not checked (review I3): a pin lowered
  // consistently, without a re-pin ruling, reads as approved.
  helper('r0-t2-activation-figures-unchecked', pin,
    '  if (d.candidates === approved.candidates '
      + '&& d.floor === approved.floor\n',
    '  if (true\n',
    /r0-t2-activation-gate: .*"pinLowered"/),
  // The measurement's own budget read before the status's (review I4).
  helper('r0-t2-activation-own-budget', gate,
    '    const budget = perf.budget?.[part]?.[metric];\n',
    '    const budget = file[part]?.[metric]?.budget\n'
      + '      ?? perf.budget?.[part]?.[metric];\n',
    /r0-t2-activation-gate: .*"overOwnBudget"/),
  // Unreadable evidence read as met.
  helper('r0-t2-activation-throw-met', gate,
    "    return result([`evidence unreadable: ${error.message}`], []);\n",
    '    return result([], [`evidence unreadable: ${error.message}`]);\n',
    /r0-t2-activation-gate: .*"unreadable"/)
];
