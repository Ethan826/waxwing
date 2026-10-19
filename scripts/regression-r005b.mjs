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
  }
];
