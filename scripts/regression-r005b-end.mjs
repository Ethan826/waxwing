// R005 Tranche B B4 regression rows (the end of a body: H and
// Unresolved), imported by scripts/regression.mjs; their probes are in
// test/regression-r005b-end.mjs. Each restores one defect in a whole,
// compiling form (docs/plans/2026-10-19-row-merge-implementation-plan.md
// §8).
export const r005bEndRows = [
  {
    // H's exclusion without entailment: a rigid partner of the meta rules
    // a label out whether or not the rigid lacks it by hypothesis, so a
    // program with a solution is refused.
    name: 'r005b-h-exclusion', file: 'src/Features/Check/Homes.purs',
    needle: '      && Array.all (lacks subst label) rigidPartners\n',
    replacement: '      && Array.null rigidPartners\n',
    probe: 'r005b-h-exclusion',
    message: new RegExp('exclusion without entailment: E_TYPE pickR\'s '
      + '\\{ \\.\\.\\.r, \\.\\.\\.s \\} must be')
  },
  {
    // H run inside re-examination instead of at the end of a body: its
    // refusal pre-empts an ordinary error later in the body.
    name: 'r005b-h-binds',
    edits: [
      {
        file: 'src/Features/Check/RowMerge/Improve.purs',
        needle: 'import Features.Check.RowMerge.Merge (Merge, Row)\n',
        replacement: 'import Features.Check.RowMerge.Merge (Merge, Row)\n'
          + 'import Features.Check.RowMerge.End (homeless)\n'
      },
      {
        file: 'src/Features/Check/RowMerge/Improve.purs',
        needle: '    Waits → Right found\n',
        replacement: '    Waits → maybe (Right found)\n'
          + '      (Left <<< FromMerge\n'
          + '        { predicate: merge.id, at: merge.site\n'
          + '        , within: Just found.subst }\n'
          + '        <<< Homeless)\n'
          + '      (homeless found.subst merge)\n'
      }
    ],
    probe: 'r005b-h-binds',
    message: /H before the end: E_TYPE pickR's \{ \.\.\.r, \.\.\.s \} must be/
  },
  {
    // A rescan that counts a pass where no case fired as a change: quiet
    // predicates keep it going to its bound (`Exhausted`, a limit).
    name: 'r005b-quiet', file: 'src/Features/Check/RowMerge/Improve.purs',
    needle: '        | reached.changed = Loop found\n',
    replacement: '        | reached.changed || true = Loop found\n',
    probe: 'r005b-quiet',
    message: new RegExp('quiet predicates (kept going: E_INTERNAL '
      + 're-examination passed|slow)')
  },
  {
    // Waiting predicates dropped at the end of a body: the body passes
    // checking as though none waited and reaches lowering's placeholder
    // for rows of several tails (P4, Task 8).
    name: 'r005b-predicate-end',
    file: 'src/Features/Check/RowMerge/End.purs',
    needle: '  maybe (Right (Accepted subst)) waited (NonEmpty.fromArray '
      + '(waiting subst))\n',
    replacement: '  maybe (Right (Accepted subst)) waited (const Nothing '
      + '(waiting subst))\n',
    probe: 'r005b-predicate-end',
    message: new RegExp('waiting predicates dropped: E_INTERNAL R005B '
      + 'placeholder: rows with several tails are lowered')
  }
];
