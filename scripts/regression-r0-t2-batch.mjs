// Regression rows for the index-first walk, the unnumbered row and the
// §18.163 window classes (dossier §18.163), for the tranche 2 registry;
// probes in test/regression-r0-t2-batch.mjs. Each restores one defect in
// a whole, compiling form.
const walk = 'src/Features/Check/Strategy/ReadBack/Walk.purs';
const trace = 'src/Features/Check/Trace.purs';
const table = 'test/r0-shadow-table.mjs';
const origin = 'src/Domain/Recorded/Origin.purs';

// §18.165: each restores an order the derived instance does not give.
const orderRow = (name, edits) => ({ name, probe: 'r0-path-order',
  edits: edits.map(([needle, replacement]) =>
    ({ file: origin, needle, replacement })),
  message: /r0-path-order: \["agreement: / });
const compareLine = '  compare (Path left) (Path right) = case compare '
  + 'left.root right.root of\n';
const stepCompare = '    Just one, Just other → case compare one other of\n';
const loopHead = 'compareSteps ∷ Array Step → Array Step → Ordering\n';
const prefixLine = '    _, _ → compare (Array.length left) '
  + '(Array.length right)\n';

export const pathOrderRows = [
  orderRow('r0-path-order-root-ignored', [[compareLine,
    '  compare (Path left) (Path right) = case compare '
      + '(const unit left) (const unit right) of\n']]),
  orderRow('r0-path-order-root-reversed', [[compareLine,
    '  compare (Path left) (Path right) = case compare '
      + 'right.root left.root of\n']]),
  orderRow('r0-path-order-kinds-swapped', [[
    'data Step = Named String | Index Int\n',
    'data Step = Index Int | Named String\n']]),
  orderRow('r0-path-order-longer-first', [[prefixLine,
    '    _, _ → compare (Array.length right) (Array.length left)\n']]),
  orderRow('r0-path-order-prefix-equal', [[prefixLine, '    _, _ → EQ\n']]),
  orderRow('r0-path-order-step-skipped', [[
    '      EQ → go (at + 1)\n', '      EQ → go (at + 2)\n']]),
  orderRow('r0-path-order-index-magnitude', [[stepCompare,
    '    Just one, Just other → case compare (sized one) (sized other) of\n'],
  [loopHead, 'sized ∷ Step → Step\n'
    + 'sized (Index found) | found < 0 = Index (negate found)\n'
    + 'sized step = step\n\n' + loopHead]]),
  orderRow('r0-path-order-empty-name-last', [[stepCompare,
    '    Just one, Just other → case reordered one other of\n'],
  [loopHead, 'reordered ∷ Step → Step → Ordering\n'
    + 'reordered (Named "") (Named found) | found /= "" = GT\n'
    + 'reordered (Named found) (Named "") | found /= "" = LT\n'
    + 'reordered one other = compare one other\n\n' + loopHead]])
];

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
  needle: "      && mentions(text, name))\n",
  replacement: "      && false)\n" }],
  probe: 'r0-t2-unnumbered-scan',
  message: /r0-t2-unnumbered-scan: \["a planted reader goes unreported"\]/ },
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
