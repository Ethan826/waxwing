// Tranche 2 Task 8 regression rows (the effect-row read-back; design
// §C.1-§C.2, §E, dossier §18.155 (3), (8)), for the tranche 2 registry;
// probes in test/regression-r0-t2-rows.mjs. Each restores one defect in
// a whole, compiling form.
const sites = 'src/Features/Check/Strategy/ReadBack/EffectSites.purs';
const convert = 'src/Features/Check/Strategy/ReadBack/Convert.purs';
const rows = 'src/Features/Check/Strategy/ReadBack/EffectRows.purs';

export const t2RowsRows = [
  {
    // A key met twice resolved by taking its first entry.
    name: 'r0-t2-rows-clash',
    file: sites,
    needle: '    | Array.length found > 1 = Left (Clash (named key))\n',
    replacement: '    | Array.length found > 1 = Right (Array.head found)\n',
    probe: 'r0-t2-rows-clash',
    message: /r0-t2-rows-clash: \["clash"\]/
  },
  {
    // Applied rows looked up by the Apply's span only, not its argument's.
    name: 'r0-t2-rows-applied-key',
    file: sites,
    needle: '    (Tuple (keyOf span) (keyOf (Checked.spanOf argument)))\n',
    replacement: '    (Tuple (keyOf span) (keyOf (const span argument)))\n',
    probe: 'r0-t2-rows-applied-key',
    message: /applied-key: \["applied","logged","overTwo","inExtra"\]/
  },
  {
    // A Fail label read with its live mark's term instead of N.
    name: 'r0-t2-rows-fail-n',
    file: convert,
    needle: '    FailEffect, _ → Right TermN\n',
    replacement: '    FailEffect, _ → Right (terms mark)\n',
    probe: 'r0-t2-rows-fail-n',
    message: /r0-t2-rows-fail-n: \["failing"\]/
  },
  {
    // Two sources that disagree resolved by taking the first reading.
    name: 'r0-t2-rows-apart',
    file: rows,
    needle: '    | otherwise = Left (Apart variable)\n',
    replacement: '    | otherwise = Right (Tuple variable first)\n',
    probe: 'r0-t2-rows-apart',
    message: /r0-t2-rows-apart: \["apart"\]/
  }
];
