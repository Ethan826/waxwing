// A2 lane A regression rows (Task 4; docs/plans/
// 2026-10-31-a2-validator-plan.md), spread into a2Rows
// (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-complete.mjs. Each restores one defect in a
// whole, compiling form.
const file = 'src/Features/Check/Strategy/Effects/Complete.purs';

export const a2CompleteRows = [
  {
    // Spec §2.4, C6: settle, then complete (the statements' order before
    // §18.141), so completion's fresh holes stay unsettled.
    name: 'r0-a2-complete-then-settle',
    file,
    needle: '  Completed (forceAll problem package (freshHoles problem'
      + ' package))\n\nsettledOf ∷ Completed → EffectPackage\n'
      + 'settledOf = settle <<< completedPackage\n',
    replacement: '  Completed (forceAll problem package (freshHoles problem'
      + ' (settle package)))\n\nsettledOf ∷ Completed → EffectPackage\n'
      + 'settledOf = completedPackage\n',
    probe: 'r0-a2-complete-then-settle',
    message: /C6 order separates: the payload settled to PVar/
  },
  {
    // Spec §2.4 (ii), C14: the forced binding given a fresh hole, a
    // second identity, in place of the source's own.
    name: 'r0-a2-forced-copy',
    file,
    needle: '  forcedTo effects found image ='
      + ' Map.insert found.forced image effects\n',
    replacement: '  forcedTo effects found image = Map.insert found.forced\n'
      + '    (image { tail = Just (PTailHole (nextHole input)) }) effects\n',
    probe: 'r0-a2-forced-copy',
    message: /C14 hole source: the forced tail is hole 6/
  },
  {
    // Spec §2.4 (i): h read from type and row images only, as today's
    // `bindingsOf` reads it, so a fresh hole can reuse an effect hole.
    name: 'r0-a2-hole-numbering',
    file,
    needle: '    <> concatMap recordHoles (fromFoldable package.rows)\n'
      + '    <> concatMap rowHoles (fromFoldable package.effects)\n',
    replacement: '    <> concatMap recordHoles (fromFoldable package.rows)\n',
    probe: 'r0-a2-hole-numbering',
    message: /numbering injective: fresh holes [\d,]+ not above h = 9/
  }
];
