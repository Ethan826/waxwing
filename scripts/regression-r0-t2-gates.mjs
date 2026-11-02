// Tranche 2 Task 7 regression rows (the trace gates; design §C.4, §I
// Task 3d; dossier §18.155 (4)), for the tranche 2 registry; probes in
// test/regression-r0-t2-gates.mjs. Each restores one defect in a whole,
// compiling form.
export const t2GatesRows = [
  {
    // An inference module reads the trace: Consume's unification result
    // made to depend on `state.trace` (a `const`, so it compiles and
    // decides nothing, but a reader all the same).
    name: 'r0-t2-gates-reader',
    file: 'src/Features/Check/Consume.purs',
    needle: '        { subst = linked (named traced.events) traced.subst\n',
    replacement: '        { subst = const (linked (named traced.events)'
      + ' traced.subst)\n            state.trace\n',
    probe: 'r0-t2-gates-scan',
    message: /Consume consumeIn \(accessor\) uses the label `trace` 1 times/
  },
  {
    // `Trace` given a derived Eq (and Slot one, so it compiles): any
    // comparison of a `State` could then read the trace.
    name: 'r0-t2-gates-eq',
    file: 'src/Features/Check/Trace.purs',
    needle: 'newtype Trace = Trace Traced\n',
    replacement: 'newtype Trace = Trace Traced\n\n'
      + 'derive instance eqSlot ∷ Eq Slot\n'
      + 'derive instance eqTrace ∷ Eq Trace\n',
    probe: 'r0-t2-gates-scan',
    message: /Features\.Check\.Trace declares an instance Eq on Trace/
  },
  {
    // A function use no longer traced: its entries leave the trace,
    // while `recheck` less the trace stays the pre-trace build's.
    name: 'r0-t2-gates-untraced',
    file: 'src/Features/Check/Use.purs',
    needle: '  found function = Right $ traced span $ lacksStated span\n',
    replacement: '  found function = Right $ lacksStated span\n',
    probe: 'r0-t2-gates-counts',
    message: new RegExp('r0-t2-gates-counts: entries '
      + '\\{"uses":\\d+,"applied":815,"piped":160\\}; recheck moved 0')
  }
];
