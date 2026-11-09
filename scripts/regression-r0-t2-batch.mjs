// Regression rows for the index-first walk, the unnumbered row and the
// §18.163 window classes (dossier §18.163), for the tranche 2 registry;
// probes in test/regression-r0-t2-batch.mjs. Each restores one defect in
// a whole, compiling form.
const walk = 'src/Features/Check/Strategy/ReadBack/Walk.purs';
const trace = 'src/Features/Check/Trace.purs';
const table = 'test/r0-shadow-table.mjs';
const places = 'src/Features/Check/Strategy/ReadBack/EffectPlaces.purs';
const unnumbered = 'src/Domain/Checked/Unnumbered.purs';

const shadowGate = 'test/r0-t2-shadow-gate.mjs';
const shadowRow = (name, needle, replacement, message) => ({ name, tree: 'test',
  edits: [{ file: shadowGate, needle, replacement }],
  probe: 'r0-t2-shadow-gate', message });

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
  // The trace re-exports the module: the caller gate fails.
  { name: 'r0-t2-unnumbered-reexport', edits: [{ file: trace,
    needle: '  ( module Features.Check.Trace.Types\n',
    replacement: '  ( module Features.Check.Trace.Types\n'
      + '  , module Domain.Checked.Unnumbered\n' }],
  probe: 'r0-t2-unnumbered-gate', message: /Trace: re-export/ },
  // An exported alias of the conversion in the trace.
  { name: 'r0-t2-unnumbered-alias', edits: [{ file: trace,
    needle: '  , finish\n', replacement: '  , finish\n  , exposed\n' },
  { file: trace, needle: 'spanKey ∷ Span → SpanKey\n',
    replacement: 'exposed ∷ UnnumberedRow Open → TyRow Open\n'
      + 'exposed = rawForRenumbering\n\nspanKey ∷ Span → SpanKey\n' }],
  probe: 'r0-t2-unnumbered-gate', message: /trace exposes: exposed/ },
  // A second, private call inside the trace.
  { name: 'r0-t2-unnumbered-second-call', edits: [{ file: trace,
    needle: 'spanKey ∷ Span → SpanKey\n',
    replacement: 'hidden ∷ UnnumberedRow Open → TyRow Open\n'
      + 'hidden = rawForRenumbering\n\nspanKey ∷ Span → SpanKey\n' }],
  probe: 'r0-t2-unnumbered-gate', message: /more than finish: 2 uses/ },
  // The stale-slot check blind: it reports nothing.
  { name: 'r0-t2-unnumbered-stale-blind', tree: 'test', edits: [{ file:
    'test/r0-t2-unnumbered-cases.mjs',
  needle: 'export const staleSlots = compiled => Object.entries(permitted)'
    + '.flatMap(\n',
  replacement: 'export const staleSlots = compiled => Object.entries({})'
    + '.flatMap(\n' }], probe: 'r0-t2-unnumbered-scan',
  message: /a stale slot goes unreported/ },
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
  // §18.163 (4): a limitation presented as the author's ruling.
  { name: 'r0-t2-class-limitation-ruled', tree: 'test', edits: [{ file: table,
    needle: "  [refusedDecline('a limitation')]: entry(b, limitation, ",
    replacement: "  [refusedDecline('a limitation')]: entry(b, readFault, " }],
  probe: 'r0-t6-tooling',
  message: /limitation, refuses: a reading: false/ },
  { name: 'r0-t2-class-compiling-reading', tree: 'test', edits: [{ file: table,
    needle: "  [compilingDecline('a read fault')]: entry(b, readFault, ",
    replacement: "  [compilingDecline('a read fault')]: "
      + 'entry(b, limitation, ' }],
  probe: 'r0-t6-tooling',
  message: /read fault: ruled, not a reading: true/ },
  { name: 'r0-t2-class-open-reading', tree: 'test', edits: [{ file: table,
    needle: "entry(a, 'the author\\'s'\n    + ' ruling §18.163 (4): pending",
    replacement: "entry(a, 'reading'\n    + ' §18.163 (4): pending" }],
  probe: 'r0-t6-tooling',
  message: /open requirement: ruled, not a reading: true/ },
  // §18.163 (4): a read-fault decline's loss read as resolved.
  { name: 'r0-t2-class-read-fault-target', tree: 'test', edits: [{
    file: table,
    needle: "    + ' whose effect package was not read', lossTarget, ",
    replacement: "    + ' whose effect package was not read', 'Solved', " }],
  probe: 'r0-t6-tooling',
  message: /read fault: the loss stays unresolved: false/ },
  // §18.168: one citation standing for both decisions.
  shadowRow('r0-t2-shadow-one-citation',
    '  return sameCitation(evidence, shadow[list])\n', '  return false\n',
    /one citation for shadow and live: live 2; shadow/),
  // §18.168: a section that never says shadow certification.
  shadowRow('r0-t2-shadow-token-ignored',
    "export const shadowToken = 'shadow certification';\n",
    "export const shadowToken = '###';\n",
    /a section not naming shadow certification/),
  // §18.168: the real row's tag unchecked.
  shadowRow('r0-t2-shadow-real-tag',
    '  if (!tagged(row, realRowTag))\n', '  if (false)\n',
    /real row untagged/),
  shadowRow('r0-t2-shadow-registry',
    '  if (!evidence.rows.has(row))\n', '  if (false)\n',
    /real row not registered/),
  shadowRow('r0-t2-shadow-constructor', '  return constructorLine.test('
    + "evidence.unsupport ?? '')\n", '  return true\n',
  /a registered real row with no constructor/),
  shadowRow('r0-t2-shadow-list-unnamed', '  if (!named.met) return [false, '
    + '`${matter}: ${named.line}`];\n', '',
  /the list unnamed/),
  shadowRow('r0-t2-shadow-live-unscoped',
    '  const problems = [...shared, ...unscoped];\n',
    '  const problems = shared;\n', /a live section lacking its scope/),
  shadowRow('r0-t2-shadow-all-met',
    '  ids(results).length === 0 && ids(shadow).length === 0;\n',
    '  ids(results).length === 0;\n', /an unmet S2 reads all met/),
  // §18.168: a live-only gap blocking the shadow verdict.
  shadowRow('r0-t2-shadow-live-blocks',
    "ids(results).filter(id => id !== 2)", 'ids(results)',
    /a live-only gap blocks shadow/),
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
