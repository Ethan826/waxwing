# R005 Tranche B Implementation Plan (open-row merge)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking. The user accepted Task 0
> and authorized Task 1 (2026-10-17); the user then authorized Task 2
> alone (2026-10-17), then Task 3 alone (2026-10-17), then Task 4 alone
> (2026-10-17), then Task 5 alone (2026-10-18). Tasks 6-10 are not
> authorized.

**Goal:** `fn merge(a: { ...r }, b: { ...s }): { ...r, ...s } where r
disjoint s = { ...a, ...b };` and everything it needs: record rows with
several tails, persistent disjointness, deferred row equations solved by
forced moves, the merge literal with any number of spreads, removal and
rest binders over such rows, specialization and Go lowering, and the
approved diagnostics, each claim backed by a fixture or an oracle
property.

**Spec:**
- docs/plans/2026-10-16-open-row-merge-design.md (draft 3, user decisions
  1-10 of 2026-10-17): §1 representation and store, §2 solving, §3
  disjointness, §5.2 removal, §6 end of body, §8 `Both`, §9 lowering,
  §10 texts, §12 tests, §13 task breakdown (this plan's slicing).
- docs/plans/2026-10-17-open-row-merge-diagnostics.md (approved
  2026-10-17 with corrections, its §0): D4 and D6 rendering, rules
  R1-R11, Examples 1-19, the user's decisions on R10 and metadata.
- docs/plans/2026-10-16-open-row-merge-review.md: findings F1-F13, each
  closed by a check listed below ("Review findings and their checks").
- research/open-row-merge/README.md: the prototype, the brute-force
  oracle, the counterexamples and the campaign this plan ports.
- docs/adr/013-records.md and docs/plans/2026-10-16-record-extension-
  plan.md (Tranche A; format precedent; its approved texts).
- docs/engineering.md, "Evidence for solvers and diagnostics" (approved
  2026-10-17 with proportional scope): the evidence rules below are this
  plan's requirements; the plan's solver is squarely in that scope.
- docs/plans/2026-10-17-open-row-merge-rules.md (Task 0): the argument
  for every solving rule, rewrites and defaulting apart, with its
  exhaustive and random evidence.

**Architecture:**
- **One row, many tails.** `RecordRow a v = { fields, tails ∷ Array v }`
  (design P1), sorted, repeats kept. No concatenation node. Every
  consumer handles any number of tails before any producer makes two
  (Task 1).
- **The store lives in the substitution**, in a new
  Features.Check.RowStore held by `Subst` (design P2): `lacks` and
  `because` (generalising `written`), `apart`, `upper` with narrowing
  reasons, `pending`, `naming`, `arrivedAt`, and the causal reasons of
  bindings (`boundBy` for commits and drain bindings, `emptied` for U4).
  It reverts with the substitution when a postponed effect pair reverts.
- **Diagnostic metadata is separate.** Part identity, creation span,
  lambda-parameter name, instantiated type origin and owner variable
  live in Features.Check.PartOrigin (also inside `Subst`, so they
  revert), written by the checker where rows are made and read only by
  the renderers. No solver module imports it (a structural test).
- **An explicit three-way result.** Row solving ends in
  `Solved Subst | Contradiction Contradiction | Unresolved
  (NonEmptyArray Pending)` (Features.Check.RowOutcome). Inside
  unification a contradiction is `Left` with its `Because`; `Unresolved`
  arises only at the end of a body. Renderers take only this value: D1,
  D2, D2', D3, D3', D3'' and D6 only from `Contradiction`, D4 only from
  `Unresolved`. The result type is the safeguard: a renderer that takes
  only the `Unresolved` payload cannot render a contradiction, and the
  fixtures check each class behaviourally.
- **Forced moves only** (user decision 3): cancel, sum rule with upper
  bounds, one meta alone, commit a constant with one home, shared
  remainder, defer, quiet. No search, no basis expansion.
- **The merge literal** is Tranche A's `RecordExtension` with any number
  of `Spreading` items; Go lowering evaluates items left to right into
  temporaries and builds the struct from the items' ground layouts.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Status:** Draft 2026-10-17, corrected after the user's review of the
same day. Task 0 accepted (2026-10-17, branch r005b-task0); Task 1
done (branch r005b-task1); Task 2 authorized and done on branch
r005b-task2 (2026-10-17); Task 3 authorized and done on branch
r005b-task3 (2026-10-17); Task 4 authorized alone and done on branch
r005b-task4 (2026-10-17, awaiting review); Tasks 5-10 not authorized.

## Global Constraints

- **AGENTS.md governs:** files ≤250 lines; 80 columns (`node
  scripts/width.mjs` after `git add`, check its exit code); `where`, not
  `let … in`; no anonymous lambdas; `maybe`/`either` with named helpers;
  layer and IR allowlists; error codes as an ADT; regression proofs fail
  with the defect restored, in an isolated copy.
- **Three-way result.** Every diagnostic from row solving is rendered
  from a `RowOutcome` (above). The D4 renderer's only input type is the
  `Unresolved` payload and D6's the `Contradiction` payload (a structural
  test of their signatures), and the fixtures assert each example's class
  and text. No test bans a word in source (the user's correction of
  2026-10-17 withdrew draft 1's substring test): result types and
  behavioural checks are the safeguard.
- **Approved texts and their locations** (all E_TYPE unless stated;
  design §10, diagnostics file §0-§3). Nothing else may be emitted; a
  new text is a stop for the user.

  | ID | Text | Location and notes | Task |
  |---|---|---|---|
  | D1 | `admin is not allowed here: r lacks { admin }` (Tranche A) | the argument or item being required; `required here` at the clause's label | 3 (precedence) |
  | D2 | `Field a is in both records: r disjoint s` | the later contributor; `first written here` at `arrivedAt`; `required here` at the clause or the implying type's later `...s` | 3 |
  | D2' | existing E_DUPLICATE `Duplicate field a` | immediate: the later item, `first written here` at the earlier; late: the completing expression, `first written here` at the earlier item, `written again here` at the later | 7 |
  | D3 | `r and s are not known to be disjoint`; hint `require r disjoint s in the signature` | the expression being required; `required here` at the clause or implying type; none for a literal | 3 |
  | D3' | `r is in both records and may have fields` | as D3 | 3 |
  | D3'' | existing `s may already have field a` | `s is introduced here` at the signature's first `...s`; `required here` at the clause | 3 |
  | D4 | the diagnostics file's §2 forms (`Cannot tell whether O's A or B has field l`, `which of …`, `holds t`, `(in field P)`, ownerless and numbered forms) with R9's hints | R7: the deferring unification's site; R8's notes | 6 |
  | D6 | the diagnostics file's §2 forms (`O's ROW must be OTHER, so A cannot have field l`, `but neither …`, `none of …`, `cannot hold t`, nested, ownerless) | R7: the expression being checked; R8: `required here` at the equation's site, `excluded here` per removed home | 6 |
  | D8 | `...r is written twice in one record` | the second `...r`; `first written here` at the first | 2 |
  | D9 | `A disjoint constraint must name two different row variables` | the clause's second `r` | 2 |

  Kept from Tranche A unchanged: `r may already have field admin`,
  `age is not a field of { … }`, `Duplicate field`, `Expected a record,
  found T`, the `lacks` target texts. Still Proposed, never emitted: the
  `removed here` note (design §5.2), D4's hint suffix `or state the parts
  in the enclosing signature`, any location rule the approved rows do
  not fix. The rank of `Equated` (last, design §1.3) is approved
  (2026-10-17) for choosing between competing provenance reasons of one
  fact; the causal rules R10.1-R10.3 still decide which explanation a
  failure gets, and their control fixtures (`participation-control`,
  `lone-meta-lack`, `diag-14` in every order, `diag-19` and `diag-19-x`)
  must keep passing.
- **Retired texts** (approved by the user, 2026-10-17). `Only one row
  tail is allowed` retires for record types (Format/Parse/RecordType.purs)
  in Task 2 and stays for effect rows (Format/Parse/Row.purs). Tranche
  A's approved `A record literal accepts at most one spread` (Problem
  `SecondSpread`, Resolve/Record) retires in Task 7, when several spreads
  become supported: no literal is then refused for its number of spreads
  (an overlap is D2').
- **Buildable commits** with placeholders, as in R004 and Tranche A:
  `Internal "R005B placeholder: <what> (Task N)"` at the first
  downstream function that can fail; a function that cannot fail gets a
  real case. Task 8 gates on `grep -rn "R005B placeholder" src` being
  empty; Task 10 repeats it.

  | Added in | Placeholder at | Text after `R005B placeholder: ` | Removed in |
  |---|---|---|---|
  | Task 2 | Check: the first record unification or flattening that meets a row with two or more tails (Check/UnifyRecord entry, Check/FlatRecord callers that assume one tail) | `rows with several tails are checked in Task 4` | Task 4 |
  | Task 2 | Check/Function and Check/Use where a resolved `Disjoint` constraint would be seeded | `disjoint constraints are checked in Task 3` | Task 3 (removed, 32c74fa) |
  | Task 4 (landed e63f7f4) | Check/RowSettle `placing`, called by Check/UnifyRecord: a residue whose constants each have several homes, or a quiet residue | `equations that wait are solved in Task 5` | Task 5 |
  | Task 2 (moved earlier, user 2026-10-17) | Check/SeveralTails `withinOneTail`, called by Check/Removal and Check/RecordPattern `restOf` (named rest only; bare `...` is accepted): a receiver or scrutinee whose flattened row has two or more tails | `rest binders and removal over several tails are typed in Task 7` | Task 7 |
  | Task 4 (landed e63f7f4) | Specialize/Record `recordType`: a row with two or more tails under a key | `rows with several tails are lowered in Task 8` | Task 8 |
  | Task 5 | the end-of-body report of an `Unresolved` outcome | `unresolved row equations are reported in Task 6` | Task 6 |
  | Task 5 (added early, in Task 4, e63f7f4) | Check/Lacked `refusedAt`, called by Require and Reject: a refusal whose reason is `Equated`, an `Outside` (a bound violated, also a meta U4 emptied by bounds alone) or a `Derived` lack; a refusal a `boundBy` binding caused is not yet told apart (R10.1, Task 6) | `contradictions from equations are reported in Task 6` | Task 6 |

  **Task 2's two placeholders as landed** (2026-10-17): the first is
  `Failure.Placeholder` (Check/UnifyFailure), returned by
  Check/UnifyRecord when either flattened row has two or more tails and
  rendered as E_INTERNAL by Check/Placeholder `placeholderAt` from
  Require `expectType`, Reject and Record `select`; `select` is the one
  caller that read every unification failure as a missing field (field
  access `w.a` and removal `w without { a }` over such a row), so it
  passes the placeholder through. The second is Check/Placeholder
  `withoutDisjoint`, called at the start of Function `checkFunction`
  (at the function) and Use `functionUse` (at the call), each over the
  callee's resolved constraints. Task 3 removes only the second; Task 4
  the first. Task 3 removed the second (32c74fa; Check/Placeholder now
  holds only `placeholderAt`): the placeholder texts left in src are
  Check/UnifyRecord's (several tails, Task 4) and Check/SeveralTails'
  (rest binders and removal, Task 7). Task 4 (e63f7f4) removed
  Check/UnifyRecord's and added three: Check/RowSettle's (waiting
  equations, Task 5), Specialize/Record's (lowering, Task 8) and, moved
  earlier from Task 5 because Task 4's sum rule and bounds can make
  `Equated` reasons, Check/Lacked's (contradictions from equations, Task
  6; no source of Task 4's corpus and no generated problem reaches it).
  The placeholder texts in src after Task 4 (`grep -rn "in Task [5-8]\""
  src`; Check/Placeholder `placeholderAt` adds the `R005B placeholder: `
  prefix to all but Specialize's, which writes it): Check/RowSettle (Task
  5), Check/Lacked (Task 6), Check/SeveralTails (Task 7),
  Specialize/Record (Task 8).

  A test that needs D4 or D6 before Task 6 asserts the placeholder's
  E_INTERNAL message (it pins the result class); Task 6 changes those
  assertions to the approved texts in the same commit that removes the
  placeholder.
- **Go output** of existing programs stays byte-identical in every task
  (bootstrap snapshots; the differential's emit and compile phases for
  sources both trees compile).
- **Splits on demand.** Line counts measured 2026-10-17 at 97ba05b (≥200
  shown). Extract a module before adding to any file listed; each split
  is its own behaviour-preserving commit (build, the touched area's
  tests, differential 0 differences):

  | File | Lines | Touched by |
  |---|---|---|
  | src/Format/Parse/Grammar.purs | 244 | not expected (Constraint is its own module) |
  | src/Features/Check/Settle.purs | 240 | Task 5 (drain in each round) |
  | src/Domain/Type/Core.purs | 236 | Task 1 |
  | src/Features/Check/Consume.purs | 236 | Task 4 if it walks record tails |
  | src/Features/Resolve.purs | 235 | Task 2 (D8) |
  | src/Features/Check/Subst.purs | 233 | Task 3 (split first: RowStore, PartOrigin) |
  | src/Features/Check/Use.purs | 231 | Task 3 (seeding of pairs) |
  | src/Features/Check/Scheme.purs | 228 | Task 1 |
  | src/Features/Check/Infer.purs | 224 | Task 7 |
  | src/Domain/IR/Internal.purs | 218 | Task 8 |
  | src/Domain/Type/Parts.purs | 217 | Task 1 |
  | src/Features/Check/TypeName.purs | 215 | Task 6 (printing tails) |
  | src/Features/Check/Failure.purs | 210 | Task 5 (D4 before `settleFinal`) |
  | src/Features/Check/RecordPattern.purs | 206 | Task 7 |
  | src/Features/Resolve/Lacking.purs | 205 | Task 2 (pairs) |
  | src/Features/Check/UnifyRow.purs | 203 | Task 1 (effect rows only, check) |
  | src/Features/Check/Nested.purs | 202 | Task 8 (growth rule) |
  | src/Features/Check/Extension.purs | 198 | Task 7 |
  | src/Format/Diagnostic.purs | 194 | Tasks 2, 3, 6 (texts: extract Format.Diagnostic.Records first) |
  | src/Domain/Problem.purs | 188 | Tasks 2, 3, 6 |
  | scripts/differential.mjs | 173 | Tasks 1-8 (projections go to differential-project.mjs) |
  | test/r005-parse.test.mjs | 239 | Task 2 (new tests go in new files) |

- **Every task:** tests seen failing first (red log under
  .build/evidence/r005b-tN-red.log); `rm -rf output &&
  GOTOOLCHAIN=go1.26.4 npm run verify` exits 0 on the committed tree
  (about 12 minutes since T013); a classified differential (`node
  scripts/differential.mjs --corpus all --regenerate` against the
  task's base, built in an isolated copy) with the task's allowed
  differences stated in the task; delete .build/regression,
  .build/go-cache and the base copy afterwards; no `git stash`; one
  task at a time, so timing tests stay stable.
- **Evidence rules** (the coordinator's requirements of 2026-10-17):
  1. *Oracle claims.* The compiler-backed oracle test checks the claim
     behind each result: `Solved` → the emitted solution (unsolved metas
     empty) satisfies every constraint; `Contradiction` → brute force
     finds no solution; `Unresolved` → no claim about the number of
     solutions in general. Three permanent fixtures pin the buckets and
     **assert** their counts: `odd-cycle` 0, `determinate` 1, `diag-01`
     4 (research fixtures.mjs from Task 0, and the compiler oracle test
     from Task 5, each failing if a count changes or a bucket loses its
     fixture). These are claims about those fixtures, which keep all
     three cases of `Unresolved` covered, not a cardinality claim of
     `Unresolved`.
  2. *Executable examples.* Each worked example of the design and the
     diagnostics file is a data fixture (below), checked against the
     research oracle before Task 0's gate and, through the compiler, at
     the stages its `stages` field names ("Test stages", below).
  3. *Rule arguments* (docs/plans/2026-10-17-open-row-merge-rules.md).
     A rewrite must preserve solutions, fresh metas accounted for (the
     solutions of the new state, read back and restricted to the old
     metas, are exactly the old solutions); a rejection must establish
     that no solution exists; iteration must terminate. The one
     defaulting rule, the end-of-body empty default, selects a solution
     instead: its obligation is that the selected solution satisfies
     every constraint and is the least. Each rule is tested on small
     exhaustive domains (whole-state solution preservation, property E,
     on every run) and on random problems. Performance heuristics are
     labelled `heuristic` in the arguments and in comments, apart from
     correctness rules.
  4. *Claims ledger.* Each factual claim about the algorithm names its
     fixture or oracle property, or is marked "argument, not yet
     checked" (initial ledger below). No unbacked claim passes Task 0's
     gate; a row may stay "argument" only if the user accepts it so.
  5. *Findings close with a check.* A review finding (F1-F13, the
     user's 2026-10-17 review, and any later finding) is resolved by a
     regression row, a fixture or an oracle property, never by a
     document edit alone.
  6. *Cross-boundary generation.* Task 9's generator of real programs
     compares the compiler with an independent reference and shrinks
     failures into permanent fixtures.
- **Test stages** (the user's correction of 2026-10-17). Every program
  that defines `merge` or `merge3` has a body with two spreads, refused
  until Task 7, and runs only once Task 8 lowers rows with several tails.
  So each test is one of three kinds, and a task lists only the kinds it
  can run ("Test stages", below): *solver and renderer* tests (constructed
  constraint problems through the exported unification entry, and
  check-phase sources with no literal of two or more spreads), from the
  task that implements the rule; *complete-source checking* of the
  published examples, from Task 7; *execution*, from Task 8.
- **Models:** Opus for Tasks 0, 3, 4, 5, 6, 7 and 9 (solver,
  diagnostics, evidence); Sonnet for Tasks 1, 2, 8 and 10 (mechanical),
  with an Opus review of Task 1's differential, Task 8's lowering and
  every task's regression rows.

## Review Focus

1. **The result classes.** No path renders D6 from `Unresolved` or D4
   from `Contradiction`; the odd-cycle program (no solution) is D4,
   because the checker has not established a contradiction. Tasks 4-7.
2. **Reasons survive solving.** R10.1 (commit and drain bindings keep
   their causal equation, and only those), R10.2 (U4's `{}` reports the
   pruning fact), R10.3 (a bound names an equation that excludes the
   atom, earliest site first). Tasks 3-7.
3. **The one-tail differential.** Tasks 1, 4 and 5 change no existing
   program's outcome; Task 3 changes exactly P1-P7 of design §1.6.
4. **Order independence.** The verdict class is the same for every
   constraint order (C2), at the oracle level and on generated programs.
   Tasks 4, 5, 9.
5. **Rollback and the joint fixpoint.** The store reverts with a
   postponed effect pair; the end alternates settle rounds and the drain
   until neither moves. Task 5.
6. **Evaluation order** of `{ ...g(), x: f(), ...h() }`: g, f, h once
   each, in Go and in the reference interpreter. Task 8.
7. **Exhaustive case analyses** over `tails` (Walk, Printable,
   Comparable, TypeName, Specialize, Format.Go record helpers). Task 1.

## Claims ledger (completed in Task 0, 2026-10-17)

Each factual claim of draft 3, the diagnostics file and this plan about
the algorithm, with what backs it. "Backed" names a fixture, an oracle
property or a run; "argument, not yet checked" names the argument
section (rules file, below "rules §") and why no check exists yet. The
compiler-side check each later task adds is in the last column. Commands
run from research/open-row-merge/ (README.md); "exhaustive" is
exhaustive.mjs on domains A and B, every problem in every order;
"campaign" is perm.mjs seeds 21-28 × 12,000 × five orders, raw and
dense, with `STATE=1`; "fixtures" is fixtures.mjs over
test/fixtures/r005b/.

| # | Claim (where) | Backing (Task 0) | Status | Compiler check (task) |
|---|---|---|---|---|
| L1 | With one tail per side the rule makes ADR 013's rules 1-6 (design §2.3) | rules §6, §8; exhaustive: 0 commits, deferrals or quiet equations in 47,496 + 1,550 one-tail problems, with S, H, L, E | backed for the prototype; the equality with the compiler's rules backed since Task 4 (below) | Task 4 differential `--corpus all`, 0 differences; exhaustive one-tail domain in test/row-merge.test.mjs; compiler check done (Task 4): the one-tail problems of domains A and B (22,308 and 585 problems, 122,232 and 2,854 runs) in every order equal an independent model of ADR 013's rules (test/row-merge-adr013.mjs), verdict and solution, none waiting (test/row-merge-domains.test.mjs); differential 0 differences among sources with neither several tails nor `disjoint` |
| L2 | The sum rule is sound: it restates `m ⊆ C2 ⊎ M2` (§2.5) | rules §5; exhaustive E and H (bound, lack, apart fired in 3.3M, 142k, 197k runs of A); campaign; the rigid condition's sensitivity run | backed | exhaustive domain (Task 4); compiler check done (Task 4): domain A whole (scripts/row-merge-exhaustive.mjs, 19,305,292 runs) and domain B whole (in verify), H and S 0 failures |
| L3 | Solving terminates; the measure decreases (§2.7) | rules §13; exhaustive: state changes ≤ the measure on every run (max ratio 2/3) | backed (prototype) | step counter bounded by the measure (Task 4); compiler check done (Task 4): the store's `changes` counter within the measure on every run of both whole domains and the generators (0 over) |
| L4 | At most \|Π\|·\|Κ\| solver-made metas (§2.7) | exhaustive: max ratio 1/3; growth.mjs worst 12 of 196 | backed | asserted per problem (Task 4); compiler check done (Task 4): `fresh` within \|P\|·\|K\| on every run (0 over) |
| L5 | Satisfiability is NP-complete (§2.7) | the reduction (design §2.7); sat13.mjs: the instances are D4 | argument (a proof, not a measurement), accepted as such by the plan; instances checked | none |
| L6 | A least solution's existence is coNP-hard (§2.7) | the construction; switch.mjs 400 of 400 | backed | none |
| L7 | Quiet equations do not multiply (§2.2) | chain.mjs, n up to 40; quiet fired in 6,518 runs of B with E | backed | `r005b-quiet` timing row (Task 5) |
| L8 | Review F2's family: all 186 programs with a least solution accepted (§2.5) | shared.mjs | backed (prototype) | level 2 shared-parameter generator (Task 9) |
| L9 | C1: one pending equation at D4 ⇒ no least solution (§12) | exhaustive c1fail 0; campaign `d4OnePendingWithLeast` 0 | backed | compiler oracle test (Task 5) |
| L10 | C2: verdict class independent of order (§12) | exhaustive: every order of every problem, 0 differences; campaign 0 | backed | compiler oracle test (Tasks 4, 5); compiler check done (Task 4) for the runs that reach a verdict: one verdict for every order of every problem in both whole domains and the generators (0 differences; runs reaching Task 5's placeholder are counted apart, never a verdict) |
| L11 | Solved emits a solution | exhaustive and campaign `solvedViolates` 0; fixtures (every Solved fixture) | backed | compiler oracle test (Task 4); compiler check done (Task 4): S 0 failures (796,409 Solved runs in domain A, 177,028 in B, and the generators) |
| L12 | Contradiction ⇒ no solution | exhaustive and campaign `dishonest` 0 (refusals by kind in rules §0); fixtures | backed | compiler oracle test (Task 4); compiler check done (Task 4): H 0 failures (17,705,571 Contradiction runs in domain A, 233,144 in B, and the generators) |
| L13 | Unresolved makes no claim on the count; occurs with 0, 1, several | fixtures assert `odd-cycle` 0, `determinate` 1, `diag-01` 4 and that the three buckets stay covered (failing demonstrations recorded in Task 0); unresolved.mjs; exhaustive buckets 466 / 120 / 59,554 (A) | backed | the same counts asserted by the compiler oracle test (Task 5); texts (Task 7) |
| L14 | D4 with a least solution needs two pending equations sharing a meta (C3, §2.2) | exhaustive: 120 (A) and 80 (B) such runs, c3fail 0; campaign 3,205 and 45, all within C3 | backed | compiler oracle test with a recorded ceiling (Task 5) |
| L15 | Removal by the fresh remainder keeps no held label (§5.2) | rules §11; removal.mjs; fixtures `design-removal-left`, `-right`, `-rest-field`, `-wait` | backed (labels) | `r005b-without-hole-*`, `r005b-rest-hole` (Task 7) |
| L16 | §8's `Both` example is accepted, unannotated D4 | annotation.mjs; fixtures `design-both-annotated`, `design-both-plain`, `diag-07`, `diag-07-fix` | backed (labels) | `r005b-both-annotation` (Task 5, texts Task 6, run Task 8) |
| L17 | A nested equation is deferred once, at the outer site (§2.6) | rules §9 "Nested equations" | argument, not yet checked: the prototype has no field types; an implementation obligation, not established compiler behaviour: its tests must land with Task 5 | `r005b-nested-field`, `r005b-pending-dedup` (Task 5) |
| L18 | The joint fixpoint ends and is order independent (§6) | rules §12 "joint fixpoint" | argument, not yet checked: the prototype has no effect rows; an implementation obligation, not established compiler behaviour: its tests must land with Task 5 | `r005b-end-fixpoint` both directions (Task 5) |
| L19 | The store reverts with a postponed effect pair (§1.3, §6) | rules §12 "Rollback" (it lives in `Subst`) | argument, not yet checked: no effect rows in the prototype; an implementation obligation, not established compiler behaviour: its test must land with Task 5 | `r005b-settle-rollback` (Task 5) |
| L20 | P1-P7's "before" texts (§1.6) | fixtures `precedence-p1` … `-p7` and the three controls hold `before`; all ten matched today's build exactly (text, span, notes; output/ built after 746ffa7's last src change, scratch probe, 2026-10-17) | backed; compiler check done (Task 3): test/r005b-precedence.test.mjs with R005B_EXPECT=before passed all ten against main 816140a in an isolated copy, and all seven P1-P7 failed there with the after texts (.build/evidence/r005b-t3-red.log) | asserted against main in an isolated copy, red log (Task 3) |
| L21 | No existing test expectation moves with the precedence (§1.6) | design §1.6's grep | backed (Task 3): the whole suite ran on the implementation before any expectation changed; no precedence-related expectation moved. Edited on purpose: Task 2's two `disjoint` placeholder tests (r005b-surface; the placeholder is removed), test/specialize's projection (constructors gained `joined`), three tests' import of `Flex` (split) | Task 3 runs the whole suite before changing any expectation |
| L22 | After specialization every row is ground (§9) | rules §12 (unsolved tails read as `{}`, rigids replaced by key rows) | argument, not yet checked: no specializer in the prototype; an implementation obligation, not established compiler behaviour: its check must land with Task 8 | Specialize asserts it (E_INTERNAL on a tail left); Task 8 generator |
| L23 | `x # x` forces `{}`; a rigid twice is D3' (§3.1) | rules §10; exhaustive: self-apart fired in 7.7M runs of A with E; fixture `diag-18-wrong` | backed; compiler check (Task 3): test/r005b-disjoint.test.mjs (`fn(p) => g(p, p)` accepts the empty record and refuses `{ x: 1 }`, accepted without the clause; `g(p, p)` over a rigid is D3') and row `r005b-self-apart` | `r005b-self-apart` (Task 3); exhaustive domain (Task 4); exhaustive domain (Task 4): domains A and B whole through the compiler, 0 failures |
| L24 | The diagnostics examples' classes (diagnostics Appendix A) | fixtures: all 19 examples, their fixes and variants, every class as stated; diag.mjs | backed | complete-source fixtures (Task 7) |
| L25 | Appendix B's six refusal kinds differ from the approved texts | diag.mjs output (diagnostics Appendix A) | backed (as a fact about the prototype) | fixtures `diag-03`, `-05`, `-13`, `-15`, `-17`, `-19`, `lone-meta-lack` assert the approved texts (Tasks 3, 7) |
| L26 | Example 14's text is order independent under R10.1 | class: fixture `diag-14` refused in all 24 orders of its rows; text: R10.1 | class backed; text argument, not yet checked: needs the renderer | `diag-14` in both fact orders (Task 7) |
| L27 | `expand` removes the raw-generator D4s with a least solution (§2.2) | perm.mjs `EXPAND=1`, recorded campaign | backed | none (not adopted) |
| L28 | Programs calling `merge` with known arguments never wait (§2.7) | rules §6; fixtures `design-composition`, `design-partial`, `diag-15-fix` never defer in any order (solver stage 4) | argument with instances; the general claim is not yet checked: it is about all programs | Task 9 census: no pending equation in that shape |
| L29 | Every rewrite preserves solutions (property E; rules §0). Bounded evidence for solution preservation, exhaustive over the stated domains; not a proof of every rewrite in general | exhaustive: E on 930,580 (A) and 203,804 (B) states, 0 failures; campaign: E on 111,800 and 325,090 states, 0 failures; sensitivity runs | backed | —; compiler-backed check (Task 4): property E with an independent read-back of the exported bindings (test/row-merge-readback.mjs, never the compiler's flattener) on every Solved run: 796,409 (A) and 177,028 (B) states, 0 failures; its sensitivity check (nested bindings skipped) is caught (17,904 states in A) and asserted in test/row-merge.test.mjs |
| L30 | The empty default selects a solution that satisfies every constraint and is least, whenever no pending equation has a constant (rules §12) | the monotonicity argument; exhaustive D, S, L 0 failures | backed | compiler oracle test S and L (Task 4); compiler check (Task 4), for Solved states (no equation waits): S and L 0 failures; the default with waiting equations is Task 5's |
| L31 | Homes are complete: no meta a solution could use is excluded (rules §8) | the argument per exclusion; H 0 failures. H (honest refusal) alone can miss losing one valid alternative while another is retained; "no valid home excluded" is backed only by property E (an excluded valid home would change the solution set) or a direct exclusion check | argument; backed by E where E runs; the direct exclusion check is not yet written | compiler oracle test H and property E (Task 4), plus a direct check that every home excluded has no solution using it (Task 4); compiler check (Task 4): property E (above) and a direct exclusion check, every home excluded before an equation has no state solution using it (test/row-merge-homes.mjs; 201 checked, 0 wrong, 20 past the cap, in verify) |
| L32 | Re-examining only equations that name a changed meta (`naming`) is sound but not lossless: the sum rule's apart derivation reads facts of unnamed partners (rules §14) | the argument; C2 0 differences in the exhaustive domains and campaign | soundness backed; losslessness argument, not yet checked (no counterexample found; none constructed) | Task 5 requirement (user, 2026-10-17): a dependency-complete wake-up rule. Index every fact the equation's rules read, including relevant partners, or conservatively rescan pending equations. Recording missed wake-ups as a measured heuristic is not acceptable under the order-independence requirement. Compare the indexed implementation against a reference that rescans everything to a fixpoint |
| L33 | The occurs check never fires on row tails after cancellation, only on field types (rules §7) | the argument (cancellation, fresh metas in commits and remainders) | backed since Task 4 by the compiler's guard (below); the prototype does not count occurs refusals apart from other mismatches | Task 4: an E_INTERNAL guard or a counter in the oracle test; compiler check done (Task 4): an E_INTERNAL guard in the bind rule (`Unexpected`, `A record tail occurs in its own binding`), a `Stop Internal` since the review fix (7f94d1a), on which the oracle runner fails: no run of either whole domain or the generators stopped |
| L34 | The pinned D4 text of `determinate` names the second merge's r and s (plan, "Pinned compiler programs") | the parts are det's q and u, to which merge's r and s were bound; R1.1 names them only if an owner's variable is named at its current bare-meta image, as Example 19's approved `{ x: 1 }` prose already does | approved by the user (2026-10-17) with this interpretation: follow bare-meta aliases when matching a part to the equation owner's variables, so the second `merge` can name its parts `r` and `s` even when their representatives originated as `det`'s `q` and `u`; naming must be independent of which direction the unifier chose for an alias; preserve part identity and tracked remainder ancestry; never assign an owner's name to arbitrary components of a structured binding | `determinate` fixture (Task 7) |

The user's Task 0 review (2026-10-17) is recorded in Decisions 8-13;
L29, L31, L32 and L34 above carry its wording.

**Ruling recorded with Task 2 (the user, 2026-10-17): one passed lacks
fact per tail.** If a declaration requires its row argument to lack `x`,
every component of `{ ...r, ...s }` must lack `x`: `Implied` makes one
fact per tail, and Task 2 resolves a record's labels against each of its
tails the same way. This does **not** establish that `r` and `s` are
disjoint; that is a separate obligation (`Disjoint`, option A or a
written clause). Task 3 must test both distinctions, including
propagation through a declared-type wrapper (Decision 14, Task 3's
tests).

Status count: 34 claims. Backed: 25 (L1-L4, L6-L16, L20, L21,
L23-L25, L27, L29-L31, L33; L21 since Task 3, L1's compiler part and L33
since Task 4). Split, each part named: 3 (L26, L28, L32: the class,
instance or soundness part backed; the text, general or losslessness
part argument, not yet checked). Argument, not yet checked, with the
reason in its row: 4 (L17, L18, L19, L22). A proof accepted as
argument: 1 (L5). L34 approved with its interpretation. No claim is
unbacked. Task 4 added compiler checks to L2-L4, L10-L12, L23 and
L29-L31 (their rows).

## Review findings and their checks

| Finding | Closed by | Task |
|---|---|---|
| F1 removal keeps a held label | `r005b-without-hole-left`, `-right`, `r005b-rest-hole` | 7 |
| F2 determinate bodies refused | `design-forced-bound` rows (solver, Task 5); `r005b-upper` (Task 7); Task 9 shared-parameter generator | 5, 7, 9 |
| F3 property C untestable | oracle properties C1, C2, C3 in test/row-merge.test.mjs | 4, 5 |
| F4 drain with field types | `r005b-nested-field`, `r005b-pending-dedup` | 5 |
| F5 exponential pieces | `r005b-quiet` (timing) | 5 |
| F6 drain failures read as nonsense | `r005b-drain-text`, `r005b-drained-reason` | 6 |
| F7 end of body with postponed pairs | `r005b-end-fixpoint`, `r005b-settle-rollback` | 5 |
| F8 implied versus written clause | `r005b-precedence` and the P1-P7 fixtures (closed in Task 3: both landed, the row proved) | 3 |
| F9 signatures no call can use | D8 test; `r005b-both-annotation` (D7 withdrawn) | 2, 5 |
| F10 termination measure | step-counter assertion (L3) | 4 |
| F11 D2' late location | fixture `d2-late` (rule 1 wins) | 7 |
| F12 NP claim | ledger L5, L6 (argument plus switch.mjs) | 0 |
| F13 smaller points | creation-site harness in test/row-merge.test.mjs; `arrivedAt` fixture `d2-call` | 3, 4 |
| User review: D4's meaning | fixtures `odd-cycle`, `determinate` with asserted counts (research, Task 0; compiler oracle test, Task 5); their texts and `r005b-three-way` (Task 7) | 0, 5, 7 |
| User review: R10.1 limit | `r005b-participation` | 6 |
| User review: R10.2 | `r005b-pruned-reason` | 4, 6 |
| User review: R10.3 | `r005b-bound-reason`; fixtures `diag-19`, `diag-19-x` | 7 |
| User review: R3 identity | `r005b-part-identity` | 6 |
| User review: R5 | `r005b-owner-written` | 7 |
| User correction 2026-10-17: assert the Unresolved buckets | fixtures.mjs asserts `odd-cycle` 0, `determinate` 1, `diag-01` 4 and the coverage of all three; each assertion shown failing with a wrong expectation (Task 0) | 0 |
| User correction 2026-10-17: task dependencies | the `stages` field of every fixture, checked by fixtures.mjs (shape) and by Task 10's "no fixture skipped"; the per-task test lists below | 0, 10 |
| User correction 2026-10-17: rewriting versus defaulting | rules file Parts I-II; property E in exhaustive.mjs and perm.mjs `STATE=1` | 0 |

## Executable example fixtures

**Where.** test/fixtures/r005b/, one JSON file per example (data
fixtures, exempt from the line and width rules; they hold no code), 72
written in Task 0: `diag-01` … `diag-19` (diagnostics Examples 1-19)
with `diag-NN-fix` for each resolving edit (Example 11 has none: it is
accepted) and the variants `diag-18-wrong` (its tempting wrong edit,
D3') and `diag-19-x` (Example 19 with `{ x: 1 }`); `design-*` (draft
3's §1.5 composition, partial application and its overlap; §2.4 defer
in the other order, forced by a fact, forced by a bound, two holes
against one, with §2.4's other two cases being `diag-11` and
`diag-01`; §3.3 both cases; §4 with and without its clauses; §5.2 left,
right, the other field, and access while waiting; §7 holes on both
sides and the quiet case; §8 annotated and plain); `precedence-p1` …
`-p7` and `precedence-control-no-clause`, `-two-clauses`,
`-hole-base` (§1.6); `odd-cycle`, `determinate`; `lone-meta-lack` and
`lone-meta-lack-two` (Appendix B). Later: `same-name-parts`,
`participation-control`, `d2-call`, `d2-late` and the `render-*`
fixtures (Tasks 3, 6, 7), and `found-*` (Task 9). Texts marked
"derived" in a fixture's `remark` (`design-forced-fact`,
`design-holes`, and the notes of `odd-cycle` and `determinate`) apply
R1-R11 to a program the diagnostics file does not show; the user
approved them (2026-10-17), including `{ a: Int, ..._ } is required
here` on `determinate`.

**Format.**

```json
{
  "name": "diag-13",
  "from": "diagnostics Example 13",
  "source": "fn merge(…) … fn main(): Int = apply1(merge, { z: 1 });\n",
  "result": "Contradiction",
  "diagnostic": {
    "id": "D6", "code": "E_TYPE",
    "message": "merge's { ...r, ...s } must be { x: Int, y: Int }, …",
    "at": {"text":"{ z: 1 }","nth":0},
    "notes": [{"message":"required here","at":{"text":"merge","nth":1}}]
  },
  "before": null,
  "output": null,
  "stages": {"solver":5,"check":7,"text":7,"run":null},
  "rows": {
    "hyp": {"lacks":{},"apart":[]},
    "steps": [{"k":"dis","l":…,"r":…}, …],
    "orders": "all"
  }
}
```

Strings elided with `…` above are written in full in a fixture, on one
line. `result` is `Solved`, `Contradiction` or `Unresolved`; `output` is
the expected stdout of a `Solved` program; `before` holds Tranche A's
diagnostic where a fixture records a change or pins an unchanged control
(P1-P7 and the controls); locations are `{ text, nth }` as test/
support.mjs `spanAt` takes them. `rows` is the labels-only projection
(research encoding) and `orders` is `all` (every order, up to seven
steps), `given`, or a number (the given order, its reverse and seeded
shuffles). `solutions`, present only on `odd-cycle` (0), `determinate`
(1) and `diag-01` (4), is an asserted count. `stages` replaces draft 1's
single `task` ("Test stages", below). `remark` explains a derivation.

**Runners.**
- research/open-row-merge/fixtures.mjs (Task 0) checks every fixture's
  shape (fields, `stages` consistent with `diagnostic`, `output` and
  `rows`, every location present in the source) and its `rows` against
  oracle.mjs and the prototype in the orders named: `Solved` → solutions
  exist, the prototype accepts in every order, and its default solution
  satisfies every constraint and is the least; `Contradiction` → zero
  solutions and the prototype refuses in every order; `Unresolved` → the
  prototype ends in D4 in every order, with no claim about the count
  except the asserted `solutions` of the three bucket fixtures, and the
  runner fails if the fixtures with asserted counts stop covering zero,
  one and several. Exit 1 on any failure. Run before the gate:
  72 fixtures, 0 failing (2026-10-17).
- test/row-merge.test.mjs (Task 4 onward) runs each fixture's `rows`
  through the compiler's exported unification entry from its
  `stages.solver`, asserting the class (and, from Task 5, the asserted
  counts).
- test/r005b-fixtures.test.mjs (Task 3 onward) compiles each fixture's
  `source` from its `stages.check`: class and code; from `stages.text`
  the exact message, primary span and notes (between `check` and `text`
  the placeholder's E_INTERNAL message of the table above); from
  `stages.run`, `output` through Go. A fixture before its stage is
  skipped by that field only, never by failure, and Task 10 asserts that
  no fixture is skipped.

## Test stages

Three kinds of test, by what the compiler can do at each task (the
user's correction of 2026-10-17). The plan keeps the task order rather
than moving the merge literal earlier: the user's decisions name Task 7
for several spreads and Task 2 for the type surface; the literal's late
overlap (D2' found late) needs Task 5's pending equations; and moving it
would renumber every cross-reference. The cost is that most published
examples first compile in Task 7, so Tasks 3-6 test their rules on
constructed problems and on sources without a literal of two or more
spreads.

- **Solver and renderer tests** (from the task that implements the
  rule). Constructed constraint problems through the exported
  unification entry: the fixtures' `rows`, the generators, the
  exhaustive domain. Check-phase sources with no multi-spread literal:
  multi-tail types appear in signatures whose bodies return a parameter
  (`fn pick(w: { ...r, ...s }): { ...r, ...s } = w;`) or a number, in
  constructors (`Both`), or in single-tail functions with `disjoint`
  clauses (`fn g(a: { ...r }, b: { ...s }): Int where r disjoint s =
  0;`). Such sources are new test inputs, not altered published
  examples.
- **Complete-source checking** (Task 7 for every source that defines
  `merge` or `merge3` or has a lambda with two spreads; earlier for the
  others, as each fixture's `stages.check` says): class, code, message,
  span and notes of the published example.
- **Execution** (Task 8 for every program with a row of several tails;
  with `check` for single-tail programs).

**Activation** (each fixture's `stages`; `-` is none):

| Fixtures | solver | check | text | run |
|---|---|---|---|---|
| `precedence-p1` … `-p7`, `precedence-control-no-clause`, `-two-clauses`, `-hole-base`, `lone-meta-lack`, `lone-meta-lack-two` | 4 | 3 | 3 | - |
| `diag-06-fix` (one tail; compiles and prints 0 today) | 4 | 3 | - | 3 |
| `diag-06`, `diag-07`, `design-both-plain` (no spread literal; D4 placeholder until Task 6) | 5 | 5 | 6 | - |
| `diag-07-fix`, `design-both-annotated` | 5 | 5 | - | 8 |
| `design-generic-three-d3`, `design-mixed`, `design-partial-overlap`, `diag-15`, `diag-16`, `diag-18-wrong` | 4 | 7 | 7 | - |
| `design-composition`, `design-mixed-fixed`, `design-partial`, `design-two-holes`, `diag-15-fix`, `diag-16-fix` | 4 | 7 | - | 8 |
| `design-forced-fact`, `design-holes`, `design-removal-left`, `-right`, `-wait`, `odd-cycle`, `determinate`, `diag-01` … `-05`, `diag-08` … `-10`, `diag-12` … `-14`, `diag-17`, `diag-18`, `diag-19`, `diag-19-x` | 5 | 7 | 7 | - |
| `design-defer`, `design-forced-bound`, `design-generic-three`, `design-quiet`, `design-removal-rest-field`, `diag-11`, and every other `diag-NN-fix` | 5 | 7 | - | 8 |

`solver` 4 means the rows never defer in any order checked (Task 4's
entry handles them); 5 means some order defers (Task 4 counts them as
skipped, Task 5 decides them).

## Pinned compiler programs from the user's review

The two counterexamples as Waxwing programs, now fixtures `odd-cycle`
and `determinate` (Task 0): their labels-only projections (the
instantiation of every use, with the facts det's signature implies) end
in D4 in all 24 orders checked, with 0 and 1 solutions, both counts
asserted. The user approved both texts as derived here (2026-10-17),
including the annotation hint for both; for `odd-cycle` the hint's
annotation may expose the contradiction rather than repair the program.

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn three(f: (a, b) -> { x: Int }, g: (b, c) -> { x: Int },
    h: (a, c) -> { x: Int }): Int = 0;
fn main(): Int = three(merge, merge, merge);
```

Fixture `odd-cycle`: `Unresolved`, D4 `Cannot tell whether merge's r or
s has field x; pass a lambda with annotated parameters in place of
merge` at the first `merge` (R11, earliest site), with R8's notes. The
hint's annotation would expose the contradiction, not make the program
valid (diagnostics §0).

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn det(f: ({ ...p }, { ...q }) -> { ...t, ...u },
    g: ({ ...q }, { ...u }) -> { a: Int, ...t }): Int = 0;
fn main(): Int = det(merge, merge);
```

Fixture `determinate`: `Unresolved`, D4 `Cannot tell whether merge's r
or s has field a; …` at the second `merge` (the waiting equation; the
quiet one is never D4). The one solution is `q = {}`, `u = { a }`, `t =
{}`, `p = { a }`. Task 0 checked both against R1-R11. The messages and
primary locations hold as approved. Notes, derived by R8: `r and s are
written here` at merge's result type for both; `{ x: Int } is required
here` at three's first parameter type, and `{ a: Int, ..._ } is required
here` at det's `{ a: Int, ...t }` (det's `t` is not the owner's
variable, so it prints `..._`, R1.3 and R5). One point for the user
(ledger L34): in `determinate` the waiting equation's homes are det's
`q` and `u`, to which the second merge's `r` and `s` were bound (step 6
binds the newer meta to the older), so the text names them `merge's r
or s` only if R1.1 names an owner's variable at its current bare-meta
image, the reading Example 19's approved `{ x: 1 }` prose already
needs. Task 6 states that reading in R1's implementation.

---

### Task 0: Pre-implementation gate (arguments, ledger, fixtures)

Docs, research scripts and fixture data only; no src change, nothing in
verify. Approved alone by the user (2026-10-17); done on branch
r005b-task0; accepted by the user (2026-10-17).

**Files:**
- docs/plans/2026-10-17-open-row-merge-rules.md (new): one section per
  solving rule, in three parts: rewrites (flatten; common labels; cancel
  tails; residue failure; the sum rule with U2-U4; one meta alone; the
  bind rule; homes, commit and the shared remainder; defer, quiet, the
  drain, deduplication and nested equations; decomposition with `x #
  x`; removal's fresh remainder), each argued to preserve solutions
  with fresh metas accounted for, its rejections to establish
  impossibility; defaulting (the end-of-body empty default: the selected
  solution satisfies every constraint and is least; the joint fixpoint
  and rollback); termination and the labelled heuristics.
- this plan's ledger, completed (34 claims).
- test/fixtures/r005b/*.json: 72 fixtures (list above).
- research/open-row-merge/: fixtures.mjs (runner), exhaustive.mjs and
  exhaustive-run.mjs (domains A and B), state.mjs (a state read back as
  a constraint system, property E), perm.mjs `STATE=1`, rule counters
  in the solver (no behaviour change: every recorded output identical),
  README entries.

- [x] Write the rule arguments, rewrites and defaulting apart; label
  heuristics. One argument needed changing: the `naming` index is sound
  but not lossless (rules §14, ledger L32). The termination bound as
  first written counted an apart pair once; domain A reached it exactly,
  and the corrected bound counts both touches (rules §13).
- [x] Write the fixtures; run fixtures.mjs: 72 fixtures, 0 failing. The
  runner caught one wrong projection while they were written (a
  control's implied lack omitted). The `before` of P1-P7 and the three
  controls matched today's build exactly (scratch probe, ledger L20).
- [x] Assert the counterexample buckets: `odd-cycle` 0, `determinate` 1,
  `diag-01` 4, and their coverage. Shown failing (exit 1) with each
  count wrong (1, 0, 3) and with each asserted count removed, on copies
  of the fixtures; unresolved.mjs likewise exits 1 with its zero case
  expecting 1; restored, 0 failing.
- [x] Run exhaustive.mjs: domain A 3,339,712 problems, 19,305,292 runs,
  53 s; domain B 79,825 problems, 453,550 runs, 4 s; S, H, L, E, D, C1,
  C2, C3, the measure and fresh-meta bounds hold on every run
  (`defects: none`). Three restored defects, each in a deleted copy,
  are caught (rules §0, "Sensitivity").
- [x] Random campaign with E: perm.mjs `STATE=1`, seeds 21-28 × 12,000,
  raw and dense: 0 failures; verdict counts identical to the recorded
  campaign.
- [x] Complete the ledger: no unbacked claim; six rows argument only,
  four split, each with its reason; L34 a question for the user.
- [x] Width check; commit. **Gate: the user reviews the arguments, the
  ledger (rows left as argument), the fixtures' texts (those marked
  derived, and L34), and authorizes Task 1.** Done: the user accepted
  Task 0 and authorized Task 1 (2026-10-17), Decisions 8-13.

Size estimate: about 250k tokens, one long session (a planning
estimate, not an approved budget).

### Task 1: Representation (`tails ∷ Array v`)

**Files:** Domain/Type/Record.purs (`RecordRow`, `recordRow`,
`mapFields`, `withoutLabels`), Domain/Type/Core.purs (236: extract the
record substitution to Domain.Type.RecordSubst first), Domain/Type/
Parts.purs (217), Compare.purs, Domain/Problem.purs (`tail ∷ Maybe
String` becomes `tails ∷ Array String`), every module naming `TRecord`
(44 at 97ba05b: `grep -rln TRecord src`), Check/FlatRecord.purs (follow
every bound tail, worklist), Specialize/Record.purs, Format.Go record
helpers, scripts/differential-project.mjs (hash `tails` of length ≤1 as
the old `tail`).

**Interfaces:**
- `type RecordRow a v = { fields ∷ Array (Tuple String a), tails ∷
  Array v }`, `tails` sorted by `v`'s order, repeats kept.
- `FlatRecord.flatten ∷ Subst → RecordRow (Ty Flex) Flex → Flat`, `Flat
  = { fields, tails ∷ Array Flex }` (rigid or unbound meta, sorted).
- Every producer still makes at most one tail; a consumer that meets two
  is either total (printing, walking, comparing) or reaches Task 2's
  placeholder (unifying, specializing).

- [x] Failing tests test/r005b-row.test.mjs (Domain level through
  output/): `recordRow` sorts tails and keeps repeats; flatten follows
  two bound tails and a chain of 10,000 without stack growth;
  `withoutLabels` and printing over `tails` of length 0 and 1 equal
  today's. Seen failing against main's build (9 of 9,
  .build/evidence/r005b-t1-red.log), then passing.
- [x] Implement (splits first); verify; differential `--corpus all`:
  **0 differences** in every phase; commit. Done on branch
  r005b-task1: Domain.Type.RecordSubst split out of Core first; verify
  2132 + 59 tests, 142 proofs, exit 0; differential 0 of 12,608 cases
  (docs/progress.md "R005 Tranche B Task 1"). Two regression rows named
  record-row text in their needles and were updated, meaning kept.
  Reviewed; the user authorized Task 2 only (2026-10-17).

Size: about 250k tokens (wide, mechanical), 3-4 h. Sonnet; Opus reviews
the differential.

### Task 2: Surface (several tails, `where r disjoint s`, D8, D9)

**Files:** Format/Parse/RecordType.purs (several `...` tails; the record
`Only one row tail is allowed` retires), Format/Parse/Constraint.purs
(`r disjoint s`), Domain/Syntax and Domain/Resolved (`Requirement =
Lacks … | Disjoint { variables ∷ Tuple Label Label, span }`),
Features/Resolve/Requirements.purs, Resolve.purs (235: extract first)
for D8 on written rows and through declared types, Resolve/Lacking.purs
(205: extract the pair logic to Resolve/Apart.purs first; a body type
writing two tails over the signature's variables needs the fact, else
D3 at the later `...s`), Resolve/ArgumentClash.purs (pairs), Problem and
Format/Diagnostic (extract Format.Diagnostic.Records first) for D3, D8,
D9; placeholders (table).

**Interfaces:** `Resolved.FunctionDecl.constraints ∷ Array Requirement`
with `Disjoint`; Problem `RepeatedTail`, `SameDisjoint`,
`NotKnownDisjoint` (D3, hinted via `Hinted`).

- [x] Failing tests test/r005b-parse.test.mjs and r005b-resolve.test.mjs:
  two and three tails in parameter, result, nested, declared-type and
  lambda-annotation positions; `where r disjoint s` alone and beside
  `lacks`; D8 written and through `Pair(...a, ...a)`; D9 at the second
  `r`; D3 with its hint for a body type under a signature without the
  fact, accepted with it and with an implying row (option A); a
  multi-tail signature reaching the Task 4 placeholder; effect rows
  still refuse a second tail.
- [x] Implement; verify; differential: differences only in parse and
  resolve for sources with several record tails or `disjoint`
  constraints (all refused before), each classified; commit. Done on
  branch r005b-task2: placeholder commit first (9df7e01), then the
  Diagnostic.Records split, the surface and two needle updates; verify
  2191 + 59 tests, 142 proofs, exit 0 on 0a8f73c; differential 67
  differences, all parse phase (45 several tails, 22 `disjoint`), none
  other (docs/progress.md "R005 Tranche B Task 2"). Also added:
  test/r005b-surface.test.mjs and r005b-placeholder.test.mjs; D3 for
  body types and `Duplicate field` between joined record arguments are
  in Resolve.Apart; no fixture is activated (the table assigns none to
  Task 2). Awaiting the user's review; Task 3 is not authorized.

Size: about 150k tokens, 2-3 h. Sonnet.

### Task 3: The store, single-tail; precedence; D2, D3, D3', D3''

**Files:** split Check/Subst.purs (233) into Subst plus
Features.Check.RowStore (new; `lacks`, `written` move here and become
`because`) and Features.Check.PartOrigin (new, empty in this task) in a
first behaviour-preserving commit; then Check/Lacks.purs, RecordTail.purs
(`bindTail` becomes the bind rule of design §3.2), a new
Check/Disjoint.purs (decomposition, §3.1), Seed.purs, Use.purs (231:
extract `requiredUse` to Check/UseFacts.purs first), Implied.purs
(`declared` with pairs; implied disjointness of signature rows, user
decision 2), Check/Function.purs (body hypotheses), Lacked.purs and
Require/Reject (D2, D3, D3', D3'' texts and notes), Problem,
Format/Diagnostic/Records. Placeholder for `Disjoint` removed.

**Interfaces:**

```
data Because
  = Lacks { variable ∷ String, span ∷ Span }
  | Disjoint { variables ∷ Tuple String String, span ∷ Span }
  | Implied { span ∷ Span }
  | Spread { earlier ∷ Span, later ∷ Span }
  | Equated Equation            -- produced from Task 4
type Equation =
  { id ∷ PendingId, left ∷ Row, right ∷ Row, site ∷ Span, owner ∷ Owner }
type Narrowing = { allowed ∷ Set Atom, why ∷ Equation }
type Bound = { atoms ∷ Set Atom, narrowings ∷ Array Narrowing }
newtype RowStore = RowStore
  { lacks ∷ Map Flex (Map String Because)
  , apart ∷ Map Flex (Map Flex Because)
  , upper ∷ Map Flex Bound
  , pending ∷ Map PendingId Pending      -- empty until Task 5
  , naming ∷ Map Flex (Set PendingId)
  , arrivedAt ∷ Map Int Span
  , boundBy ∷ Map Int Equation           -- commits and drain only
  , emptied ∷ Map Int Because            -- U4: the pruning fact
  }
prefer ∷ Because → Because → Because     -- design §1.3 precedence
requireDisjoint ∷ Because → Flat → Flat → Subst → Either Contradiction Subst
```

`prefer` is total and depends only on the two reasons (kind, then
source position, `Equated` last by earliest site), so arrival order
never matters; a property test checks commutativity and associativity.

- [x] Failing tests test/r005b-precedence.test.mjs: P1-P7 of design §1.6
  each asserting the "after" text, span and notes, and its fixture's
  `before` asserted against main in an isolated copy (the red log
  records all seven failing on main with exactly the `before` texts);
  the three controls (no clause: shape text before and after; two
  clauses: the first's note; a hole base's literal lack: shape text).
  These are fixtures (`stages.check` 3), so test/r005b-fixtures.test.mjs
  lands here and runs them, with `lone-meta-lack`, `-two` and
  `diag-06-fix`.
- [x] Failing tests test/r005b-disjoint.test.mjs (solver and renderer
  tests: single-tail rows, no spread literal): `g(a: { ...r }, b: {
  ...s }): Int where r disjoint s` as `g(p, p)` over `{ ...t }` is D3';
  over `{ x: Int }` twice D2 with `first written here` at `arrivedAt`;
  a wrapper without the fact D3 with hint inside it, noted at g's
  clause; a wrapper with the fact refused at its caller, noted at the
  wrapper's clause; a decomposed lack keeps `Disjoint` (D2, not D1)
  unless a written `lacks` names the label (D1); `fn(p) => g(p, p)`
  applied to `{}` is accepted (the meta pair `?r # ?r` forces `{}`;
  self-apart) and `g(p, p)` over `{ ...r }` is D3' (rigid twice);
  `fn tagged(p: { id: Int, ...r }, q: { ...s }): Int = g(p, q)` is D3''
  `s may already have field id` without `s lacks { id }`, and D3 `r and
  s are not known to be disjoint` with it but without `r disjoint s`;
  the property test of `prefer`. The ruling of 2026-10-17 (ledger,
  "one passed lacks fact per tail"), both distinctions: (a) a declared
  type whose record parameter lacks `x` (`type Holder(...r) = Holder({ x:
  Int, ...r })`), given `{ ...r, ...s }` or a wrapper `type W(...a, ...b)
  = W(Holder({ ...a, ...b }))`, requires both `r` and `s` to lack `x`
  (each missing fact is D3'' for its own tail; a signature stating both
  `r lacks { x }` and `s lacks { x }` is accepted); (b) the same
  signature without `r disjoint s` (and no row joining them) is refused
  where the pair is required, and stating the lacks facts never supplies
  the disjointness, nor the reverse; both through a declared-type wrapper
  at its caller. The `merge(p, p)` form is complete-source and joins Task
  7.
- [x] Implement; verify; differential: differences only P1-P7's class
  (shape text → D1) and sources using `disjoint`, each classified; L21
  checked (no existing expectation edited); commit. Done on branch
  r005b-task3 (2026-10-17): splits first (50b8312 RowStore, PartOrigin
  and Flex out of Subst; 67140bc UseFacts out of Use; their differential
  0 of 12,686), then 32c74fa (store, precedence, seeding, the bind rule,
  decomposition, D2, D3', the placeholder removed, tests, six rows),
  de290d4 (a differential projection) and ade35cd (row `r001-lacks`'s
  needle); verify 2243 + 59 tests, 148 proofs, exit 0 on ade35cd. Red log
  .build/evidence/r005b-t3-red.log: against main all seven P1-P7 fail
  and, with R005B_EXPECT=before, all ten `before` texts pass exactly;
  13 of 15 disjoint tests fail (the two passing are Resolve-phase
  controls Task 2 already gave). Differential 68 differences, every one
  classified (docs/progress.md "R005 Tranche B Task 3"). Also added: the
  user's clarification of Decision 14 (each tail lacks the label,
  disjointness given; every tail lacks it, disjointness not given), each
  through `W` in a body type and at a call, failing for its own reason.
  Representation notes: `Implied { span }` is split into `Joined` (an
  implied pair, with its variables and later tail) and `Implied` (an
  implied lack, no span); `Equated`, `upper`, `pending`, `naming`,
  `boundBy` and `emptied` arrive with their producers (Tasks 4-5);
  `requireDisjoint` is `requireApart` (an image against one partner, the
  only form single-tail rows need; the general form lands with Task 7's
  literal). The `d2-call` fixture (F13) is not written: the activation
  table assigns no new fixture to Task 3; D2's `arrivedAt` note is
  asserted in test/r005b-disjoint.test.mjs and -precedence instead.

Rows landing: `r005b-precedence`, `r005b-provenance`, `r005b-mixed-lacks`,
`r005b-mixed-tails`, `r005b-self-apart`, `r005b-body-type` (probes in
the `g` and `tagged` forms above; none needs a spread literal).
Landed in Task 3 (scripts/regression-r005b.mjs, probes in
test/regression-r005b.mjs), each proved failing with its defect
restored. As restored, `r005b-provenance`'s defect makes the decomposed
lack a plain one, so the wrapper's caller reads the shape text where D2
is due (the table's "D1's text" was a slip: no written lack is involved);
`r005b-precedence` also probes the pair's note (clause over implying
type); `r005b-body-type`'s restored defect is accepted (the lambda is not
applied, so no several-tail unification is reached).

Size: about 350k tokens, 5-6 h. Opus.

### Task 4: Multi-tail unification, forced moves only; the result type

**Files:** Check/UnifyRecord.purs (147) becomes the driver of design
§2.1 over new modules Check/RowResidue.purs (flatten, cancel, residue),
Check/SumRule.purs (bound, lack, apart; U2-U4 with `emptied`),
Check/Homes.purs (step 7) and Check/Commit.purs (commit, shared
remainder, `boundBy`); Features.Check.RowOutcome (new); Check/Record
`select` over several tails; Unify's exported test entry; placeholders
added (table) and Task 2's check placeholder removed. test/row-merge-
oracle.mjs (new, ported from research/open-row-merge/oracle.mjs, not
from the PureScript) and test/row-merge.test.mjs.

**Interfaces:**

```
data RowOutcome
  = Solved Subst
  | Contradiction Contradiction
  | Unresolved Subst (NonEmptyArray Pending)
type Contradiction = { failure ∷ Failure, because ∷ Maybe Because }
unifyRows ∷ … → Subst → Flat → Flat → Either Contradiction Subst
```

`Unresolved` is constructed only by the end of a body (Task 5); this
task's oracle entry maps a remaining placeholder to a skipped problem,
counted and printed, never to a verdict.

- [x] Failing tests test/row-merge.test.mjs (level 1): the raw, dense
  and program-shaped generators ported from perm.mjs and
  programs-gen.mjs with seeds, each problem in five orders; S (the
  emitted solution satisfies every constraint), H (`Contradiction` ⇒
  no solution), L, C2; the step counter within the measure (L3) and
  fresh metas within `|Π|·|Κ|` (L4); the exhaustive one-tail domain
  equal to ADR 013's rules (L1) and Task 0's domains A and B with
  property E where the entry exposes the state. **The compiler-backed
  property E test reads the state back independently** (user,
  2026-10-17): it interprets the exported bindings itself rather than
  calling the compiler's flattener, and includes a sensitivity check
  that corrupts binding traversal and must fail. Problems that reach the
  Task 5 placeholder are counted. The fixtures with `stages.solver` 4
  run their `rows` here (two holes against one, the composition, the
  overlaps, P1-P7's projections).
- [x] Failing tests test/r005b-unify.test.mjs (check-phase, no spread
  literal): `fn swap(p: { ...r, ...s }): { ...s, ...r } = p;` is
  accepted (common tails cancel, `r005b-cancel`); a `pick`-style
  two-tail parameter met by a one-tail row binds the lone meta (two
  holes against one); the lone meta pruned to `{}` by a written lack
  reports D1, not `Expected {}, found …` (R10.2, fixtures
  `lone-meta-lack`, `-two`, already enabled since Task 3). §2.4 "forced
  by a fact" and "forced by a bound" defer first in some order, so they
  are Task 5's (rows) and Task 7's (complete source).
- [x] Implement; verify; differential: **0 differences** on existing
  sources (the §2.3 differential); commit. Done on branch r005b-task4
  (2026-10-17), code commit e63f7f4 (docs/progress.md "R005 Tranche B
  Task 4"): the driver Check/UnifyRecord over Check/RowResidue,
  SumRule, Narrow (U1-U4, `emptied`), Homes, Commit (`boundBy`),
  RowSettle and Homeless; the bind rule (RecordTail) and decomposition
  (Disjoint) complete for any number of tails; Check/RowOutcome and the
  test entry Check/RowEntry (with `outcome` mapping a placeholder to a
  skipped run, never a verdict). Test files as planned, plus
  test/row-merge-domains.test.mjs (domains split out: the one-tail
  domains in full against an independent model of ADR 013's rules, L1;
  domain B whole; domain A one candidate in 50); the whole of domain A
  by scripts/row-merge-exhaustive.mjs outside verify (19,305,292 runs, 0
  defects). Differential: 0 differences among sources with neither
  several record tails nor `disjoint`; 14 Tranche-B transitions, each
  classified. Placeholders: see the table. Deviations, for review: the
  rules file's §11a (the forms in which the port differs, each argued),
  and Check/Lacked's placeholder added early (table). Review fix
  (2026-10-18, 7f94d1a): `outcome` returns `Either Stop RowOutcome`, each
  failure classified by name (rules §11b); a limit and an internal
  failure are stops, never contradictions, and the oracle runner fails
  on them (test/r005b-outcome.test.mjs).

Rows landing: `r005b-cancel`, `r005b-pruned-reason` (`r005b-upper`
and `r005b-apart-persist` probe merge programs and land in Task 7;
`r005b-mixed-tails` lands in Task 3 in the `tagged` form).

Size: about 400k tokens, 6-7 h. Opus.

### Task 5: Pending equations, quiet equations, drain, end of body

**Files:** Check/Pending.purs (new: identity, normal form, replacement,
deduplication keeping the older id and site, the `naming` index), Check/
Drain.purs (new: re-examine equations naming a changed meta until a
pass changes nothing), Check/UnifyRecord (defer, quiet), Unify (drain
after each top-level unification, design P8), Settle.purs (240: extract
the round's "changed" test to Check/SettleChange.purs first; a round
ends with a drain and counts as changed if the drain changed anything),
Failure.purs (210: extract `settleFinal`'s caller first; the
`Unresolved` report precedes `Fail needs a concrete error family`),
Check/Function.purs (the end-of-body sequence of design §6),
`RowPair` keeps its site for re-deferral at retry; placeholders (table).

**Interfaces** (revised before implementation at the user's direction,
2026-10-18: the outer `Stop` channel, `Limit | Internal | Unfinished`,
survives the drain and the end of a body, and no single unification is
a verdict):

```
type Pending =
  { equation ∷ Equation, residue ∷ Residue, quiet ∷ Boolean
  , reads ∷ Set Flex }          -- what its rules read (the wake-up index)
drain ∷ Subst → Either Failure Subst
endOfBody ∷ Subst → Either Stop RowOutcome
concluded ∷ Either Failure Subst → Either Stop RowOutcome
data RowOutcome
  = Solved Settled
  | Contradiction Contradiction
  | Unresolved Settled (NonEmptyArray Pending)
```

- `drain` runs inside unification, as `unify` does: a failure stays a
  `Failure` (wrapped `Drained Equation Failure`, so a renderer knows the
  drain found it) and is classified only at the boundary, never turned
  into a verdict there. A limit (`TooDeep`) or a broken invariant
  (`Unexpected`) met while re-examining an equation is still a `Stop`
  once classified.
- `endOfBody` is the only producer of `Solved` and `Unresolved`:
  `Settled` (a substitution the end of a body has classified) has no
  exported constructor, so a successful unification cannot be read as
  `Solved` (Task 4's `outcome`, which mapped `Right` to `Solved`, is
  replaced by `concluded`). It returns `Left (Internal …)` if an
  equation is still woken (the joint fixpoint did not drain), never a
  verdict.
- `concluded` classifies a whole run: a failure by rules §11b
  (`Contradiction` or a `Stop`), a success through `endOfBody`. The
  oracle runner fails on `Limit` and `Internal`; tests inject both
  through `drain` (`Drained`) and `endOfBody`.
- The plan's `seen ∷ Int` (a version per equation) becomes `reads`, the
  set of variables whose facts the equation's rules read (its residue's
  metas and rigids and their partners, ledger L32); a change to any of
  them wakes it. A reference that rescans every pending equation to a
  fixpoint is injected in its place by the test entry.

- [ ] Failing solver tests in test/row-merge.test.mjs: every fixture
  with `stages.solver` 5 runs its `rows` (`diag-11` and `design-defer`
  solved in either argument order, `design-forced-bound` and
  `design-forced-fact`, the D6 examples' contradictions, the D4
  examples unresolved); `odd-cycle`, `determinate` and `diag-01`
  `Unresolved` with their counts asserted (0, 1, 4), failing if a count
  changes; C1 and C3 with C3's recorded ceiling; a quiet chain of 12
  within a generous bound.
- [ ] Failing tests test/r005b-pending.test.mjs (check-phase, no spread
  literal): `split({ x: 1, y: 2 })` (`diag-06`) and the unannotated
  `Both` (`diag-07`, `design-both-plain`) end `Unresolved`, asserting
  the Task 6 placeholder (`r005b-pending-end` probes `split`); quiet
  equations accepted, `h(pick × 12)` with `fn pick(w: { ...r, ...s }):
  { ...r, ...s } = w;` and `fn h(f1: (c) -> d, …, f12: (c) -> d): Int`,
  within a generous bound (`r005b-quiet`).
- [ ] Failing tests test/r005b-both.test.mjs, **`r005b-both-annotation`**:
  `type Both(...r, ...s) = Both({ ...r, ...s }); fn example(): Both({
  x: Int }, { y: Int }) = Both({ x: 1, y: 2 });` is accepted (also with
  the expected result met first; fixtures `design-both-annotated`,
  `diag-07-fix`); it runs from Task 8. The unannotated form is
  `Unresolved` at the argument (D4 text from Task 6).
- [ ] Failing tests test/r005b-nested.test.mjs: §2.6's `{ a: { ...?p,
  ...?q }, ...?r, ...?s } ~ { a: { x: Int, y: Int }, z: Int }`, made by
  passing `fn nest(w: { a: { ...p, ...q }, ...r, ...s }): { a: { ...p,
  ...q }, ...r, ...s } = w;` where `(c) -> { a: { x: Int, y: Int }, z:
  Int }` is expected, defers the inner equation once, at the outer
  site, reported once (`r005b-pending-dedup`, `r005b-nested-field`),
  and is solved when a later argument fixes `?p`.
- [ ] Failing tests test/r005b-settle.test.mjs: **rollback**, an
  equation deferred inside a postponed effect pair's label arguments is
  gone after the revert and deferred again at the retry with the pair's
  site (`r005b-settle-rollback`); **joint fixpoint**, both directions: a
  body whose effect retry unblocks a record equation is accepted, and
  one whose drain binds a meta a postponed pair waits on settles that
  pair (`r005b-end-fixpoint`); a `Fail` payload `{ ...?r, ...?s }`
  whose key waits reports the unresolved equation, not `Fail needs a
  concrete error family`. Each built from `pick`-style functions and
  effect handlers, with no spread literal.
- Not here: `apply2(merge, …)`, `apply0(merge)`, `both(merge, merge)`
  and the counterexample programs as complete sources (Task 7); any
  executed result (Task 8).

- [ ] **Older lack-adding paths** (user, review of Task 4, 2026-10-18):
  once pending equations and bounds persist across equations, every
  path that adds a lack or a pair outside the row rules (Tranche A's
  `addLacks` callers: Extension, FreshRecord, Seed) must do the pruning
  (U2, U4) and wake-up work the row rules do. That a stale bound is
  only "less tight" does not establish order independence; a test must
  show it (in the dependency-complete comparison below).
- [ ] **Dependency-complete wake-up** (user requirement, 2026-10-17,
  ledger L32): the drain's index covers every fact an equation's rules
  read, including the facts of relevant partners (the sum rule's apart
  derivation), or conservatively rescans pending equations. Recording
  missed wake-ups as a measured heuristic is not acceptable under the
  order-independence requirement. Failing test in test/row-merge.test.mjs:
  the indexed implementation is compared with a reference that rescans
  every pending equation to a fixpoint, on the exhaustive domains and the
  random generators, in every order; any difference fails.

Rows landing: `r005b-quiet`, `r005b-pending-dedup`, `r005b-pending-end`,
`r005b-end-fixpoint`, `r005b-settle-rollback`, `r005b-nested-field`,
`r005b-both-annotation` (`r005b-defer` probes `apply2(merge, …)` and
lands in Task 7).
- [ ] Implement; verify; differential: 0 differences on existing
  sources; commit.

Size: about 400k tokens, 6-7 h. Opus.

### Task 6: Diagnostics (D4, D6, R1-R11) and metadata

**Files:** Check/PartOrigin.purs filled where rows are made (Use,
Lambda, Extension, Record `select`, Commit, FreshRecord): part identity
(`PartId`), creation span, lambda-parameter name, instantiated type
origin (the written type's span), owner variable; new
Check/Unresolved.purs (D4: R1-R4, R6-R9, R11) and Check/Contradicted.purs
(D6: R1-R3, R5-R8, R10), both taking only `RowOutcome` payloads;
TypeName.purs (215: extract row printing to Check/RowPrint.purs first;
§10.1 order, `..._n` numbering per diagnostic); Problem, Format/
Diagnostic/Records; placeholders for D4 and D6 removed.

**Rules to implement exactly** (diagnostics file): R3 deduplicates by
part identity, never by printed name, and numbers same-named distinct
parts with origin notes; R5 prints the owner's side as written (its
variable names and the relevant nested row), the other side through the
current substitution; R10.1 only bindings in `boundBy` (made by a
commit or the drain for that equation) report D6, never a binding that
merely took part in an equation; R10.2 a U4 binding reports its
`emptied` reason by the precedence; R10.3 the narrowing reasons are
kept and, at failure, the earliest-site narrowing whose `allowed` set
excludes the atom is named; R11 one diagnostic, the earliest site.
Metadata never feeds a solving decision (structural test: no module
under Check/ that solves imports PartOrigin).

- [ ] Failing renderer tests, test/r005b-fixtures.test.mjs: the exact
  texts of the fixtures with `stages.text` 6 (`diag-06`, `diag-07`,
  `design-both-plain`: the named-call and constructor owners); new
  `render-*` fixtures, one for each form of the diagnostics file's §2
  that a source without a multi-spread literal can produce (function
  reference, three parts, partial application, nested field, `holds t`;
  D6 with one part, `neither`, `none of`, nested), built from
  `pick`-style signatures (for example `fn pick2(p: { ...r }, q: {
  ...s }, w: { ...r, ...s }): { ...r, ...s } = w;`), with texts derived
  by R1-R11; and new fixtures `same-name-parts` (R3) and
  `participation-control` (R10.1's limit: an error whose responsible
  fact is not an equation keeps its own text although its meta took
  part in a solved equation), also without a multi-spread literal. All
  pinned in Task 6's first commit and checked by fixtures.mjs before
  code. The forms that need such a literal (lambda parameters, Example
  9; unnamed spread parts, Example 10) and every published `merge`
  example are checked from Task 7.
- [ ] Failing test: an annotation that exposes a contradiction turns D4
  into the contradiction's text, on a `pick2` program (the Example 1
  form with `q: { x: Int }`, D2, joins Task 7).
- [ ] Implement; verify; differential: 0 differences on existing
  sources; commit.

Rows landing: `r005b-participation`, `r005b-part-identity` (their
fixtures need no spread literal). `r005b-drain-text`, `r005b-three-way`,
`r005b-drained-reason`, `r005b-bound-reason` and `r005b-owner-written`
probe published merge examples and land in Task 7.

Size: about 450k tokens, 7-8 h. Opus.

### Task 7: The merge literal, access, removal and rest binders

**Files:** Resolve/Record.purs (the second spread is no longer refused;
`SecondSpread` removed from Problem, Format/Diagnostic and Code, as the
user approved on 2026-10-17), Check/Extension.purs (198: extract
the overlap check to Check/Overlap.purs first; items in written order,
each spread's row joins the result's tails, `Spread` reasons for item
pairs, D2' immediate and late), Check/Removal.purs (design §5.2: one
requirement against `{ l1: α1, …, ...ρ }`, type `ρ`, never subtraction),
Check/RecordPattern.purs (206: extract the rest binder first) and
PatternRow.purs (the same for `{ l, ...rest }`), Check/Record `select`;
the Task 2 multi-tail rest/removal placeholder (Check/SeveralTails)
removed. Specialize keeps its placeholder.

- [ ] Failing tests test/r005b-literal.test.mjs: `{ ...a, ...b }`,
  `{ ...a, x: v, ...b }`, three spreads, a spread of a merge result,
  types as design §1.4; D2' found immediately (at the later item) and
  late (`d2-late`, at the completing expression with both notes); a
  Tranche A literal with one spread unchanged; the former SecondSpread
  sources now accepted or D2' (each listed).
- [ ] Failing tests test/r005b-removal.test.mjs:
  `r005b-without-hole-left`, `-right`, `r005b-rest-hole` (F1);
  `.x` on the rest refused at once while the equation waits (`x is not
  a field of { ..._ }`); the rest is `{ y: Int }` with `x` in either
  part; no part holding `x` is D6 at the argument that showed it;
  one-tail removal and rest unchanged (Tranche A's tests untouched).
- [ ] Complete-source checking switches on: test/r005b-fixtures.test.mjs
  runs every fixture with `stages.check` 7 (the activation table: every
  published example that defines `merge` or `merge3`, Examples 9 and
  10, the §1.5, §2.4, §3.3, §4, §5.2 and §7 design fixtures,
  `odd-cycle`, `determinate`, `diag-14` in every order of its facts
  (L26), `diag-19` and `diag-19-x`, `diag-18-wrong`), class, code,
  message, span and notes exactly; and the forms Task 6 deferred
  (Example 1 annotated with `q: { x: Int }` is D2; `merge(p, p)` over
  `{ ...r }` is D3' and over a lambda's parameter forces `{}`). A
  renderer discrepancy found here is fixed in this task.
- [ ] Implement; verify; differential: differences only in sources with
  several spreads (refused before) and multi-tail removal or rest,
  classified; commit.

Rows landing: `r005b-without-hole-left`, `-right`, `r005b-rest-hole`,
and the rows whose probes are published merge programs: `r005b-upper`,
`r005b-apart-persist`, `r005b-defer`, `r005b-drain-text`,
`r005b-three-way`, `r005b-drained-reason`, `r005b-bound-reason`,
`r005b-owner-written`.

Size estimate: about 350k tokens, 5-6 h (it now also switches on the
complete-source fixtures); recorded as an estimate, not an approved
budget (the user, 2026-10-17).

### Task 8: Specialization and lowering; reference interpreter

**Files:** Specialize/Record.purs (canonical form: flatten under the key,
fields of all tails joined and sorted, unsolved tails empty; a label
twice stays E_INTERNAL `Duplicate record label`), Specialize/Layouts,
Domain/IR/Internal.purs (218: extend `RecordExtension` parts only if
needed; extract first), Format/Go/Extension.purs (115: items into typed
temporaries left to right inside the immediately invoked closure, a
literal or local used in place, each field read from the one item that
supplies it, an empty-layout spread still evaluated), Format/Go/
RecordLayouts.purs (layouts of every item), Nested.purs (growth through
`{ ...r, ...s }` in a recursive call is ADR 007's existing error);
test/fx-oracle-records.mjs and fx-oracle-parse.mjs (the reference
interpreter evaluates several spreads and `disjoint` clauses, sharing no
compiler code); test/fx-gen-record-extension.mjs gains several spreads.
Placeholder removed; `grep -rn "R005B placeholder" src` empty.

- [ ] Failing tests test/r005b-go.test.mjs (executed): `merge` at `r = {
  a }, s = { b }` and at `r = { a, b }, s = {}` (two copies, one result
  layout); `{ ...g(), x: f(), ...h() }` with Console effects prints g,
  f, h once each (`r005b-merge-order`); a field read from the right
  item when labels interleave (`r005b-merge-sources`); an empty spread
  still evaluated; ADT-valued fields through a merge; nested merges.
- [ ] Execution switches on: every fixture with `stages.run` 8 runs
  through Go with its `output` (the accepted published examples and
  resolving edits, `design-both-annotated`, `diag-07-fix`, the design
  fixtures that print); `diag-11` and `design-defer` print 1.
- [ ] Failing test test/fx-oracle-row-merge.test.mjs: generated merge
  programs (seeded) run in Go and in the interpreter agree, with a
  sensitivity check (interpreter evaluating spreads last mismatches).
- [ ] Implement; verify; differential: emit and compile byte-identical
  for every source the base compiles; commit.

Size: about 250k tokens, 4 h. Sonnet; Opus reviews lowering and rows.

### Task 9: Cross-boundary program generator and oracle level 2

**Files:** test/fx-gen-row-merge.mjs (new generator of Waxwing programs:
`merge`, `merge3`, wrappers with and without clauses, `let` references,
partial applications, lambdas with and without annotations, nested
record fields holding merges, `apply2`- and `both`-style higher-order
uses, removal and rest binders on merge results, effects in items and
handlers around calls), test/row-merge-reference.mjs (new, independent
of the compiler: from the generator's own model, the labels-only
constraints each program makes, solved by the oracle), test/row-merge-
shrink.mjs (delta debugging over the generator's model),
test/r005b-programs.test.mjs, and a test-only export of the final
`RowStore` summary from Features.Check for constraint comparison where
the program's model makes it extractable.

- [ ] Failing-first: the test against a deliberately broken checker
  copy (Task 4's `r005b-defer` defect) reports a mismatch and shrinks it
  to a fixture under 10 lines (sensitivity, recorded, copy deleted).
- [ ] The test: compiler class versus reference (`Solved` must be a
  solution and the least; `Contradiction` must have none; `Unresolved`
  no claim, counted by its number of solutions); accepted programs run
  in Go and the interpreter and agree; a census per shape with minimums;
  order variants (arguments checked in either order, expected type met
  first) give one class (C2).
- [ ] Shrunk failures, if any, are saved as `found-*` fixtures and fixed
  in this task or recorded in BACKLOG with evidence and a next action.
- [ ] Verify; commit.

Size: about 300k tokens, 4-5 h. Opus.

### Task 10: Rows, docs, ADR, examples, close-out

- [ ] Regression rows not yet landed (table below) in
  scripts/regression-r005b.mjs with probes in test/regression-r005b.mjs,
  each proved failing with its defect restored and compiling with 0
  warnings.
- [ ] examples/records.wxw gains `merge` and a merge literal;
  bootstrap/records.go regenerated; docs/language.md (several tails,
  `disjoint`, merge literals, the retired one-spread rule), ADR 013
  section "Open-row merge (R005 Tranche B)" (decisions, texts, the
  three-way result, the incompleteness and its fixtures, lowering).
- [ ] research/open-row-merge/README.md updated if any script changed;
  the design's ledger and statuses final; BACKLOG R005 done; progress;
  `grep -rn "R005B placeholder" src` empty; no fixture skipped.
- [ ] Full differential against the pre-Tranche-B main, classified;
  verify; commit; the user's merge decision.

Size: about 200k tokens, 3 h. Sonnet; Opus reviews the rows.

## Regression rows

Each restores one defect in a whole, compiling form and is proved
failing in an isolated copy. "Task" is where its probe lands.

| Row | Defect restored | Probe | Task |
|---|---|---|---|
| `r005b-precedence` | the first reason seeded wins | P1 prints the shape text; merge's D2 note at the result type, not the clause | 3 |
| `r005b-provenance` | a decomposed lack loses its `Because` | D1's text where D2's is due, through a wrapper | 3 |
| `r005b-mixed-lacks` | label/tail decomposition skipped | `tagged` (`g(p, q)`, `p: { id: Int, ...r }`, `q: { ...s }`) accepted without `s lacks { id }` | 3 |
| `r005b-self-apart` | `x # x` does not force `{}`, or a rigid twice is allowed | `g(p, p)` over `{ ...r }` accepted (D3' due) | 3 |
| `r005b-body-type` | Resolve.Lacking ignores tail pairs | a lambda annotated `{ ...r, ...s }` under a signature without the fact accepted (until Task 4, it reaches the multi-tail placeholder instead of D3) | 3 |
| `r005b-mixed-tails` | tail/tail decomposition skipped | `tagged` with `s lacks { id }` written, accepted without `r disjoint s` | 3 |
| `r005b-apart-persist` | a bound meta drops its apart pairs | `merge(merge(a, b), c)` with `a` and `c` sharing `x` accepted | 7 |
| `r005b-cancel` | common tails not cancelled | `{ ...r, ...s } ~ { ...s, ...r }` refused | 4 |
| `r005b-upper` | no upper bounds | `both(merge, merge)` unresolved | 7 |
| `r005b-pruned-reason` | U4's `{}` binding forgets the pruning fact (R10.2) | `granted({ admin: false })` (Tranche A's `granted`) reads a shape text such as `Expected {}, found { admin: Bool }` instead of D1 | 4 |
| `r005b-defer` | constants with several homes placed in the first home | `apply2(merge, { y: 2 }, { x: 1 })` refused | 7 |
| `r005b-quiet` | quiet equations expanded into the basis | `h(pick × 12)` exceeds its bound | 5 |
| `r005b-pending-dedup` | re-deferral appends | §2.6's nested equation reported twice | 5 |
| `r005b-pending-end` | pending equations dropped at the end | `split({ x: 1, y: 2 })` (`diag-06`) accepted | 5 |
| `r005b-end-fixpoint` | no drain in the settle rounds | a body whose effect retry unblocks a record equation is unresolved | 5 |
| `r005b-settle-rollback` | the store kept outside the substitution | an equation deferred inside a postponed pair survives the revert | 5 |
| `r005b-nested-field` | a nested equation given the expression's site | §2.6's nested D4 at the inner expression | 5 |
| `r005b-both-annotation` | record-row arguments not unified before the drain, or the deferred equation dropped | §8's `example()` unresolved | 5 |
| `r005b-drain-text` | drain failures use Require's own text | `apply2(merge, { z: 1 }, { y: 2 })` reads `Expected { ..._ }, found { z: Int }` || 7 |
| `r005b-three-way` | an `Unresolved` outcome rendered through the contradiction path | Example 1 prints a D6 form || 7 |
| `r005b-drained-reason` | a drain binding loses its causal equation (R10.1) | Example 17 reads `Expected {}, found { z: Int }` || 7 |
| `r005b-participation` | every binding that took part in an equation reports D6 | fixture `participation-control` prints D6 | 6 |
| `r005b-bound-reason` | the last narrowing is named (R10.3) | Example 19 with `{ z: 1 }` notes the second `merge` || 7 |
| `r005b-part-identity` | parts deduplicated by printed name (R3) | fixture `same-name-parts` lists one part | 6 |
| `r005b-owner-written` | the owner's side printed through the substitution (R5) | Example 13 prints `{ x: Int, ..._ }`-style resolved rows || 7 |
| `r005b-without-hole-left`, `-right` | removal subtracts from the resolved type | `drop({ x: 1 }, { y: 2 }).x` and `drop({ y: 2 }, { x: 1 }).x` run | 7 |
| `r005b-rest-hole` | the rest binder subtracts | `match merge(p, q) { { x, ...rest } => rest.x }` runs | 7 |
| `r005b-merge-order` | items built in label order | effects in `{ ...g(), x: f() }` run out of order | 8 |
| `r005b-merge-sources` | each field read from the first item | interleaved labels print the wrong values | 8 |

30 rows (`r005b-without-hole-left` and `-right` are two). At about 3.2 s
per row since T013 (449 s for 142 rows) they add about 1.6 minutes to
verify.

## Sizes and risks

| Task | Model | Size (tokens, time) |
|---|---|---|
| 0 gate | Opus | 250k, 4-5 h |
| 1 representation | Sonnet | 250k, 3-4 h |
| 2 surface | Sonnet | 150k, 2-3 h |
| 3 store, precedence | Opus | 350k, 5-6 h |
| 4 forced unification, result type | Opus | 400k, 6-7 h |
| 5 pending, drain, end | Opus | 400k, 6-7 h |
| 6 diagnostics, metadata | Opus | 450k, 7-8 h |
| 7 literal, removal, rest; complete-source fixtures | Opus | 350k, 5-6 h |
| 8 lowering, interpreter | Sonnet | 250k, 4 h |
| 9 generator, oracle level 2 | Opus | 300k, 4-5 h |
| 10 close-out | Sonnet | 200k, 3 h |

About 3.4M tokens and 50-60 hours of agent time, each task plus one
verify (12 min) and one differential (about 10 min). These are planning
estimates, not an approved budget (the user, 2026-10-17).

**Risks.**
- Task 1's churn (44 modules) collides with concurrent record work;
  land it on a quiet main.
- Field types in pending equations (§2.6) are argued, not prototyped
  (L17); Task 5's nested tests are the first evidence. If they show a
  case the argument misses, stop and report.
- The joint fixpoint (L18) is argued; a non-terminating interplay of
  effect rounds and the drain would show as a timeout in Task 5's tests.
- Drain and sum-rule cost on large bodies; measure on the scale programs
  (R001, T003) in Task 5 and keep the measured heuristics labelled.
- Apart partners grow with the number of merges a meta joins; measure.
- R10's reason bookkeeping (`boundBy`, `emptied`, narrowings) is new
  state on every binding; if costly, keep it only for record metas
  (heuristic, labelled).
- Task 6's renderings rely on metadata recorded since Task 3; a missing
  creation site shows as a wrong note, caught by the fixtures.
- The incompleteness (C3) is a measured rate; a rise above the ceiling
  in Task 5 is a defect, a fall a change to record.
- Most published examples first compile in Task 7 ("Test stages"); a
  renderer discrepancy that Task 6's spread-free fixtures did not show
  is found and fixed there, which is why Task 7's estimate grew.

## Decisions (the user, 2026-10-17)

1. **Task 0 alone is authorized**; Tasks 1-10 wait for the gate (rule
   arguments, the completed ledger with its argument-only rows, the
   fixtures' texts).
2. **Retiring Tranche A's `A record literal accepts at most one
   spread`**: approved, when several spreads become supported (Task 7).
   The record-type `Only one row tail is allowed` retires in Task 2; the
   effect-row restriction stays.
3. **`Equated` ranked last**: approved, for choosing between competing
   provenance reasons. The causal rules R10.1-R10.3 still decide which
   explanation applies; their control fixtures are kept (Global
   Constraints).
4. **The counterexample texts** (`odd-cycle`, `determinate`): approved
   as derived in this plan, the annotation hint included for both. The
   odd-cycle hint may expose a contradiction rather than repair the
   program.
5. **docs/engineering.md's evidence section**: approved as a general
   rule with proportional scope (new or materially changed solving rules
   and their diagnostic claims; routine checker edits need no new
   three-way API, exhaustive oracle or claims ledger; where evidence is
   unavailable, the limitation is stated).
6. **Effort estimates** are planning estimates, not an approved budget.
7. Corrections applied in Task 0: the Unresolved buckets asserted; test
   stages and activation; rewriting versus defaulting in the arguments;
   no substring test.

**For the gate** (Task 0's results): the rules file; the ledger's
argument-only rows (L17, L18, L19, L21, L22, L33 and the argument parts
of L1, L26, L28, L32); the derived texts (`design-forced-fact`,
`design-holes`, the notes of `odd-cycle` and `determinate`); and L34,
the reading of R1.1 that `determinate`'s approved text needs.

**The user's Task 0 review (2026-10-17).**

8. **Task 0 accepted; Task 1 authorized; Tasks 2-10 unauthorized.**
9. **L34 approved** with the interpretation recorded in the ledger:
   bare-meta aliases are followed when matching a part to the owner's
   variables, independently of the unifier's direction for an alias;
   part identity and tracked remainder ancestry are preserved; an
   owner's name is never given to arbitrary components of a structured
   binding.
10. **Derived texts approved:** `design-forced-fact`, `design-holes`,
    the added notes on `odd-cycle` and `determinate`, including `{ a:
    Int, ..._ } is required here`.
11. **Task 7's revised estimate (350k)** is an estimate, not an approved
    budget.
12. **Requirements added:** Task 5's dependency-complete wake-up (L32);
    the compiler-backed property E test reads back independently, with a
    sensitivity check (Task 4); the field-type, rollback, joint-fixpoint
    and specialization arguments (L17, L18, L19, L22) are implementation
    obligations, not established compiler behaviour, and their planned
    tests land with those changes; L29 is bounded evidence, and L31 needs
    property E or a direct exclusion check.
13. **research/open-row-merge/state.mjs imports the prototype's
    `flatten`** (shared machinery): its property E results stand but
    are not independent (research README).

**Task 2 (2026-10-17).**

14. **Task 2 alone is authorized**; Tasks 3-10 wait for the user's review
    of it. The ruling on lacks per tail (ledger, below L34) is recorded
    with it: one passed lacks fact per tail is correct, it does not
    establish that `r` and `s` are disjoint, and Task 3 tests both.
