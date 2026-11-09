// Regression rows for the index-first walk, the unnumbered row and the
// §18.163 window classes (dossier §18.163), for the tranche 2 registry;
// probes in test/regression-r0-t2-batch.mjs. Each restores one defect in
// a whole, compiling form.
const walk = 'src/Features/Check/Strategy/ReadBack/Walk.purs';
const trace = 'src/Features/Check/Trace.purs';
const table = 'test/r0-shadow-table.mjs';
const places = 'src/Features/Check/Strategy/ReadBack/EffectPlaces.purs';
const unnumbered = 'src/Domain/Checked/Unnumbered.purs';

export const t2BatchRows = [
  {
    // Every sibling rebuilt before the one indexed: the width cost.
    name: 'r0-t2-walk-rebuilds-siblings',
    file: walk,
    needle: 'reading wrap values index = map wrap (Array.index values '
      + 'index)\n',
    replacement: 'reading wrap values index = Array.index (map wrap values) '
      + 'index\n',
    probe: 'r0-t2-walk-width',
    message: /r0-t2-walk-width: \["Interpolate Just 2000"/
  },
  {
    // An index past the end read as the last item.
    name: 'r0-t2-walk-index-clamped',
    file: walk,
    needle: 'reading wrap values index = map wrap (Array.index values '
      + 'index)\n',
    replacement: 'reading wrap values index = map wrap (Array.index values '
      + '(min index (Array.length values - 1)))\n',
    probe: 'r0-t2-walk-paths',
    message: /r0-t2-walk-paths: \["one past the end"/
  },
  {
    // The raw row kept where the numbering should have rewritten it.
    name: 'r0-t2-unnumbered-collision',
    file: trace,
    needle: '  renumbered (extended numbering resolved) resolved\n',
    replacement: '  map (_ { row = rawForRenumbering row })\n'
      + '    (renumbered (extended numbering resolved) resolved)\n',
    probe: 'r0-t2-unnumbered',
    message: /r0-t2-unnumbered: \["collision: raw 0 reads hole 1: 0"/
  },
  // The caller scan blind: it reports nothing.
  { name: 'r0-t2-unnumbered-scan-blind', tree: 'test', edits: [{ file:
    'test/r0-t2-unnumbered-cases.mjs',
  needle: "  .filter(([module]) => module !== home)"
    + ".flatMap(([module, text]) => [\n",
  replacement: "  .filter(() => false).flatMap(([module, text]) => [\n" }],
  probe: 'r0-t2-unnumbered-scan',
  message: /r0-t2-unnumbered-scan: \["a planted use goes unreported"/ },
  // A second reader takes the raw row out: the caller gate fails.
  { name: 'r0-t2-unnumbered-second-reader', edits: [{ file: places,
    needle: '  AtRoot → Right (matchRow row traced.row)\n',
    replacement: '  AtRoot → Right '
      + '(matchRow row (rawForRenumbering checked.row))\n' },
  { file: places, needle: 'import Domain.Checked.Internal (Open)\n',
    replacement: 'import Domain.Checked.Internal (Open)\n'
      + 'import Domain.Checked.Unnumbered (rawForRenumbering)\n' }],
  probe: 'r0-t2-unnumbered-gate', message: /ReadBack\.EffectPlaces: rawFor/ },
  // The raw-arguments accessor restored: the exports pin fails.
  { name: 'r0-t2-unnumbered-accessor', edits: [{ file: unnumbered,
    needle: '  , unnumberedMentionsTypeVariable\n',
    replacement: '  , unnumberedMentionsTypeVariable\n'
      + '  , unnumberedArguments\n' }, { file: unnumbered,
    needle: '-- The row for the trace\'s substitution',
    replacement: 'unnumberedArguments (UnnumberedRow row) = rowArguments row\n'
      + '\n-- The row for the trace\'s substitution' }],
  probe: 'r0-t2-unnumbered-gate', message: /exports: .*unnumberedArguments/ },
  // §18.163 (4): the refused read-fault class cites a reading.
  { name: 'r0-t2-class-read-fault-reading', tree: 'test', edits: [{
    file: table,
    needle: "  [refusedDecline('a read fault')]: entry(b, readFault, "
      + 'refusedFocus,',
    replacement: "  [refusedDecline('a read fault')]: entry(b, limitation, "
      + 'refusedFocus,' }], probe: 'r0-t6-tooling',
  message: /read fault, refuses: ruled, not a reading: true/ },
  // §18.163 (4): a read-fault decline's loss read as resolved.
  { name: 'r0-t2-class-read-fault-target', tree: 'test', edits: [{
    file: table,
    needle: "    + ' whose effect package was not read', lossTarget, ",
    replacement: "    + ' whose effect package was not read', 'Solved', " }],
  probe: 'r0-t6-tooling',
  message: /read fault: the loss stays unresolved: false/ },
  // §18.163 (4): each ruled class's label flipped.
  { name: 'r0-t2-class-read-fault-label', tree: 'test', edits: [{ file: table,
    needle: "  [compilingDecline('a read fault')]: entry(b, readFault,",
    replacement: "  [compilingDecline('a read fault')]: entry(a, readFault," }],
  probe: 'r0-t6-tooling',
  message: /r0-t6-tooling: .*"read fault, compiles: section §3\.2\(a\)/ },
  { name: 'r0-t2-class-open-label', tree: 'test', edits: [{ file: table,
    needle: "  [refusedDecline('an open requirement')]: entry(a, ",
    replacement: "  [refusedDecline('an open requirement')]: entry(b, " }],
  probe: 'r0-t6-tooling',
  message: /r0-t6-tooling: .*"open requirement, refuses: section §3\.2\(b\)/ }
];
