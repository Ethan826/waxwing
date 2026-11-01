// A2 lane regression rows (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-judge.mjs. Each restores one defect in a whole,
// compiling form.
const effects = 'src/Features/Check/Strategy/Effects';
const term = `${effects}/Term.purs`;
const rows = `${effects}/Rows.purs`;

export const a2JudgeRows = [
  {
    // Task 6: terms compared without normalization, so `J ∅ ⊑ N`, true
    // at every valuation, fails (statements §5, §12.2 "normalization").
    name: 'r0-a2-norm',
    file: term,
    needle: 'holds lower upper = case norm lower, norm upper of\n',
    replacement: 'holds lower upper = case lower, upper of\n',
    probe: 'r0-a2-norm',
    message: /J ∅ ⊑ N fails/
  },
  {
    // Task 6: `holds` checked at one ground valuation (every rigid mark
    // N), so `J {k} ⊑ N` holds though it fails at k = M (statements
    // §12.2 "rigid marks").
    name: 'r0-a2-holds-subset',
    file: term,
    needle: '  TermJ held, TermJ bound → Set.subset held bound\n',
    replacement: '  TermJ _, _ → true\n',
    probe: 'r0-a2-holds-subset',
    message: /holds disagrees with every valuation at \["J","k"\] ⊑ "N"/
  },
  {
    // Task 6: labels keyed by payload as well as effect, so labels of
    // one effect with different arguments commute: multiset row equality
    // (statements §12.2 "E1 order").
    name: 'r0-a2-row-order',
    edits: [
      {
        file: rows,
        needle: 'import Domain.Row (LabelKey)\n',
        replacement: 'import Domain.Row (EffectRef(..), LabelKey)\n'
      },
      {
        file: rows,
        needle: '  keyed label = flip Tuple [ label ] <$> key label\n',
        replacement: '  keyed label = flip Tuple [ label ]'
          + ' <$> key label { effect = FailEffect }\n'
      }
    ],
    probe: 'r0-a2-row-order',
    message: /E1 order lost: State\(Int\) \+ State\(Bool\) groups as its swap/
  }
];
