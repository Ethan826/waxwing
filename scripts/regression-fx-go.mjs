// FX001 Task 12 regression rows for the emitted Go (evidence context,
// handle, cleanup), spread into scripts/regression-fx.mjs; the probes are in
// test/regression-fx-go.mjs. Each replacement still compiles.
export const fxGoRows = [
  {
    // Design §3 "Clause context": a clause runs in the context of its
    // `with`. Run in the handler's own, it reaches itself, not the outer one.
    name: 'fx-clause-context', file: 'src/Format/Go/Effect.purs',
    needle: '[ "frame.outer" ]', replacement: '[ "ctx" ]',
    probe: 'fx-clause-context', message: /clause context: /
  },
  {
    // Design §3 "Targeted aborts": a `handle` recovers only its own markers.
    // Taking any abort, it swallows one aimed at an outer `handle`.
    name: 'fx-abort-target', file: 'src/Format/Go/Context.purs',
    needle: 'if ok && waxwingOwns(markers, abort.target) {',
    replacement: 'if ok {',
    probe: 'fx-abort-target', message: /abort target: /
  },
  {
    // Task 7 review (Critical): the first clause of a family is innermost,
    // as the checker types it. Pushed last, the second clause catches.
    name: 'fx-clause-order', file: 'src/Format/Go/Handle.purs',
    needle: '(Array.reverse (Array.mapWithIndex Tuple branches))',
    replacement: '(Array.mapWithIndex Tuple branches)',
    probe: 'fx-clause-order', message: /clause order: /
  },
  {
    // Design §3 "Cleanup context": a deferred expression runs in the
    // context it was registered in. An install that stays visible to its
    // enclosing activation (the context changed in place) gives cleanup the
    // context in force at exit.
    name: 'fx-cleanup-context', file: 'src/Format/Go/Context.purs',
    needle: '"\\treturn &waxwingCtx{key: key, handler: handler, outer: outer}"',
    replacement: '"\\tif outer == nil {"\n    , "\\t\\treturn &waxwingCtx{key: key,'
      + ' handler: handler}"\n    , "\\t}"\n    , "\\tsaved := *outer"\n'
      + '    , "\\t*outer = waxwingCtx{key: key, handler: handler,'
      + ' outer: &saved}"\n    , "\\treturn outer"',
    probe: 'fx-cleanup-context', message: /cleanup context: /
  },
  {
    // Design §3: the pending cause heads the report. Dropped, a cleanup
    // defect after a typed abort is reported without the abort.
    name: 'fx-cleanup-cause', file: 'src/Format/Go/Cleanup.purs',
    needle: 'causes = waxwingCauses(pending)', replacement: 'causes = nil',
    probe: 'fx-cleanup-cause', message: /pending cause dropped: /
  },
  {
    // A pending typed abort reaches its `handle` only if every cleanup on
    // the way completes. Delivered anyway, the cleanup defect is lost.
    name: 'fx-cleanup-defect', file: 'src/Format/Go/Cleanup.purs',
    needle: 'if failed {', replacement: 'if failed && pending == nil {',
    probe: 'fx-cleanup-defect', message: /abort delivered despite/
  },
  {
    // Design §4: the mode is chosen over the emitted IR, not over what
    // `main` reaches; an unused effectful function still needs `ctx`.
    name: 'fx-ctx-reachable', file: 'src/Format/Go/Context.purs',
    needle: 'usesContext (IR.Program program) = not Array.null'
      + ' program.effects\n  || Array.any inFunction program.functions\n'
      + '  where\n  inFunction function = hasEffect function.body',
    replacement: 'usesContext (IR.Program program) =\n'
      + '  Array.any inFunction program.functions\n  where\n'
      + '  inFunction function = function.id == program.entry\n'
      + '    && hasEffect function.body',
    probe: 'fx-ctx-reachable', message: /ctx mode by reachability: /
  }
];
