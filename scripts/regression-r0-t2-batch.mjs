// Regression rows for the index-first walk, the unnumbered row and the
// §18.163 window classes (dossier §18.163), for the tranche 2 registry;
// probes in test/regression-r0-t2-batch.mjs. Each restores one defect in
// a whole, compiling form.
const walk = 'src/Features/Check/Strategy/ReadBack/Walk.purs';
const trace = 'src/Features/Check/Trace.purs';
const table = 'test/r0-shadow-table.mjs';

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
