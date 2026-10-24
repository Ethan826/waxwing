// R0 shadow tranche regression rows, imported by scripts/regression.mjs;
// their probes are in test/regression-r0.mjs. Each restores one defect in
// a whole, compiling form.
import { r0WitnessRows } from './regression-r0-witness.mjs';
import { r0CxRows } from './regression-r0-cx.mjs';
import { r0ElabRows } from './regression-r0-elab.mjs';
import { r0PortRows } from './regression-r0-port.mjs';

export const r0Rows = [
  {
    // Task 1.2: the driver stops at the first failing body, as `traverse`
    // over Either did, so a later broken declaration is hidden (G-hide).
    name: 'r0-first-left-hides',
    file: 'src/Features/Check/Outcomes.purs',
    needle: '  bare = map (declared holders program) program.functions\n',
    replacement: '  bare = upTo (map (declared holders program)'
      + ' program.functions)\n'
      + '  upTo entries = maybe\' (const entries)\n'
      + '    (\\index → Array.take (index + 1) entries)\n'
      + '    (Array.findIndex failed entries)\n'
      + '  failed declaration = either (const true) (const false)'
      + ' declaration.report.today\n',
    probe: 'r0-first-left-hides',
    message: /second broken declaration hidden: E_TYPE Expected Int, found/
  },
  {
    // Task 2.1 (AT16): a catch-all in the one classifier. With the
    // `Exhausted` arm gone, `_` takes it, and a broken invariant would be
    // classed as a mismatch, a semantic claim. (A `_` beside all fifteen
    // arms changes nothing, so the arm is deleted.)
    name: 'r0-classify-catchall',
    file: 'src/Features/Check/RowOutcome.purs',
    needle: '  Exhausted what → Left (Internal what)\n'
      + '  -- B4: H\'s refusal is made only inside its predicate\'s'
      + ' `FromMerge`\n'
      + '  -- (rules §7); bare, it is a broken invariant, as the renderers'
      + ' say.\n'
      + '  Homeless _ → Left (Internal "H\'s refusal outside a'
      + ' predicate")\n',
    replacement: '  Homeless _ → Left (Internal "H\'s refusal outside a'
      + ' predicate")\n'
      + '  _ → contradiction\n',
    probe: 'r0-classify-catchall',
    message: /Exhausted classed as AsMismatch, not a fault/
  },
  {
    // Task 5.1 (AT6): premises read from `D` as well as `B`, so a `D`
    // atom is accepted as a premise (F1: premises are `B` atoms only).
    name: 'r0-d-premise',
    file: 'src/Features/Check/Refute/Rules.purs',
    needle: '  if any cites sig.d then Left (DAtomPremise premise)\n'
      + '  else if any cites sig.b then Right unit\n',
    replacement: '  if any cites (sig.d <> sig.b) then Right unit\n',
    probe: 'r0-d-premise',
    message: /D atom accepted as a premise: Right/
  },
  {
    // Task 4.1 (AT8; Q13 option A-i): a refused candidate stops the run
    // as a fault instead of being one attempt among others.
    name: 'r0-refused-stops',
    file: 'src/Features/Check/Strategy.purs',
    needle: '  Candidate cert claim hints → Right (checked spec problem cert'
      + ' claim hints)\n',
    replacement: '  Candidate cert claim hints → either (const (Left'
      + ' (BrokenInvariant "refused"))) (const (Right (checked spec problem'
      + ' cert claim hints))) (spec.check problem cert)\n',
    probe: 'r0-refused-stops',
    message: /a refused candidate stopped the run: Faulted/
  },
  {
    // Task 4.1 (rule 3, G-A-i(b)): any refused candidate, Heuristic too,
    // outranks Limit, so an expected refusal hides a budget limit.
    name: 'r0-limit-hidden',
    file: 'src/Features/Check/Decide/Reason.purs',
    needle: '    if any refusedComplete readings then Nothing\n',
    replacement: '    if any refused readings then Nothing\n',
    probe: 'r0-limit-hidden',
    message: /Limit hidden by a Heuristic refusal: Unresolved Inference/
  },
  {
    // Task 4.1 (AT11, rule 1): the outside markers no longer block.
    name: 'r0-marker-ignored',
    file: 'src/Features/Check/Decide/Reason.purs',
    needle: '  nubEq (map outside view.outside) <> spread <> requirements\n',
    replacement: '  nubEq (map outside []) <> spread <> requirements\n',
    probe: 'r0-marker-ignored',
    message: /a marker did not block Solved: Solved/
  },
  {
    // Task 4.1 (AT17, Q10): a shadow refuter's checked counter-instance
    // changes the verdict, though it is never evidence.
    name: 'r0-shadow-decides',
    edits: [
      { file: 'src/Features/Check/Decide.purs',
        needle: 'import Data.Foldable (foldM)\n',
        replacement: 'import Data.Foldable (any, foldM)\n' },
      { file: 'src/Features/Check/Decide.purs',
        needle: '  map (decision ran) (verdictOf blocked ran)\n',
        replacement: '  map (decision ran) (if any found (map'
          + ' (shadowRecord checking.budget ran.hints problem)'
          + ' checking.shadows) then Right (Unresolved { reason: reason'
          + ' blocked ran.attempts, hints: [] }) else verdictOf blocked'
          + ' ran)\n' },
      { file: 'src/Features/Check/Decide.purs',
        needle: '  blocked = blocks (checking.openRequirements problem)'
          + ' problem\n',
        replacement: '  blocked = blocks (checking.openRequirements problem)'
          + ' problem\n  found record = either (const false) (const true)'
          + ' record.result\n' }
    ],
    probe: 'r0-shadow-decides',
    message: /a shadow refuter changed the verdict: Unresolved/
  },
  {
    // Task 4.2 (Task 6.5 relies on it): G0 drops the definedness check
    // of an equation's sides, so d02's annotation `{ a: Int, ...r }`
    // with no `r lacks a` in `D` is accepted.
    name: 'r0-definedness-dropped',
    file: 'src/Features/Check/Strategy/Atoms.purs',
    needle: '  | not (defined known one && defined known other) ='
      + ' Left (Undefined id)\n  | one == other = Right unit\n',
    replacement: '  | one == other = Right unit\n',
    probe: 'r0-definedness-dropped',
    message: /d02's annotation accepted: Right/
  },
  {
    // Task 4.2 (§3.2(b), §18.70): G0's limit made global. `pr` at a
    // rigid variable joins §3.2(a)'s open set, so rule 1 blocks on the
    // atoms G0's guard declines, for every strategy.
    name: 'r0-g0-limit-global',
    file: 'src/Features/Check/Decide/Open.purs',
    needle: '  Printable _ → const Holds\n',
    replacement: '  Printable _ → rigidOpen\n',
    probe: 'r0-g0-limit-global',
    message: /G0's limit blocked every strategy: Unresolved Unsupported/
  },
  {
    // Task 4.3, criterion 1: the shadow assembly's detector replaced, so
    // an atom open until G-ValidR no longer blocks G0's Solved.
    name: 'r0-shadow-detector',
    file: 'src/Features/Check/Decide/Shadow.purs',
    needle: '  , openRequirements\n',
    replacement: '  , openRequirements: const []\n',
    probe: 'r0-shadow-detector',
    message: /the shadow detector let Solved through: Solved/
  },
  {
    // Task 4.3 (RT8's first run): a constructor pattern's slot read as
    // an expression's, so P4's `inst` variables have no value.
    name: 'r0-ctor-slot',
    file: 'src/Features/Check/Strategy/ReadBack/Position.purs',
    needle: '  AtPattern (Checked.Pattern found) → readType <$>\n'
      + '    (ownerArgument found.ty >>= indexed at.rank)\n',
    replacement: '  AtPattern _ → Left "a pattern where an expression was'
      + ' expected"\n',
    probe: 'r0-ctor-slot',
    message: /a constructor pattern's slot was not read: Searched Broke/
  },
  {
    // Task 4.3, criterion 5: the read-back leaves holes unbound, so `pr`
    // at an open flexible variable meets G0's backstop.
    name: 'r0-hole-unbound',
    file: 'src/Features/Check/Strategy/ReadBack.purs',
    needle: '  settledBinding (Tuple variable value) = Tuple variable'
      + ' (settled value)\n',
    replacement: '  settledBinding (Tuple variable value) = Tuple variable'
      + ' (identity value)\n',
    probe: 'r0-hole-unbound',
    message: /a hole was left unbound: CheckFailed \w+ RequirementUnjudged/
  },
  {
    // Task 4.3, criterion 3 (ruling R3): a stopping kind routed as
    // confined, so doubt about shared input lets the run go on.
    name: 'r0-stop-confined',
    file: 'src/Features/Check/Strategy/Online/Ending.purs',
    needle: '  TableLookup → Stops\n',
    replacement: '  TableLookup → Confined\n',
    probe: 'r0-stop-confined',
    message: /a TableLookup failure was confined: Solved/
  },
  {
    // Task 4.3 (RT8's recorder defect): E17 types a partial perform as
    // the operation's result, which today's solver does not. Since Task
    // 7.1b E17 shares E5's typing (Generate.Call `applied`), so the
    // restored defect types every partial use so.
    name: 'r0-perform-arity',
    file: 'src/Features/Check/Generate/Call.purs',
    needle: '    { ty: arrowOf (Array.drop (Array.length generated)'
      + ' found.parameters)\n        found.result\n',
    replacement: '    { ty: found.result\n',
    probe: 'r0-perform-arity',
    message: /a partial perform was recorded as its result: CheckFailed/
  },
  {
    // Task 4.3 (ruling R10 (iii)): the declaration found by id alone, so
    // another program's declaration is searched for the problem.
    name: 'r0-declaration-by-id',
    file: 'src/Features/Check/Strategy/Online.purs',
    needle: '  same regenerated = fields (Elaborating.problem regenerated)'
      + ' == fields problem\n',
    replacement: '  same _ = true\n',
    probe: 'r0-declaration-by-id',
    message: /another program's declaration was searched: Solved/
  },
  {
    // Task 4.4 (W §4 Cov): coverage accepts every witness, so one
    // missing an auxiliary is offered for compilation.
    name: 'r0-cov-skipped',
    file: 'src/Features/Check/Strategy/Witness.purs',
    needle: '  traverse_ covered (Set.toUnfoldable domain ∷ Array Var)\n',
    replacement: '  const (pure unit) (traverse_ covered'
      + ' (Set.toUnfoldable domain ∷ Array Var))\n',
    probe: 'r0-cov-skipped',
    message: /a witness missing an auxiliary passed Cov: Right/
  },
  {
    // Task 4.4 (W §1.5): the hole contract skipped, so a binding alone
    // lets a default that breaks `B` stand.
    name: 'r0-hole-contract-skipped',
    file: 'src/Features/Check/Strategy/Witness.purs',
    needle: '  holeContract problem witness\n',
    replacement: '  const (pure unit) (holeContract problem witness)\n',
    probe: 'r0-hole-contract-skipped',
    message: /route's defaulted u was witnessed: Witnessed/
  },
  {
    // R022: the read-back blind to a variable's sort, so a row slot's
    // bare hole is the type `hole n` and G0 refuses σ as not generic.
    name: 'r0-readback-sort-blind',
    file: 'src/Features/Check/Strategy/ReadBack/Type.purs',
    needle: '  SortRow, TVar (Hole index) → Record [] [ holeVar index ]\n',
    replacement: '  SortRow, TVar (Hole index) →'
      + ' readType (TVar (Hole index))\n',
    probe: 'r0-readback-sort-blind',
    message:
      /r022-disjoint: the read-back σ was refused: CheckFailed NotGeneric/
  },
  ...r0WitnessRows,
  ...r0CxRows,
  ...r0ElabRows,
  ...r0PortRows
];
