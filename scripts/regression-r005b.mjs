// R005 Tranche B regression rows, imported by scripts/regression.mjs;
// their probes are in test/regression-r005b.mjs. Each restores one defect
// in a whole, compiling form (docs/plans/2026-10-17-open-row-merge-plan.md,
// "Regression rows").
export const r005bRows = [
  {
    // The first reason seeded wins: an implied lack (seeded before the
    // clauses) hides the clause, and an implied pair the written one.
    name: 'r005b-precedence',
    edits: [
      {
        file: 'src/Features/Check/Because.purs',
        needle: 'prefer = min\n',
        replacement: 'prefer earlier _ = earlier\n'
      },
      {
        file: 'src/Features/Check/Because.purs',
        needle: 'preferLack = min\n',
        replacement: 'preferLack earlier _ = earlier\n'
      }
    ],
    probe: 'r005b-precedence',
    message: /first reason kept: E_TYPE Expected \{ name: Int, \.\.\._ \}/
  },
  {
    // A lack decomposed from a pair loses its reason: the shape text.
    // (Since Task 4 the bind rule hands the pair's reason to the full
    // decomposition, Features.Check.Disjoint `requireDisjoint`.)
    name: 'r005b-provenance', file: 'src/Features/Check/RecordTail.purs',
    needle: '    { because, from: Just meta }\n',
    replacement: '    (const plain because)\n',
    probe: 'r005b-provenance',
    message: /decomposed lack lost its reason: E_TYPE Expected /
  },
  {
    // The labels of the image are not required of the partner.
    name: 'r005b-mixed-lacks', file: 'src/Features/Check/Disjoint.purs',
    needle: '  separated _ = labelsAgainst solving lack one other subst\n'
      + '    >>= labelsAgainst solving lack other one\n',
    replacement: '  separated _ = labelsAgainst solving lack one '
      + '(other { tails = [] }) subst\n'
      + '    >>= labelsAgainst solving lack other (one { tails = [] })\n',
    probe: 'r005b-mixed-lacks',
    message: /label against tail skipped: accepted/
  },
  {
    // The tail of the image is not required apart from the partner.
    name: 'r005b-mixed-tails', file: 'src/Features/Check/Disjoint.purs',
    needle: '    >>= tailsApart solving lack one.tails other.tails\n',
    replacement: '    >>= tailsApart solving lack [] other.tails\n',
    probe: 'r005b-mixed-tails',
    message: /tail against tail skipped: accepted/
  },
  {
    // One rigid is allowed apart from itself.
    name: 'r005b-self-apart', file: 'src/Features/Check/Disjoint.purs',
    needle: '    | one == other → Left (Refused (Twice one because))',
    replacement: '    | one == other → Right subst',
    probe: 'r005b-self-apart',
    message: /rigid apart from itself allowed: accepted/
  },
  {
    // Resolve checks a body type's labels but not its pairs of tails.
    name: 'r005b-body-type', file: 'src/Features/Resolve/Lacking.purs',
    needle: '  checked lacking = labelsChecked lacking\n'
      + '    *> disjointIn tables lacking.apart reference\n',
    replacement: '  checked lacking = labelsChecked lacking\n',
    probe: 'r005b-body-type',
    message: /body type pair ignored: (accepted|E_INTERNAL R005B placeholder)/
  },
  {
    // Implied pairs are not seeded at a use (the bug main had after Task 2):
    // a call through a declared-type wrapper accepts overlapping tails.
    name: 'r005b-wrapper-pairs', file: 'src/Features/Check/UseFacts.purs',
    needle: '{ state = joined metaOf variables pairs use.state }',
    replacement: '{ state = const use.state\n'
      + '    (joined metaOf variables pairs use.state) }',
    probe: 'r005b-wrapper-pairs',
    message: /wrapper pair not seeded: accepted/
  },
  {
    // Common tails are not cancelled (Task 4, rules §3): a row and its
    // tails in another order are refused.
    name: 'r005b-cancel', file: 'src/Features/Check/RowResidue.purs',
    needle: '    | Array.elem tail found.mine = found\n',
    replacement: '    | false = found\n',
    probe: 'r005b-cancel',
    message: /common tails not cancelled: E_TYPE Expected /
  },
  {
    // N5 restored (plan §2.7, removed in B2): a meta apart from itself is
    // bound to `{}` at once instead of keeping the pair, so a label later
    // bound into it reads as the shape text, not D2. (Task 4's
    // `r005b-pruned-reason` was retired in B2 with Check/Narrow, its
    // target; fixtures lone-meta-lack and -two keep pinning D1.)
    name: 'r005b-self-pair',
    edits: [
      {
        file: 'src/Features/Check/Disjoint.purs',
        needle: 'import Domain.Type (Ty)\n',
        replacement: 'import Domain.Type (Ty(..))\n'
      },
      {
        file: 'src/Features/Check/Disjoint.purs',
        needle: 'import Features.Check.Subst (Flex(..), Subst, onStore, '
          + 'storeOf)\n',
        replacement: 'import Features.Check.Subst (Flex(..), Subst(..), '
          + 'onStore, storeOf)\n'
      },
      {
        file: 'src/Features/Check/Disjoint.purs',
        needle: 'tailPair because subst one other = case one, other of\n',
        replacement: 'tailPair because subst one other = case one, other of\n'
          + '  Meta meta, Meta again | meta == again → case subst of\n'
          + '    Subst found → Right (Subst found { types = Map.insert meta\n'
          + '      (TRecord { fields: [], tails: [] }) found.types })\n'
      }
    ],
    probe: 'r005b-self-pair',
    message: /meta apart from itself emptied: E_TYPE Expected \{\}, found/
  },
  {
    // The bind rule stops passing a meta's lacks to a meta rest of its
    // image (rules §5's premise P1): a cyclic predicate's case 3 moves one
    // label for ever and the rescan reaches its bound, a limit, where the
    // program has a contradiction (L1; the defect the lineage check of
    // the oracle runner also catches).
    name: 'r005b-lineage-lacks', file: 'src/Features/Check/RecordTail.purs',
    needle: '    Meta _ | unbound reached tail → Right (addLackTable tail own '
      + 'reached)\n',
    replacement: '    Meta _ | unbound reached tail → Right\n'
      + '      (const reached (addLackTable tail own reached))\n',
    probe: 'r005b-lineage-lacks',
    message: /lacks not passed on: E_INTERNAL re-examination passed its bound/
  },
  {
    // A binding a solving case made (case 2 here) loses its predicate as
    // cause (R10.1 extended, plan §10 decision 5): a later clash on it
    // reads as an ordinary mismatch.
    name: 'r005b-case2-reason',
    file: 'src/Features/Check/RowMerge/Improve.purs',
    needle: '      { subst: solved merge.id (boundByCase merge.id found.subst '
      + 'reached)\n',
    replacement: '      { subst: solved merge.id\n'
      + '          (const reached (boundByCase merge.id found.subst '
      + 'reached))\n',
    probe: 'r005b-case2-reason',
    message: /case binding lost its predicate: E_TYPE Expected /
  },
  {
    // Sym disabled: only the parts as written are tried (plan §2.3).
    name: 'r005b-sym', file: 'src/Features/Check/RowMerge/Cases.purs',
    needle: '    Waits → oriented unify swapped merge subst\n',
    replacement: '    Waits → Right\n'
      + '      (const Waits (oriented unify swapped merge subst))\n',
    probe: 'r005b-sym',
    message: /Sym disabled: E_INTERNAL R005B placeholder: unresolved merge /
  },
  {
    // A part with only a rigid tail counted as closed: case 1 then drops
    // the rigid, and a program QT-strict leaves waiting is decided (on
    // 2026-10-19 the probe was accepted with the defect).
    name: 'r005b-sym-rigid', file: 'src/Features/Check/RowMerge/Cases.purs',
    needle: 'closed row = Array.null row.tails\n',
    replacement: 'closed row = not (Array.any isMeta row.tails)\n',
    probe: 'r005b-sym-rigid',
    message: /rigid part counted closed: (accepted|E_TYPE )/
  },
  {
    // Case 2g absent (plan §10 decision 17): a wanted merge whose right
    // part and result hold only rigid tails waits, as at B3.
    name: 'r005b-case2g', file: 'src/Features/Check/RowMerge/Cases.purs',
    needle: '  else if\n    unknownless right && unknownless result\n'
      + '      && holdsAll right result then subtract\n',
    replacement: '  else if false then subtract\n',
    probe: 'r005b-case2g',
    message: /2g absent: E_INTERNAL R005B placeholder: unresolved merge /
  },
  {
    // The superseded 2g proposal: a missing atom makes 2g claim the
    // predicate and wait, which keeps case 3 from a refusal. Since B4 H
    // refuses the waiting predicate at the end of the body, at its site:
    // the location tells the two refusals apart.
    name: 'r005b-case2g-claim',
    file: 'src/Features/Check/RowMerge/Cases.purs',
    needle: '  else if\n    unknownless right && unknownless result\n'
      + '      && holdsAll right result then subtract\n',
    replacement: '  else if unknownless right && unknownless result then\n'
      + '    if holdsAll right result then subtract else Right Waits\n',
    probe: 'r005b-case2g-claim',
    message: new RegExp('missing atom claimed: E_INTERNAL R005B '
      + 'placeholder: contradictions from merge predicates are reported in '
      + 'Task B5 @pickR\\(x, q\\)')
  },
  {
    // 2g without its rigid-tail test: a rigid tail of the right part that
    // the result lacks is dropped, and an unsatisfiable merge is solved.
    name: 'r005b-case2g-atoms',
    file: 'src/Features/Check/RowMerge/Cases.purs',
    needle: '    && Array.null (cancelled result.tails right.tails).missing\n',
    replacement: '',
    probe: 'r005b-case2g-atoms',
    message: /rigid tail dropped: accepted/
  },
  {
    // A creation point not desugared (a constructor's use): its row of
    // two unknown tails reaches the unifier's guard (plan §2.1).
    name: 'r005b-one-unknown', file: 'src/Features/Check/Use.purs',
    needle: '  owned ctor info = Right $ desugaredUse span\n',
    replacement: '  owned ctor info = Right $ identity\n',
    probe: 'r005b-one-unknown',
    message: /creation point missed: E_INTERNAL a record row holds two /
  },
  {
    // A settling round retries its postponed pairs without re-examining
    // the predicates (plan §2.9): a predicate a retry unblocks still
    // waits at the end of the body, where (since B4) the end's check that
    // nothing could progress reports the unfinished fixpoint.
    name: 'r005b-end-fixpoint', file: 'src/Features/Check/Unify.purs',
    needle: '  retry reached pair = settled reached <$> unifyRowsTraced unify '
      + 'pair.mode\n',
    replacement: '  retry reached pair = settled reached <$> unifyRowsTraced '
      + '(unifyAt 1) pair.mode\n',
    probe: 'r005b-end-fixpoint',
    message: new RegExp('retry not re-examined: E_INTERNAL a waiting '
      + 'predicate could still progress at the end of a body')
  }
];
