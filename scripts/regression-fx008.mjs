// FX008 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-fx008.mjs. Each replacement still compiles.
export const fx008Rows = [
  {
    // §3.5 (c): a cycle's weight for a key is how many more labels of it the
    // row has than its target. A presence-only weight sees dup.wxw's extra
    // `Log` as harmless and the settling loop never ends.
    name: 'fx008-cycle-presence', file: 'src/Features/Check/Cycle.purs',
    needle: 'excess own target = own - target',
    replacement: 'excess own target = if own > 0 && target == 0 then 1 else 0',
    probe: 'fx008-cycle-presence', message: /cycle weight: timed out/
  },
  {
    // Task 5 review I1: a fallback computed eagerly is evaluated at every
    // release step, which made the settle order quadratic in the number of
    // deferrals (16,000 defers: 26 s against 2 s).
    name: 'fx008-settle-order-linear',
    file: 'src/Features/Check/FeedOrder.purs',
    needle: 'release graph state = maybe\' finished released'
      + ' (Set.findMin state.ready)',
    replacement: 'release graph state = maybe (Done (stackItems state.order))'
      + ' released (Set.findMin state.ready)',
    probe: 'fx008-settle-order-linear', message: /settle order: timed out/
  }
];
