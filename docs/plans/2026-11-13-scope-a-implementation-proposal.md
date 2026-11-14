# Scope A: implementation proposal (not authorized)

Status: proposal only, as §18.194 directed. Nothing here is authorized.
It builds on the design (docs/plans/2026-11-13-scope-a-free-constructor-
design.md), whose §16 records the completed-dossier review. Source at
59e70fdb. Decided points it follows: U1 (`Pending` assurance), U2 (keep
the `DataApplication` name), U3 (a defensive refusal, keeping existing
refusals), U5 (all 118 together), U7 (re-pins as a reviewed list), U8
(the 3 excluded programs stay excluded). The original scope restrictions
stay, including those a theorem turned out not to need (§18.194).

## 1. Stage 0: close the review's gaps before code (needs approval)

Each item is a statement change or new evidence, so each comes back
before work starts.

| Id | What | Why (design §16) | Cost (analogy) |
|---|---|---|---|
| 0a | Add two conditions to D6, both measured to cost none of the 118: (D6.4′) no arrow, handler, holder head **or holder base** inside an `app` argument, at any depth, after substitution; (D6.8) no record inside an `app` argument | D6.4 as written does not enforce S8's argument hypothesis (§16.1); D6.8 keeps `App` comparison free of canonicalization (§16.2) | the author's review only |
| 0b | Relabel S5′: relative to `PG0Clauses`, lemma-level clauses of G0's check, assumed, and not implied by P-G0 as stated | §16.2 | text only |
| 0c | Lean: `canonA` with `evalA θ (canonA t) = evalA θ t`; restate `CheckA` through `canonA`; add the 2d examples (a `D` lacks atom, a tail, a refused `L(Int) = L(Bool)`); rerun the gate | `CheckA` is narrower than the compiler's check (§16.2) | 0.15-0.35M. Basis: S3's proof reused `subst_evalT`'s pattern in this module; permutation invariance of `compose` is the new part |
| 0d | Oracle amendment A2, grammar fixed and recorded before running: §16.3's rows (requirement bodies and the holder `Box`, records and tails in arguments as refusal controls, `match` arms, nested `L(L(a))`, `P(a, a)`, a generic call) | the S6 path and patterns are untested differentially (§16.3) | 0.2-0.4M. Basis: A1's build and run, §11 step 3 |
| 0e | Measure §16.1's record-tail case: does any of the 118 reach a declaration with a record-row tail from an in-scope head? If yes, either refuse those heads (D6.9) or extend `FT` | `FT` cannot express record tails (§16.1) | under 0.05M |
| | Review of Stage 0's results | | 0.1-0.2M |

Recommended: 0a, 0b, 0e before implementation; 0c and 0d too, unless
the author accepts §16.2's coverage gap at `Pending` assurance (0a's
D6.8 removes the case inside `App`, but records outside `App` stay
uncovered by S5′ without 0c).

## 2. Generation: the narrowed marker

`dataOf` (src/Features/Check/Generate/Translate.purs:129-146) keeps
`Application` unless every one of these holds for the owner `t` and its
arguments:
1. `t` has no `RecordSort` among its sorts (otherwise `OverRecords`, as
   today);
2. `t` declares no effect-row parameter (`rows` empty and the declared
   effect-row count 0);
3. `t` is not in the holder set;
4. every argument is plain: built only from `Int`, `Bool`, `Text`,
   `Unit`, type variables, and nullary or applied declared types that are
   not holders and that themselves meet 1-3, with no arrow, handler or
   record at any depth (D6.4′, D6.8).

The holder set must reach translation. Today it is computed from the
tables in `holdersOf` (Generate.purs:93-100) and attached at assembly;
the proposal passes the same `Holders` value into translation, so
marker and problem read one set. Rule 1 is unchanged.

## 3. Validation: the defensive refusal (U3)

In `checkSubstitution` (src/Features/Check/Strategy/Substitution.purs:
148-158), before the atom checks, and on the terms **after** `under
candidate`:
- refuse `Undefined id` for any `App (DataHead t) args` in `B`, `BQ` or
  `D` where `t` is undeclared, is a holder, has an effect-row or
  record-row parameter, or where some argument contains an `Arrow`, a
  `Record`, an `App (HandlerHead _)`, a holder head, or `Base (DataBase
  u)` with `u` a holder;
