// A2 lane regression rows (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-judge.mjs. Each restores one defect in a whole,
// compiling form.
const effects = 'src/Features/Check/Strategy/Effects';
const term = `${effects}/Term.purs`;
const rows = `${effects}/Rows.purs`;
const handler = `${effects}/Handler.purs`;
const consume = `${effects}/Consume.purs`;

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
    // Task 6: multiset grouping: each key's labels sorted by their
    // payload's head instead of kept in row order, so labels of one effect
    // with different arguments commute (statements §12.2 "E1 order").
    name: 'r0-a2-row-order',
    edits: [
      {
        file: rows,
        needle: 'import Data.Map as Map\n',
        replacement: 'import Data.Array (sortWith)\nimport Data.Map as Map\n'
      },
      {
        file: rows,
        needle: 'import Domain.Row (LabelKey)\n',
        replacement: 'import Domain.Row (EffectRef(..), LabelKey)\n'
      },
      {
        file: rows,
        needle: '  keyed label = flip Tuple [ label ] <$> key label\n',
        replacement: '  keyed label = flip Tuple [ label ] <$> key label\n'
          + '  payloadHead label = key label { effect = FailEffect }\n'
      },
      {
        file: rows,
        needle: '    { keyed: Map.toUnfoldable (Map.fromFoldableWith'
          + ' (flip append) pairs)\n',
        replacement: '    { keyed: map (map (sortWith payloadHead))'
          + ' (Map.toUnfoldable (Map.fromFoldableWith (flip append)'
          + ' pairs))\n'
      }
    ],
    probe: 'r0-a2-row-order',
    message: /E1 order lost: State\(Int\) \+ State\(Bool\) groups as its swap/
  },
  {
    // Task 7: E1 compares rows without marks, so a forged N nested in an
    // image equals a written plain `Log` (statements §12.2, T3-a).
    name: 'r0-a2-equal-marks',
    file: handler,
    needle: 'withMarks = { arguments: true, marks: true }\n',
    replacement: 'withMarks = { arguments: true, marks: false }\n',
    probe: 'r0-a2-equal-marks',
    message: /E1 marks: an image's N equals a written M/
  },
  {
    // Task 7: Definition 4.1(c) compares R ignoring its marks (revision
    // 3.2's reading), so attempt A is accepted (statements §12.2).
    name: 'r0-a2-def41-c',
    file: handler,
    needle: '      rowEqual same withMarks left.inference'
      + ' right.inference\n',
    replacement: '      rowEqual same marksIgnored left.inference'
      + ' right.inference\n',
    probe: 'r0-a2-def41-c',
    message: /attempt A accepted: R's N equals R's M without a C/
  },
  {
    // Task 7: Definition 4.1(d) compares clause rows without their
    // tails, so attempt B's ResultC tail forged to ∅ meets g's alias tail
    // r (statements §12.2).
    name: 'r0-a2-def41-d-tail',
    edits: [
      {
        file: handler,
        needle: 'import Data.Maybe (Maybe, fromMaybe, isNothing, maybe)\n',
        replacement: 'import Data.Maybe (Maybe(..), fromMaybe, isNothing,'
          + ' maybe)\n'
      },
      {
        file: handler,
        needle: '        >=> rowEqual same bare (clauseRow left) (clauseRow'
          + ' right)\n',
        replacement: '        >=> rowEqual same bare (untailed left) (untailed'
          + ' right)\n'
      },
      {
        file: handler,
        needle: '      clauseRow rows = fromMaybe rows.inference'
          + ' rows.clauses\n',
        replacement: '      clauseRow rows = fromMaybe rows.inference'
          + ' rows.clauses\n'
          + '      untailed rows = (clauseRow rows) { tail = Nothing }\n'
      }
    ],
    probe: 'r0-a2-def41-d-tail',
    message: /attempt B accepted: x owning C ∅ meets both sides/
  },
  {
    // Task 8: Definition 4.2's exact counts checked before the labels, so
    // C10(a)'s payload failure is reported as a limitation (spec §5, §12).
    name: 'r0-a2-def42-last',
    edits: [
      {
        file: consume,
        needle: '    labels sourceKeys targetForm\n',
        replacement: '    rigid (const (exact sourceKeys target))\n'
          + '      >=> labels sourceKeys targetForm\n'
      },
      {
        file: consume,
        needle: '      >=> rigid (const (exact sourceKeys target))\n',
        replacement: ''
      }
    ],
    probe: 'r0-a2-def42-last',
    message: /C10\(a\) reported as a limitation/
  },
  {
    // Task 8: the installed-C site compares label arguments (ruling
    // 2026-10-31: pairing and its edge only), so famw is refused.
    name: 'r0-a2-installed-c-only',
    file: consume,
    needle: '  AtInstalledC → { arguments: false, marks: record.marks,'
      + ' tail: false }\n',
    replacement: '  AtInstalledC → { arguments: true, marks: record.marks,'
      + ' tail: false }\n',
    probe: 'r0-a2-installed-c-only',
    message: /famw refused at the installed-C site/
  },
  {
    // Task 8: `defer` reads its row's tail (statements §4 E2: labels
    // only), so a rigid-tailed d asks the enclosing row to end in it.
    name: 'r0-a2-labels-only',
    file: consume,
    needle: '  AtDefer → labelsOnly\n',
    replacement: '  AtDefer → labelsOnly { tail = true }\n',
    probe: 'r0-a2-labels-only',
    message: /AtDefer read a tail condition/
  }
];
