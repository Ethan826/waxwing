// R005 Tranche B B5 regression rows (D4, D6 and their metadata),
// imported by scripts/regression.mjs; their probes are in
// test/regression-r005b-render.mjs. Each restores one defect in a whole,
// compiling form (docs/plans/2026-10-19-row-merge-implementation-plan.md
// §8).
const unresolved = 'src/Features/Check/Unresolved.purs';
const contradicted = 'src/Features/Check/Contradicted.purs';
const argumentOrigin = 'src/Features/Check/ArgumentOrigin.purs';

export const r005bRenderRows = [
  {
    // T6 undone: every predicate of a use located at the use.
    name: 'r005b-site-argument',
    file: 'src/Features/Check/RowMerge/Use.purs',
    needle: '  site = maybe made.site identity (Array.index made.arguments '
      + 'index)\n',
    replacement: '  site = made.site\n',
    probe: 'r005b-site-argument',
    message: /argument site lost: E_TYPE .* @split\(\{ x: 1, y: 2 \}\)/
  },
  {
    // Decision 20 undone: a direct call's own rows offered an annotation.
    name: 'r005b-hint-own-call', file: unresolved,
    needle: '      | otherwise → OwnCall owner.name\n',
    replacement: '      | otherwise → AnnotateLambda\n',
    probe: 'r005b-hint-own-call',
    message: /own call offered an annotation: .*annotate this lambda/
  },
  {
    // A lambda parameter's part not recognised: kind 2 where kind 1 is due.
    name: 'r005b-hint-lambda', file: 'src/Features/Check/MergeParts.purs',
    needle: 'lambdaPart subst part = Array.any linked\n',
    replacement: 'lambdaPart subst part = const false $ Array.any linked\n',
    probe: 'r005b-hint-lambda',
    message: /lambda part not recognised: .*no annotation can decide/
  },
  {
    // R11 by when predicates were made: the nested row, made first.
    name: 'r005b-tie-break', file: unresolved,
    needle: '  ordered = NonEmpty.sortWith sourceKey\n',
    replacement: '  ordered = identity\n',
    probe: 'r005b-tie-break',
    message: /made first reported: E_TYPE Cannot tell whether two's a or b /
  },
  {
    // R8's third note not recorded from the callee's written parameter.
    name: 'r005b-required-callee', file: argumentOrigin,
    needle: '    (requiredBy fieldsWritten subst (flexible types.argument))\n',
    replacement: '    (const (const subst) (flexible types.argument))\n',
    probe: 'r005b-required-callee',
    message: /callee side not recorded: .*written here @\{ \.\.\.r, \.\.\.s \}\]\n$/
  },
  {
    // Nor from the enclosing function's own parameter.
    name: 'r005b-required-own', file: argumentOrigin,
    needle: '    (requiredBy anyWritten subst (flexible types.parameter))\n',
    replacement: '    (const (const subst) (flexible types.parameter))\n',
    probe: 'r005b-required-own',
    message: /own parameter not recorded: .*written here @\{ \.\.\.r, \.\.\.s \}\]\n$/
  },
  {
    // T4 undone: H's refusal at the predicate's location.
    name: 'r005b-h-location', file: contradicted,
    needle: '  primary = maybe\' located identity\n',
    replacement: '  primary = const (located unit) $ maybe\' located identity\n',
    probe: 'r005b-h-location',
    message: /H at the predicate: E_TYPE .* @pickR \[excluded here/
  },
  {
    // D6 reading the caller's state, which lacks the failing binding.
    name: 'r005b-within', file: contradicted,
    needle: '  subst = maybe before identity cause.within\n',
    replacement: '  subst = before\n',
    probe: 'r005b-within',
    message: /failing state lost: E_TYPE Expected /
  },
  {
    // R10.1's case-bound part not looked for: Require's own text.
    name: 'r005b-case-bound', file: 'src/Features/Check/Fault.purs',
    needle: 'caseBound subst predicate view failure _ = Array.findMap faulted '
      + 'bound\n',
    replacement: 'caseBound subst predicate view failure _ = const Nothing '
      + '(Array.findMap faulted bound)\n',
    probe: 'r005b-case-bound',
    message: /case-bound part not at fault: E_TYPE Expected \{\}, found /
  },
  {
    // R6: the field path not recorded with a nested occurrence.
    name: 'r005b-nested-path',
    file: 'src/Features/Check/RowMerge/Desugar.purs',
    needle: '  (rebuilt site (Array.snoc steps (Field name)) subst part)\n',
    replacement: '  (rebuilt site steps subst part)\n',
    probe: 'r005b-nested-path',
    message: /nested path lost: E_TYPE Cannot tell whether wrapR's r or s has /
  }
];
