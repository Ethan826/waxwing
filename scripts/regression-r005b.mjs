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
    name: 'r005b-provenance',
    edits: [
      {
        file: 'src/Features/Check/Disjoint.purs',
        needle: '(Because, partnersOf, withApart)',
        replacement: '(Because, partnersOf, plain, withApart)'
      },
      {
        file: 'src/Features/Check/Disjoint.purs',
        needle: '(Map.singleton label { because, from: Just meta })',
        replacement: '(Map.singleton label plain)'
      }
    ],
    probe: 'r005b-provenance',
    message: /decomposed lack lost its reason: E_TYPE Expected /
  },
  {
    // The labels of the image are not required of the partner.
    name: 'r005b-mixed-lacks', file: 'src/Features/Check/Disjoint.purs',
    needle: 'foldM labelApart subst (Array.sort (map fst fields))',
    replacement: 'foldM labelApart subst (Array.take 0 (map fst fields))',
    probe: 'r005b-mixed-lacks',
    message: /label against tail skipped: accepted/
  },
  {
    // The tail of the image is not required apart from the partner.
    name: 'r005b-mixed-tails', file: 'src/Features/Check/Disjoint.purs',
    needle: '(Array.sort (map fst fields)) >>= tailApart',
    replacement: '(Array.sort (map fst fields))',
    probe: 'r005b-mixed-tails',
    message: /tail against tail skipped: accepted/
  },
  {
    // One rigid is allowed apart from itself.
    name: 'r005b-self-apart', file: 'src/Features/Check/Disjoint.purs',
    needle: '    | one == other → Left (Refused (Twice tail because))',
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
  }
];
