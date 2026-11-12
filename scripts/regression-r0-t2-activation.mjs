// Tranche 2 Task 16 regression rows (the A2 activation gate,
// docs/plans/2026-11-03-a2-activation-gate.md), for the tranche 2
// registry; probe in test/regression-r0-t2-activation.mjs. Each restores
// one defect in the gate's test helpers (its own copy of test/), in a
// whole, compiling form.
const evidence = 'test/r0-t2-activation-evidence.mjs';
const pin = 'test/r0-t2-activation-pin.mjs';
const gate = 'test/r0-t2-activation-gate.mjs';
const losses = 'test/r0-t2-activation-verdicts.mjs';
const verdicts = 'test/r0-t2-gap-verdicts.mjs';
const programs = 'test/r0-t2-replacement-losses.mjs';

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
      + '    || !isForced',
    '  ...d.forcedTail.filter(entry => false\n    || !isForced',
    /r0-t2-activation-gate: .*"fifthForced"/),
  // A section up to §18.157 read as a ruling (review I1): §18.157
  // itself records C6 as undecided. The early re-pin case fails too.
  helper('r0-t2-activation-any-section', evidence,
    '  if (!isLater(cite))\n',
    '  if (false && !isLater(cite))\n',
    /r0-t2-activation-gate: .*"repinEarly".*"c6Early"/),
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
    /r0-t2-activation-gate: .*"unreadable"/),
  // §18.159 criterion 2: an existing refusal still asked for a loss
  // ruling, as before the verdict file.
  helper('r0-t2-activation-refusal-ruled', losses,
    '  if (losses.length === 0)\n', '  if (false)\n',
    /r0-t2-activation-gate: .*"refusalUnruled"/),
  // A loss read from the file's own label, not from `certify`: a loss
  // marked an existing refusal passes unruled.
  helper('r0-t2-activation-loss-unchecked', verdicts,
    '  ...(entry?.loss === lossOf(entry ?? {}) ? []\n',
    '  ...(true ? []\n',
    /r0-t2-activation-gate: .*"lossMarkedRefusal"/),
  // The verdict file not compared with the pin: a file lacking a
  // pinned entry backs it. (A changed RequirementUnjudged text is also
  // caught by the certify cross-check, so `verdictsStale` holds here.)
  helper('r0-t2-activation-verdicts-stale', verdicts,
    '    problems.push(...apart(name, entries.map(keyOf),\n'
      + '      recorded.map(keyOf)),\n',
    '    problems.push(\n',
    /r0-t2-activation-gate: .*"verdictLacks"/),
  // Losses read from the first denominator only: the effect pin's own
  // read fault is lost unruled.
  helper('r0-t2-activation-loss-one-denominator', losses,
    '  const losses = lossNames(entries.flat());\n',
    '  const losses = lossNames(entries[0]);\n',
    /r0-t2-activation-gate: .*"effectPinLoss"/),
  // certify's verdict not checked against the pin: a ForcedTail
  // relabelled refused reads as an existing refusal.
  helper('r0-t2-activation-certify-unpinned', verdicts,
    '    ...(fixed === null || entry?.certify === fixed ? []\n',
    '    ...(true ? []\n',
    /r0-t2-activation-gate: .*"forcedRelabelled"/),
  // §18.161 (5): criterion 4 reading R034 (2) and (10) alone, so
  // R036 (1)-(3) and T6 count as landed with no row.
  helper('r0-t2-activation-items-two', gate,
    "  ['R034 (10)', 'r034-10'], ['R036 (1)', 'r036-1'],\n"
      + "  ['R036 (2)', 'r036-2'], ['R036 (3)', 'r036-3'], ['T6', 't6']];\n",
    "  ['R034 (10)', 'r034-10']];\n",
    /r0-t2-activation-gate: .*"landedR036x1Null".*"landedT6Null"/),
  // A shared row caught only between the first two items, as before.
  helper('r0-t2-activation-shared-pair', gate,
    '    landedLine(evidence, item, rows[index])), ...sharedLines(rows)];\n',
    '    landedLine(evidence, item, rows[index])),\n'
      + '  ...sharedLines(rows.slice(0, 2))];\n',
    /r0-t2-activation-gate: .*"landedSharedLater"/),
  // A tag read as a prefix: `r036-10` counts for R036 (1).
  helper('r0-t2-activation-tag-prefix', 'test/r0-t2-activation-evidence.mjs',
    "new RegExp(`(^|-)${tag}(-|$)`)", "new RegExp(`(^|-)${tag}`)",
    /r0-t2-activation-gate: .*"landedWrongTag"/),
  // Any text read as a certify refusal: a typo is an existing refusal.
  helper('r0-t2-activation-certify-unrecognised', verdicts,
    '    ...(isCertifyVerdict(entry?.certify) ? []\n',
    '    ...(true ? []\n',
    /r0-t2-activation-gate: .*"certifyUnrecognised"/),
  // A record stale against src read as fresh: src changed since the
  // recorded commit and criteria 5 and 6 still met.
  helper('r0-t2-activation-src-unchecked', evidence,
    '  return at === head ? []\n', '  return true ? []\n',
    /r0-t2-activation-gate: .*"comparisonStale","bothStale".*"perfStale"/),
  // A record without a full commit sha read as fresh.
  helper('r0-t2-activation-commit-unrequired', evidence,
    '    return [`${path}: no commit (a full sha) recorded`];\n',
    '    return [];\n',
    /r0-t2-activation-gate: .*"comparisonNoCommit","comparisonShortCommit"/),
  // Criterion 2's whole programs (§18.186): a census or gap-list
  // program left out of the loss file read as assessed.
  helper('r0-t2-activation-losses-omission', programs,
    '    if (!seen.has(origin))\n', '    if (false)\n',
    /r0-t2-activation-gate: .*"lossOmitted"/),
  // A program recorded twice read as one.
  helper('r0-t2-activation-losses-repeat', programs,
    '    if (seen.has(program.origin))\n', '    if (false)\n',
    /r0-t2-activation-gate: .*"lossRepeated"/),
  // A program named by sources other than its own.
  helper('r0-t2-activation-losses-named', programs,
    '    if (!Array.isArray(program.named) || sorted(program.named)\n',
    '    if (false && sorted(program.named)\n',
    /r0-t2-activation-gate: .*"lossMisnamed"/),
  // A class its facts do not give (a lost program as not lost).
  helper('r0-t2-activation-losses-class', programs,
    '    else if (program.class !== classOf(program, known))\n',
    '    else if (false)\n', /r0-t2-activation-gate: .*"lossMisclassed"/),
  // A lost program met without a live-replacement ruling accepting it.
  helper('r0-t2-activation-losses-unaccepted', programs,
    '  if (unaccepted.length > 0)\n', '  if (false)\n',
    /r0-t2-activation-gate: .*"lossUnaccepted"/),
  // A known defect registered without a ruling naming its id.
  helper('r0-t2-activation-losses-defect-unruled', programs,
    "      ...(typeof defect?.id === 'string' && recorded(evidence.dossier,\n",
    '      ...(true || recorded(evidence.dossier,\n',
    /r0-t2-activation-gate: .*"defectIdUnnamed"/),
  // A registered defect naming no recorded blocker read as valid.
  helper('r0-t2-activation-losses-defect-stray', programs,
    '      ...(program?.blockers.some(blocker =>\n',
    '      ...(true || program?.blockers.some(blocker =>\n',
    /r0-t2-activation-gate: .*"defectNoBlocker"/),
  // One registered blocker of several taken for the whole program.
  helper('r0-t2-activation-losses-defect-partial', programs,
    '  return program.blockers.every(blocker =>\n',
    '  return program.blockers.some(blocker =>\n',
    /r0-t2-activation-gate: .*"defectPartial"/),
  // An acceptance read from a section that only names the program and
  // live replacement (review, 2026-11-12: "Held: live replacement").
  helper('r0-t2-activation-losses-accept-unrecorded', programs,
    '    ...(recorded(evidence.dossier, cite, acceptLine(origin)) ? []\n',
    '    ...(true ? []\n', /r0-t2-activation-gate: .*"lossHeldCited"/),
  // An accepted entry for a program that is not lost.
  helper('r0-t2-activation-losses-accept-unlost', programs,
    "    ...(byOrigin.get(origin)?.class === 'lost' ? []\n",
    '    ...(true ? []\n', /r0-t2-activation-gate: .*"lossAcceptedNotLost"/),
  // The certification losses dropped from the criterion: supporting
  // evidence that no longer counts.
  helper('r0-t2-activation-losses-supporting', gate,
    '  return { met: programs.met && certification.met,\n',
    '  return { met: programs.met,\n',
    /r0-t2-activation-gate: .*"lossUnruled"/)
];
