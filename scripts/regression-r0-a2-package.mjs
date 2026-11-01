// A2 lane regression rows (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-package.mjs. Each restores one defect in a whole,
// compiling form.
const file = 'src/Features/Check/Strategy/Effects/Package.purs';

export const a2PackageRows = [
  {
    // Task 2, C8: nullary data erased as an application of no
    // arguments, which generation never writes.
    name: 'r0-a2-nullary-erase',
    file,
    needle: '    | null arguments && null rows → Base (DataBase owner)\n',
    replacement: '    | null arguments && null rows'
      + ' → App (DataHead owner) []\n',
    probe: 'r0-a2-nullary-erase',
    message: /nullary data erases to DataBase: got App/
  },
  {
    // Task 2: a record settled by its tails alone, its fields' holes
    // left, so settling then erasing leaves a hole that ReadBack's
    // `settled` defaults.
    name: 'r0-a2-settle-order',
    file,
    needle: '  { fields: map field row.fields, tails: filter (not <<< isHole)'
      + ' row.tails }\n  where\n  field (Tuple label value) = Tuple label'
      + ' (settleTy value)\n',
    replacement: '  { fields: row.fields, tails: filter (not <<< isHole)'
      + ' row.tails }\n',
    probe: 'r0-a2-settle-order',
    message: /settle does not commute with erase: case \d+/
  },
  {
    // Task 2 review: an arrow's effect row left unsettled; erasure drops
    // it, so only the hole-free property sees the hole.
    name: 'r0-a2-settle-rows',
    file,
    needle: '    { parameter: settleTy stage.parameter,'
      + ' row: settleRow stage.row }\n',
    replacement: '    { parameter: settleTy stage.parameter,'
      + ' row: stage.row }\n',
    probe: 'r0-a2-settle-rows',
    message: /a settled type holds a hole: case \d+/
  }
];