- in `requirementUnder` (Asked.purs:30-40), refuse `Undefined id` when a
  `BQ` atom's type contains an `App` and is not `defined` under the
  candidate (§16.1's missing link, closed fail-closed).

The problem needs one new table: which declared types have a record-row
parameter. Proposed: `recordRows ∷ Int` beside `types` and `rows` in
`DataArity` (src/Domain/Recorded/Arity.purs:20), filled by
`declarationsOf`. The effect-row count is already there.

Existing refusals keep their order and constructors. The new refusal
fires only on an `App`. Marked problems still reach rule 1 first in
`decide`. Any verdict that moves for a program outside the 118 stops the
work (§5).

## 4. Tests and assumption checks

Each new test is proven with a mutant: restore the defect in an isolated
copy and watch it fail.

| Test | Property | Mutant |
|---|---|---|
| S7 generation | for every in-scope `TData t args []` in the corpus and in generated declarations, the recorded term is `App (DataHead t) ⟦args⟧` with one recorded argument per type argument and no marker; every out-of-scope form keeps `Application` | drop an argument in Recorded.purs:36-38 |
| `TableBases` | every recorded `Base (DataBase u)` names a declared `u` of arity {types 0, rows 0} | record a parameterized type as a base |
| `kind (dataB t)` | GroundRule judges `DataBase t` as `declared holders t` | judge `DataBase` as `Holds` |
| holder set (K-a) | generated declarations (mutual recursion, row arguments, record fields, handler fields, argument-only propagation, chains of length 5) give `functional` equal to a literal JS reference of `Holder`/`HoldsFn` | remove each propagation case in turn |
| U3 refusal | R1, R4, R5, R6 (from research/r0-scope-a/counterexamples.mjs), the holder base `L(F)`, a record argument, and a flexible inside `App` bound to an arrow, each refused with `Undefined` when the marker is suppressed | disable the refusal: the marker still blocks; disable both: the test fails |
| requirement definedness | a `BQ` type with `App` and a repeated label after splicing is refused | remove the `defined` check |
| 0e's measurement as a test | no in-scope head reaches a record-tail declaration (or D6.9 refuses it) | add one |
| O3 | R4-R6 as kept regression rows | as above |

Every boundary gets a regression row that restores its defect (design
§8): effect-row heads, holder heads, arrows and holder bases in
arguments, records in arguments, handler heads, open requirement atoms,
rigid `RequirementAtoms`, record-row heads.

## 5. Pins: the exact permitted movements (U7)

Before any src change, commit the in-scope list as a fixture
(research/r0-scope-a/in-scope.json: the 118 origins, from
membership.json and exclusions.json, with the two Stage-0 conditions
applied). `scripts/r0-results-moved.mjs` against a baseline dump taken at
the parent commit is the arbiter. Any movement outside this list stops
the work and comes back.

**May move, and only as stated:**
- test/fixtures/r0/census.json: the `DataApplication` block
  (declarations, programs, only, marginal) decreases; totals that sum it
  follow. No other kind's block changes.
- test/fixtures/r0/rt8.json and window.json: declarations of the 118
  move from a class whose only marker is `Outside DataApplication` to
  Solved. A declaration with other markers keeps its verdict; its class
  label may lose `DataApplication` only where every one of its `app`
  nodes is in scope.
- test/fixtures/r0/t2-replacement-losses.json: exactly the 118 origins
  leave the lost set (252 to 134). FX032 stays a known defect; the 3
  existing refusals and 6 ErasedRow-only fixtures are unchanged.
- test/fixtures/r0/t2-gap-verdicts.json: entries of the 118 move to
  Solved only.
- New records, old ones kept: t2-minting-comparison11.json and
  t2-performance-11.json; t2-activation-gate.json repoints to them; the
  commit literal in test/r0-t2-activation-gate.test.mjs and the gate
  spec's Measured text follow.
- Unit tests that use an in-scope head to exercise the marker (about 25
  files, e.g. test/r0-generate-expr.test.mjs `Box(a) = Box(a)`,
  r0-translator-signature `List(Int)`, r0-generate-pattern, r0-markers,
  r0-decide, r0-decide-faults): each switches to an out-of-scope head
  (effect-row, holder or arrow argument) so the marker stays covered,
  with a paired test that the in-scope form records no marker. The edit
  list is part of the review.

**Must not move:** effects.json, effects-fail-only.json,
effects-coverage.json, problems.json, first-diagnostic.json,
corpus-manifest.json, t2-honest.json, t2-trace-inert.json,
t2-online-decisions.json, readback-termination.json,
t2-perf-attribution.json, the audit/, erased/, rt2/, r019/ and
elab-scope/ fixtures, and every earlier comparison and performance
record. No program outside the 118 changes verdict, refusal or
diagnostic. Regression proofs only grow.

## 6. Expected recoveries (conditional)

- 118 programs Solved under R0 `decide`: 12 with no requirement over
  `app` (A0), 106 with one (A1). Measured by suppression and predicted
  for the narrowed marker; the 0a conditions exclude none (measured).
  The count becomes a recovery only after Stage 0's approvals, the
  implementation, and a comparison and verify showing those programs
  Solved and nothing else moved.
- The 3 excluded programs stay lost (U8).
- Criterion 2 stays unmet: 134 losses and FX032 remain. The activation
  gate stays "live replacement: not met". No milestone moves; milestone
  3 gains evidence only when the recovered programs also run through
  the new path, which this proposal does not enable.

## 7. Cost

Analogies, with bases; none is a recorded estimate.

| Stage | Cost |
|---|---|
| Stage 0 (0a-0e and its review) | 0.45-1.0M |
| Implementation: §2-§4, regression rows, the test switch-over, pins per §5, comparison and performance protocol on the new src, one independent review, verify | 1.2-2.2M. Basis: design §11 step 6 (1.0-2.0M), plus the requirement-definedness refusal, the holder property test and the new table |
| Total | about 1.65-3.2M |

Machine time: a verify is about an hour at concurrency 2; the comparison
and protocol about 25 minutes; the Lean gate about 4 minutes.

Spent on this review and proposal: about 0.2M in agents (reviewer about
134K, citations about 64K) plus the controller's reads and probes,
roughly 0.15M, about 0.35M in all. That is slightly above the
design's 0.15-0.3M analogy for step 5.

## 8. Corrected plan (2026-11-14, §18.198; supersedes §2-§6 where they differ)

**Corrections required by the ruling** (I1-I4):
- Membership is research/r0-scope-a/in-scope-stage0.json: 116
  programs, losses 252 to 136. §5 and §6's 118 and 134 are superseded.
- **U3 is realized as detection in `checkSubstitution` and refusal of
  Solved by rule 1**, not as a refusal of the candidate. Reason (I2): in
  form.apply-meta and form.pipe-meta the arrow appears only after the
  candidate is applied, so generation cannot keep their marker. A
  candidate refusal would change their attempt (`Accepted`) and reason.
  Instead `checkSubstitution` returns `Valid` carrying the outside kinds
  the substituted terms expose (`DataApplication` for any `app` node
  outside the boundary), and `decide` treats a solution that exposes
  one exactly as a marker: it blocks Solved, keeps the run going (rule
  2's gating), and adds `Outside DataApplication` to the reason. The
  run then matches today's for those two declarations. `Valid` gains a
  payload; the trusted-surface record that says it has none is updated
  as a reviewed change.
- **The boundary is enforced, not measured** (I4). Generation computes,
  beside the holder set, the set of **admitted** declared types: no
  effect-row or record-row parameter, not a holder, and every
  declaration reachable through constructor fields (through type
  arguments, record fields and nullary declared types) expressible in
  the Lean model's `FT` (no record-row parameter, no effect-row
  argument). The narrowed marker and the exposure check read this one
  set. A generated property test compares it with a literal JS
  reference.
- **Pins:** test/fixtures/r0/problems.json holds digests of recorded
  problems, so it moves wherever markers change and wherever the new
  field is encoded. §5 listed it as must-not-move; that was wrong. Its
  check: every digest recomputed with the new field removed must equal
  the old digest except for declarations on the declaration allowlist.
- **Two allowlists, fixed before the implementation runs**, predicted
  by a JS model of the narrowing that is separate from the PureScript
  implementation (research/r0-scope-a/allowlists.mjs):
  1. program recoveries: exactly the 116 origins;
  2. declaration movements: each `origin#declaration` whose markers,
     class or reason change, with the old and new values. Any movement
     not on a list, or different from its entry, stops the work.

**Tasks** (the ledger is §8.1):
1. Records and allowlists: this section; baseline dumps at the parent
   commit; the allowlists from the JS model, committed before src.
2. Generation: `admitted` (Generate.purs beside `holdersOf`), the
   problem field and its canonical encoding, `dataOf` narrowed (owner
   admitted; arguments free of arrows, handlers, records, and of heads
   or nullary bases not admitted).
3. Validation: the exposure check on substituted `B`, `BQ` and `D`
   terms; `Valid`'s payload; rule 1 on the solution and rule 2's
   gating; the requirement-definedness refusal in `requirementUnder`.
4. Tests, each new one shown to fail on a restored defect: `under` =
   canonicalize after substitution and `canonical` idempotent
   (properties); generated holder-set and admitted-set tests against JS
   references; S7 generation; `TableBases`; `kind (dataB t)`;
   definedness; exposure for R1, R4, R5, R6, a holder base, a record
   argument, a transitive record-tail declaration through a nullary
   type, and the two preserved fixtures; marker tests switched to
   out-of-scope heads with paired in-scope tests; regression rows for
   every boundary.
5. Pins and movement: re-pin census, RT8, window, losses, gap verdicts
   and problems; compare the full movement report with both allowlists.
6. Comparison and performance on the final src (comparison11,
   performance-11), activation-gate repoint.
7. One independent review; fixes; full verify under the lock.

### 8.1 Ledger

| Task | State |
|---|---|
| 1 | in progress |
| 2-7 | not started |
