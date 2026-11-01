// A2 lane regression rows (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-dep.mjs. Each restores one defect in a whole,
// compiling form.
const file = 'src/Features/Check/Strategy/Effects/Dependency.purs';

export const a2DepRows = [
  {
    // Task 10, C1 A, C15 (W4): Dep closed over `Equal` and variables
    // only, so a frame position is never reached and the `Defer` is an
    // ordinary failure.
    name: 'r0-a2-dep-frame',
    file,
    needle: '  obligations = map _.value'
      + ' (fields problem).effects.obligations\n',
    replacement: '  obligations = Array.filter equalOnly'
      + ' (map _.value (fields problem).effects.obligations)\n'
      + '  equalOnly = case _ of\n'
      + '    Equal _ _ → true\n'
      + '    _ → false\n',
    probe: 'r0-a2-dep-frame',
    message: /C1 A through the frame: expected ForcedTail, got/
  },
  {
    // Task 10: the forcing edge v -> t dropped, so a source mentioned by
    // no obligation that also mentions v is outside Dep.
    name: 'r0-a2-dep-forcing-edge',
    file,
    needle: '    , foldMap sourceNodes (Array.filter (isForced dep) forced)\n',
    replacement: '    , foldMap sourceNodes'
      + ' (Array.filter (isForced dep) (Array.take 0 forced))\n',
    probe: 'r0-a2-dep-forcing-edge',
    message: /forcing edge: expected ForcedTail, got/
  },
  {
    // Task 10, "limit wins": ForcedTail checked before `limit`.
    name: 'r0-a2-dep-limit-first',
    file,
    needle: 'classify dep placed failure = case failure.limit of\n',
    replacement: 'classify dep placed failure ='
      + ' case failure.limit && not (dependsOn dep placed.value) of\n',
    probe: 'r0-a2-dep-limit-first',
    message: /limit wins: expected RigidExact, got ForcedTail/
  },
  {
    // Task 10, C16: Dep closed over every obligation, mentioned or not.
    name: 'r0-a2-dep-unrelated',
    file,
    needle: '    , foldMap mentions'
      + ' (Array.filter (dependsOn dep) obligations)\n',
    replacement: '    , foldMap mentions obligations\n',
    probe: 'r0-a2-dep-unrelated',
    message: /C16 unrelated: expected ObligationFailed, got ForcedTail/
  },
  {
    // Task 10 (whole-branch review): the forced source admitted
    // unfiltered, so a rigid source enters Dep.
    name: 'r0-a2-dep-rigid-source',
    file,
    needle: 'sourceNodes entry = effectNode entry.source\n',
    replacement: 'sourceNodes entry ='
      + ' Set.singleton (NodeEff entry.source)\n',
    probe: 'r0-a2-dep-rigid-source',
    message: /rigid source: a rigid node entered Dep/
  }
];
