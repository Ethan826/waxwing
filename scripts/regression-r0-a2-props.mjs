// A2 Task 15's regression rows (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-props.mjs. Each restores one defect in a whole,
// compiling form.
const complete = 'src/Features/Check/Strategy/Effects/Complete.purs';
const dependency = 'src/Features/Check/Strategy/Effects/Dependency.purs';

export const a2PropsRows = [
  {
    // Spec §4's owed property: completion binds every flexible type and
    // row variable afresh, present ones included, so an input image is
    // replaced by a hole that settles to Int and G0 refuses erase P_c
    // where it accepted erase (settle P_in).
    name: 'r0-a2-props-g0-monotone',
    file: complete,
    needle: '    | bound package variable info = Nothing\n',
    replacement: '    | bound package variable info && false = Nothing\n',
    probe: 'r0-a2-props-g0-monotone',
    message: /G0 monotonicity: erase P_c refused at/
  },
  {
    // Spec §5.1: `Defer`'s mentions lose its `row`, so d counts as
    // outside the obligation and perturbing it moves the `Defer`'s
    // Judged.
    name: 'r0-a2-props-dep-complete',
    file: dependency,
    needle: 'deferMentions site = effectNode site.row'
      + ' <> rowNodes site.enclosing\n',
    replacement: 'deferMentions site = rowNodes site.enclosing\n',
    probe: 'r0-a2-props-dep-complete',
    message: /Dep completeness: .*obligation \d+: /
  }
];
