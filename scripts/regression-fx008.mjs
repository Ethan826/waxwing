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
  }
];
