# Open-row merge: is the custom solver worth its cost? (R005 Tranche B)

Status:
Assessment for the user's decision; no direction change made

Written 2026-10-18 on branch `row-merge-alternatives` from main de8dffc.
No compiler source, test or script changed; nothing was built and
verify was not run. The new prototypes and the Z3 cross-check are in
research/row-merge-alternatives/ (README: exact commands, outputs,
versions). Every number below was produced by those commands on
2026-10-18 unless it is marked **estimate**. Branch r005b-task5 (Task 5
WIP, unverified) was not used. The compiler build in output/ appears to
come from that WIP branch, so no verdict here comes from running it.

## 0. The answer in brief

- **What the custom solver buys over a conventional design.** A simpler
  design (alternative A below: splits are never inferred; an equation is
  solved only when the one-tail rules determine it, otherwise it waits;
  unsolved parts default to `{}` if that satisfies everything) gives
  the same verdict as the current design on 70 of the 72 executable
  fixtures, and on all 25 that Tasks 1-4 can already run. Its variant AH
  (A plus Task 4's one-home commit) differs on one fixture,
  `design-forced-bound` (`both(merge, merge)`). On 6,000 program-shaped
  merge trees (12,000 runs, plus as many with shared parameters) A and
  AH accept every program the current design accepts.
- **Where the current design is better for users**, measured: (1)
  higher-order uses that pass an uninstantiated `merge` to callbacks
  sharing a parameter (review F2's family: the current design accepts
  186 of 392; A and AH accept none, each needs one annotated lambda);
  (2) about 0.2-0.9 % of refusals on program shapes are proved
  contradictions under the current design but `Unresolved` ("Cannot
  tell …") under A/AH; (3) order independence: the current design had
  0 order differences everywhere; A had 4 in 14,000 raw problems and 1
  in 6,000 program shapes, AH 0 and 1.
- **Cost.** Most of what remains (Tasks 7-10, about 1.1M tokens of the
  plan's 1.95M, **estimate**) is the same on every path. The parts only
  the current design needs are already built and verified (sum rule,
  upper bounds: about 310 src lines in three modules) plus two pending
  obligations, Task 5's pruning on older lack paths and Task 6's
  R10.2/R10.3 reasons. Switching to AH would save roughly 0-0.15M
  tokens now (**estimate**) and about 400 src lines of upkeep, and it
  reopens approved decisions (user decision 3's upper bounds, F2's
  fix).
- **Recommendation: a hybrid.** Keep the current rules (no approved
  decision reopened), re-scope Task 5 to A's simpler mechanisms (pending
  equations in the substitution, a full rescan instead of a wake-up
  index, which meets L32 by construction), and keep AH as a measured
  fallback with stated triggers (§9). Add Z3 as an optional test oracle
  outside verify; do not use it in production.

## 1. The question

The user (2026-10-18, as relayed by the coordinator) paused Tranche B
before Task 5 because it was never established that the custom solver is
worth its cost: "the custom solver's justification must be better
user-facing behaviour at an acceptable maintenance cost — not merely
that it can be made to work." Two alternative families were named: (A)
adapt an established row-constraint approach, keeping the `{ ...r, ...s
}` surface but solving by a simpler, more conventional mechanism; (B) a
general constraint solver such as Z3, first as an independent test
oracle.

## 2. What exists and what remains

**Built and merged (Tasks 0-4).** Diff stats from 9e9a872 (before Task
1) to de8dffc: src +3,209/−630 lines in 92 files; test and scripts
+2,614/−52 in 43 files. By task (src only): Task 1 +244/−168, Task 2
+743/−129, Task 3 +733/−222, Task 4 +1,684/−306.

| Piece | Modules (lines today) | Task |
|---|---|---|
| several-tail rows, flatten | Domain.Type.RecordSubst, FlatRecord, … | 1 |
| surface: `...r, ...s`, `where r disjoint s`, D8, D9 | Format/Parse/Constraint, Resolve/Apart (198), ArgumentPairs (156) | 2-3 |
| fact store with provenance and precedence; bind rule; D2, D3, D3', D3'' | RowStore (199), Because (107), Disjoint (161), RecordTail (234), UseFacts (53), Seed | 3 |
| residue, homeless constants, one meta alone, shared remainder | UnifyRecord (138), RowResidue (122), Homeless (70), RowSettle (141) | 4 |
| homes and commits | Homes (54), Commit (54) | 4 |
| sum rule and upper bounds (U1-U4) | SumRule (143), Narrow (116), RowBound (50); `upper`, `emptied` in RowStore; RecordTail | 4 |
| three-way result, stop classification, test entry | RowOutcome (85), Refused (35), RowEntry (182) | 4 |
| evidence | oracle port, exhaustive domains A and B, property E read-back with sensitivity, generators, 72 fixtures | 0, 4 |

Effort: the plan estimated Tasks 0-4 at 1.4M tokens; only Task 4's
actual is recorded (about 0.6M against 0.4M estimated).

**Remaining (the plan's estimates, not a budget).** Task 5 pending
equations, drain, end of body, rollback, joint fixpoint: 400k, 6-7 h.
Task 6 D4/D6 and R1-R11: 450k, 7-8 h. Task 7 literal, removal, rest,
complete-source fixtures: 350k. Task 8 lowering: 250k. Task 9 program
generator: 300k. Task 10 close-out: 200k. Total 1.95M tokens, about
29-33 h. At Task 4's overrun ratio (1.5) it would be about 2.9M
(**estimate**).

**An observation that matters for the decision.** Every fixture on
which the current design and A differ has `stages.solver` 5: the
compiler cannot decide it until Task 5, because the first equation of
`both(merge, merge)` waits before the bound forces it. So the user-facing
benefit of the sum rule and upper bounds is not yet delivered by the
compiler at all; at today's capability A and the current design agree
on every fixture the compiler runs.

## 3. The alternatives, precisely

### 3.1 The current design (C)

Design draft 3 and rules file: several-tail rows, persistent facts
(lacks, apart pairs), equations solved by forced moves only (cancel,
homes, commit a constant with one home, shared remainder, one meta
alone), the sum rule with upper bounds (U1-U4), pending equations and a
drain, quiet equations met by the empty default, D4 for a waiting
equation with a constant at the end. Incomplete by design; order
independence and soundness checked on exhaustive domains.

### 3.2 Alternative A: splits are never inferred

Keeps Tasks 1-3 entirely (representation, surface, store, bind rule,
precedence, D2-D3''), and from Task 4 the residue, the homeless check,
the one-meta-alone rule, the shared remainder, the three-way result and
the stop classification. An equation between two rows:

1. Flatten both; common labels unify field-wise once; common tails
   cancel (as Task 4).
2. A constant with no meta opposite: Contradiction (as Task 4, step 4).
3. **Determined cases**, the one-tail rules of ADR 013 generalised only
   as far as they stay determined: a side that is exactly one meta is
   bound to the other side; one meta on each side, each with constants,
   share one fresh remainder; metas on one side against an empty
   residue are all bound to `{}`.
4. **One necessary check**: a constant that every opposite meta already
   excludes (lacks it, or is apart from it) is a Contradiction.
5. Anything else **waits**, unchanged. No sum rule, no upper bounds, no
   homes, no commits, no fresh metas beyond the shared remainder.
6. **Wake-up**: after each top-level unification and in each settle
   round, every waiting equation is re-examined until a pass changes
   nothing (a full rescan, so dependency-complete by construction).
7. **End of body**: every unsolved record meta defaults to `{}` (what
   lowering already does), and every waiting equation is checked under
   that default. All hold: Solved. Otherwise: Unresolved, reported as
   D4 at the equation's site with the approved texts and hints.

The user-facing rule fits in one sentence: *a merged row's parts must
be determined, by arguments, annotations or written facts, at the point
of use, or be empty; otherwise the checker asks for an annotation.*

Soundness and leastness need no new argument beyond ADR 013's rules and
Task 3's bind rule: every binding is a most general step, so the
solutions of the final state are exactly the original ones; images are
monotone in the free metas, so the all-empty assignment of the free
metas is the pointwise least solution whenever it is a solution (rules
§0's defaulting obligation, met directly). Contradictions come only from
steps 2 and 4 and from the bind rule, each of which proves that no
solution exists.

Variants measured:

- **AH** (A with Task 4's commit): a constant with exactly one
  non-excluding home among the opposite metas is committed there,
  `m := { c } ⊎ ?m'`. Uses the already built Homes and Commit modules.
- **A0** ("no deferral"): an equation that A would leave waiting with a
  constant opposite two or more metas is Unresolved immediately. Not a
  candidate: its verdict depends on checking order on 19 Solved and 10
  Contradiction fixtures (§5), so `apply2(merge, { x: 1 }, { y: 2 })`
  and the annotated `Both` fail in some orders.

### 3.3 How A relates to the literature (conceptual only)

Summarised from the projects' published descriptions as known to the
author; not re-read for this assessment.


- **PureScript** solves `Prim.Row.Union l r u` in the compiler with
  functional dependencies (two of the three rows determine the third)
  and keeps duplicate labels; `Record.disjointUnion` adds `Nub u u` to
  forbid them, which is Waxwing's merge. A constraint that does not
  become determined is reported or, for an unannotated binding,
  generalised. A is the same policy without generalization (Waxwing
  signatures are explicit and `let` is not generalised): wait until
  determined, then solve; never search for a split.
- **Ur/Web** states disjointness `[r1 ~ r2]` explicitly and proves it by
  decomposition (what Task 3 built); its unifier for concatenations is
  incomplete by design and asks for annotations. A is closer to it than
  C is: C adds bounds and the sum rule on top.
- **Gaster and Jones** (lacks), **Morris and McKinna** (Rose: `ρ1 ⊙ ρ2
  ~ ρ3` with evidence, deferred to generalization) and **Leijen**
  (scoped labels, duplicates allowed): A's pending equation is Rose's
  combination predicate without evidence passing (Waxwing specializes
  every function). Leijen's duplicates are excluded by ADR 002 and 013.
- **Koka** rows are effect rows with scoped (duplicate) labels; Koka has
  no row-polymorphic record concatenation, so it is not a model here.

### 3.4 Alternative B: a general solver (Z3)

As a test oracle, implemented and run (§8). As the production solver,
assessed in §8.3.

## 4. Representative programs

Each program is in Tranche B surface; `merge` is
`fn merge(a: { ...r }, b: { ...s }): { ...r, ...s } where r disjoint s =
{ ...a, ...b };` and `merge3` is `merge(merge(a, b), c)` with three
tails. Verdicts are from the labels-only prototypes (C:
research/open-row-merge; A, AH: research/row-merge-alternatives) over
every order the fixture names; S = Solved, C = Contradiction, U =
Unresolved. **Status today**: main refuses any `merge` body (`A record
literal accepts at most one spread`) until Task 7, so no complete
program below runs today. "Rows 4" means the fixture's labels-only rows
run through the compiler's exported unification entry since Task 4
(`stages.solver` 4); "Task 5" means they wait, which today reaches the
Task 5 placeholder.

| # | Program | Fixture | Status today | C | A | AH | Extra annotations under A |
|---|---|---|---|---|---|---|---|
| 1 | `merge(merge({ x: 1 }, { y: 2 }), { z: 3 }).x` | design-composition | rows 4 | S | S | S | 0 |
| 2 | `merge({ x: 1 }, { x: 2 }).x` (D2) | diag-15 | rows 4 | C | C | C | 0 |
| 3 | generic `three(a, b, c) = merge(merge(a, b), c)` with result `{ ...r, ...s, ...t }`; without the facts (D3) | design-generic-three; -d3 | Task 5; rows 4 | S; C | S; C | S; C | 0 |
| 4 | `tagged(p: { id: Int, ...r }, q: { ...s })` without and with `s lacks { id }, r disjoint s` | design-mixed; -fixed | rows 4 | C; S | C; S | C; S | 0 |
| 5 | `fn example(): Both({ x: Int }, { y: Int }) = Both({ x: 1, y: 2 })` | design-both-annotated | Task 5 | S | S | S | 0 |
| 6 | `let b = Both({ x: 1, y: 2 })` (unannotated) | diag-07 | Task 5 | U | U | U | 0 (both need the approved hint's annotation) |
| 7 | `type W(...a, ...b) = W(Holder({ ...a, ...b }))`, `k({ y: 1 }, { y: 2 })` through `W` (D2; D3 for rigids) | regression row r005b-wrapper-pairs | implemented (Task 3) | C | C | C | 0 (facts only, no equation) |
| 8 | `apply2(merge, { x: 1 }, { y: 2 })`, either argument order | diag-11, design-defer | Task 5 | S | S | S | 0 |
| 9 | `apply0(merge)`, result `{ x: Int, y: Int }`; fixed with an annotated lambda | diag-01; -fix | Task 5 | U; S | U; S | U; S | 0 |
| 10 | partial `let add = merge({ x: 1 }); add({ y: 2 }).y`; `apply0(merge3({ x: 1 }))` | design-partial; diag-08 | rows 4; Task 5 | S; U | S; U | S; U | 0 |
| 11 | `both(merge, merge)`, `both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int })` | design-forced-bound | Task 5 | S | U | U | 1: `fn(p: {}, q: { x: Int }) => merge(p, q)` for `f` (checked: accepted) |
| 12 | `apply(merge, noX)` where `noX`'s clauses make `r lacks { y }`, `s lacks { x }` | diag-14-fix | Task 5 | S | U | S | A: 1 lambda, `fn(p: { x: Int }, q: { y: Int }) => merge(p, q)` (checked); AH: 0 |
| 13 | quiet: `apply0(merge, merge)` with a shared result; `h(pick × 12)` and × 40 | design-quiet; chain | Task 5 | S | S | S | 0 (A: 2 ms and 9 ms) |
| 14 | `drop = fn(p, q) => merge(p, q) without { x }`: `.x` on the rest (either side), `.x` while waiting, `.y` | design-removal-left, -right, -wait; -rest-field | Task 5 | C, C, C; S | C, C, C; S | C, C, C; S | 0 |
| 15 | bound contradictions: `apply1(merge, { z: 1 })`; `apply3(merge3, { x: 1 }, { y: 2 }, { z: 3 })`; `both(merge, merge, { z: 1 })` | diag-13, diag-17, diag-19 | Task 5 | C | C | C | 0 |
| 16 | `same(merge, merge)`, `same(f: (p, q) -> { x: Int }, g: (p, q) -> { y: Int })` (no solution) | none (new) | Task 5 | C | U | U | 0 (A reports it as D4) |
| 17 | holes: `apply0(merge, k)` with `k: { x: Int, ...t }`; `use(merge, p)` with a rigid `t` | design-holes; diag-18 | Task 5 | U | U | U | 0 |
| 18 | the counterexamples: `det(merge, merge)` (one solution); `three(merge, merge, merge)` (none) | determinate; odd-cycle | Task 5 | U | U | U | 0 |
| 19 | records in an effect operation: `fn report(a: { ...r }, b: { ...s }): Unit with Fail({ ...r, ...s }) where r disjoint s = fail(merge(a, b));` handled by `handle` | none | Task 5 (r005b-end-fixpoint, -settle-rollback plan tests) | S | S | S | 0; labels as #1. Rollback and the joint fixpoint are needed by both C and A, since both keep waiting equations |

Annotation burden: on these 19 programs (30 variants), A needs an
annotation the current design does not in two (11, 12), AH in one (11).
Over all 72 fixtures (`node fixtures-compare.mjs`): A changes 2
verdicts (design-forced-bound and diag-14-fix, Solved to Unresolved),
AH 1 (design-forced-bound), and no other class moves; the Unresolved
fixtures are Unresolved under every option, so the approved hints apply
unchanged.

## 5. Measured comparison

All runs: five constraint orders per raw or dense problem, two per
program shape, each verdict judged by research/open-row-merge's
independent brute-force oracle (S: an accepted assignment is a
solution; L: it is the least; H: a refusal has no solution).

**Soundness.** No S, L or H violation for any variant of A on any run
(fixtures, raw seeds 21-24, dense seeds 21-24, program shapes seeds 1
and 2 with and without SHARE, F2). Every A variant accepted only
problems C accepts and refused only problems C refuses: its losses are
all moves to Unresolved.

| Generator | Problems | C accepts | A loses (accept→U) | AH loses | C refusals | A: refuse→U | AH: refuse→U |
|---|---|---|---|---|---|---|---|
| raw, seed 21 | 2,000 | 2,010 runs | 45 | 5 | 7,655 | 35 | 10 |
| raw, seeds 22-24 | 12,000 | 12,245 | 317 | 50 | 45,870 | 130 | 35 |
| dense, seeds 21-24 | 14,000 | 19,895 | 8,785 | 4,680 | 22,540 | 11,470 | 7,365 |
| shapes, seed 1 | 2,000 | 1,782 | 0 | 0 | 2,104 | 18 | 18 |
| shapes, seed 1, SHARE | 2,000 | 1,686 | 0 | 0 | 2,250 | 4 | 4 |
| shapes, seed 2 | 4,000 | 3,666 | 0 | 0 | 4,116 | 23 | 23 |
| shapes, seed 2, SHARE | 4,000 | 3,412 | 0 | 0 | 4,426 | 10 | 10 |
| F2 family (`k(merge, …)`, shared parameter) | 392 | 186 | 186 | 186 | 0 | 0 | 0 |

The dense generator is two-meta sums against labels, a stress test of
exactly the cases splits decide; program shapes are merge trees whose
leaves are literals, rigid rows or fresh metas, with some merges fixed
by their result before their arguments (research/open-row-merge/
programs-gen.mjs). Neither is a corpus of real programs.

**Order independence (C2).** C: 0 order differences on every run. A: 2,
1, 1 on raw seeds 22-24 (0 on seed 21 and on dense), 1 on shapes seed 2.
AH: 0 on raw and dense, 1 on shapes seed 2. A0: hundreds per run (293
on raw seed 21, 485 on shapes seed 1). Every difference of A and AH is
between Unresolved and a definite verdict, never between Solved and
Contradiction. The two kinds seen: a fact that leaves a constant one
home arrives after the equation waits in one order (`{ a, ...m0 } ~ {
...m0, ...m2 }` and `m2 ~ m3 ⊎ m0`: forced through `m0 # m0` in one
order, through a lack in the other; AH's commit removes this kind), and
two waiting equations with the same metas and different constants
(`m2 ⊎ m3 = { a, b, c }` and, through bindings, `m2 ⊎ m3 = { c }`),
which only bounds or a comparison of waiting equations' normal forms
detect. The second kind would need such a comparison in A; it is not
prototyped.

**Cost of solving.** Not a differentiator at these sizes: every run is
milliseconds; A's quiet chain of 40 took 9 ms.

## 6. Implementation complexity

**What each path keeps of Tasks 1-4.**

| Path | Keeps | Removes or leaves unused |
|---|---|---|
| C | everything | nothing |
| C-lite (hybrid) | everything | nothing now; Task 5 does not build the `naming` index unless measured necessary |
| AH | Tasks 1-3; Task 4's residue, homeless, one meta alone, shared remainder, homes, commit, three-way result, stops, test entry and oracle tests | SumRule (143), Narrow (116), RowBound (50); `upper` and `emptied` in RowStore (31 mentions) and RecordTail (21); the `Outside` refusals in Lacked; about 400 src lines (**estimate**) |
| A | as AH | also Commit (54) and most of Homes (54) |

**Concepts a maintainer must hold**, by path. C: facts, the bind rule,
forced moves, homes and commits, upper bounds with four invariants and
pruning, the sum rule (three derivations, both directions), pending
equations with identity, normal form and an index, the drain, quiet
equations, the end default, rollback, the joint fixpoint, and three
causal reason rules (R10.1-R10.3) on bindings. AH: facts, the bind rule,
the one-tail rules, the one-home commit, pending equations with a full
rescan, the end default with its check, rollback, the joint fixpoint,
and R10.1 for commits. A: AH without commits.

**Remaining work, re-plan sketches (all estimates, tokens).**

| Step | C as planned | C-lite (hybrid) | AH |
|---|---|---|---|
| remove bounds and the sum rule; rules file, tests, exhaustive counts re-recorded; user approval for design-forced-bound → Unresolved and retiring `r005b-upper` | — | — | 150-200k |
| Task 5: pending equations, drain, end, rollback, joint fixpoint, nested fields | 400k (index, normal form, older-path pruning, rescan reference) | 300-350k (full rescan; older-path pruning still needed for bounds) | 250-300k (full rescan; no older-path pruning, which exists for bounds) |
| Task 6: D4/D6, R1-R11, metadata | 450k | 450k | 300-350k (no R10.2, R10.3) |
| Tasks 7-10 | 1,100k | 1,100k | 1,100k |
| Total remaining | 1.95M | 1.85-1.9M | 1.8-1.95M |
| Discarded of the built work | 0 | 0 | about 400 src lines and their tests, Task 4's bound evidence |

The paths cost about the same from here. The difference is upkeep and
risk: AH carries about 400 fewer src lines and no bound or narrowing
state on every binding, and its Task 5 drops the older-path pruning
obligation; C keeps the F2 behaviour and its measured order
independence.

## 7. Diagnostic quality

Texts for C are the approved ones (diagnostics file, §0) or derived by
its rules where marked. Texts for A are what A's mechanism can support
with the same renderer: a D6 form needs only the equation being examined
and the fact or binding that failed it.

| Program | C | A / AH |
|---|---|---|
| 9, `apply0(merge)` | D4 `Cannot tell whether merge's r or s has field x; pass a lambda with annotated parameters in place of merge`, notes at merge's result type and apply0's parameter | identical (same class, same waiting equation, same site) |
| 11, `both(merge, merge)` | accepted | D4 at the first `merge`, the same text form: `Cannot tell whether merge's r or s has field x; pass a lambda …` |
| 15, `apply1(merge, { z: 1 })` (diag-13) | D6 `merge's { ...r, ...s } must be { x: Int, y: Int }, so r cannot have field z` at `{ z: 1 }`, `required here` at `merge`; found through `r`'s bound (R10.3 names the excluding equation) | the same text at the same place: once `r := { z: Int }` the waiting equation is re-examined and `z` has no meta opposite; the failing equation is the one examined, so R10.3's selection is not needed |
| 16, `same(merge, merge)` | a contradiction (`?r` bounded by `{ x }` and `{ y }`, emptied by U4); a D6 form such as `merge's { ...r, ...s } must be { y: Int }, but neither r nor s can have field y` with R10.2's pruning note (derived, not among the pinned examples) | D4 `Cannot tell whether merge's r or s has field x; pass a lambda …`: true by D4's meaning (not resolved) but weaker; the hint's annotation would then expose the contradiction, as approved for odd-cycle |
| 14 and diag-14 (`neither r nor s can have field x`) | D6 `merge's { ...r, ...s } must be { x: Int, y: Int }, but neither r nor s can have field x`, `excluded here` notes | identical: A's step 4 (every opposite meta excludes `x`) |
| 18, odd-cycle | D4 with the approved hint | identical |

So A keeps the approved texts wherever its class agrees; where it
differs it shows D4 for a contradiction (about 0.2-0.9 % of program-
shape refusals, F2-style and `same`-style programs) or asks for an
annotation where C accepts.

## 8. Z3

### 8.1 The encoding

research/row-merge-alternatives/z3-encode.mjs, written from the oracle's
stated meaning: one Boolean `in(m, a)` per meta and atom; a row's count
of an atom is its fields and rigid tails equal to it plus `in(t, a)` for
each meta tail; a row is well formed iff every count is at most 1, no
rigid sits beside a label it is not hypothesised to lack, and no two
rigids sit together unless hypothesised apart. `eq` is two well-formed
rows with equal counts, `dis` a well-formed joined row, `lacks v l`
excludes `l` and every rigid not known to lack it. The least solution is
computed as design §2.7 says (P^NP): an atom is in the meet iff the
problem with it excluded is unsatisfiable; the meet is least iff it is a
solution.

### 8.2 Results (z3-solver 5.3.1 from npm, Z3 5.3.1.0 ac9156f9, node v26.6.0)

| Sample | Problems | Time | Z3 vs brute force | Z3 vs the verdict claims of C and A |
|---|---|---|---|---|
| fixtures, two orders | 72 | 2.6 s | 0 disagreements; odd-cycle 0, determinate 1, diag-01 4 solutions | 0 rejections |
| raw seed 21, five orders | 1,000 | 34.7 s | 0 disagreements (satisfiability, solution set, least solution); 51 counts over the 64-solution cap compared only as "at least 64" | 0 rejections (5,000 runs each) |
| dense seed 21, five orders | 1,000 | 70.1 s | 0 (64 over the cap) | 0 rejections |

Sensitivity (scratch copy, deleted): three single mutations of the
encoding each produced disagreements (for example dropping the
at-most-once count: `DIFF-sat` 8, `DIFF-count` 41, `DIFF-least` 9 on 300
problems), and making A accept every waiting equation produced 75 Z3
rejections. The first run also found a bug in the cross-check itself
(unsorted keys), fixed before the runs above. So two independently
written semantics agree on 2,072 problems, and both solvers' claims hold
under the second one.

### 8.3 Production use

- **Dependency and architecture.** A 34.6 MB WebAssembly build with an
  asynchronous, threaded API. Features.Check is pure PureScript;
  AGENTS.md puts effects and foreign imports in Runtime and Program
  only, so calling Z3 from checking means either breaking the layering
  or restructuring checking around an effect.
- **Determinism.** A model is an arbitrary solution, so every answer
  must be canonicalised (the least solution costs one query per meta and
  atom), the version pinned, and timeouts kept out of verdicts.
- **What it would gain.** On the labels-only abstraction Z3 can decide
  exactly whether a least solution exists, so `determinate` would be
  accepted and `odd-cycle` refused as a contradiction: the only path that
  removes the incompleteness. But field types (nested equations), the
  ordinary unifier and the order of checking stay custom, and the
  question is coNP-hard (design §2.7), so a time limit would reintroduce
  an "unknown" class.
- **Errors.** An unsat core is a set of constraints, not minimal unless
  asked, and not stable across versions; turning it into the approved
  texts (R1-R11) is custom work at least as large as Task 6.
- **Cost.** About 35-70 ms per problem in these runs (with enumeration),
  against well under a millisecond for either prototype.

Not for production now. As a test oracle it adds a second independent
semantics at no repository cost; its real value would come where brute
force cannot reach (larger universes in Task 9's generated programs,
where enumeration grows as 2^(atoms × metas)).

## 9. Recommendation

**Hybrid: keep the current rules, simplify Task 5's mechanisms, keep AH
as the fallback.**

1. Keep C's solving rules as merged and approved. They are built and
   verified (exhaustive domains, property E with sensitivity, 0 order
   differences), and they are what delivers the only measured
   user-facing advantages: the F2 family, about 0.2-0.9 % more refusals
   proved as contradictions, and order independence.
2. Re-scope Task 5 using A's mechanisms: pending equations stored in the
   substitution (rollback comes with the revert), a full rescan to a
   fixpoint as the production drain (L32 met by construction; build the
   `naming` index only if the scale programs show the rescan is slow),
   the end default checked against every waiting equation. Estimate
   300-350k instead of 400k.
3. Keep AH as the measured fallback. Switch to it if any trigger below
   fires; the switch is about 150-200k (**estimate**) and changes one
   fixture's class.
4. Z3: keep research/row-merge-alternatives/z3-oracle.mjs as an optional
   oracle outside verify (no dependency, no network in verify). Revisit
   in Task 9 if generated programs exceed the brute force's range; never
   in the checker.

**What would change this.**

- Toward AH: Task 5's nested field equations, rollback or joint
  fixpoint interacting badly with bounds (a bound that must be rolled
  back, a sum-rule fact derived from a field type that the argument
  missed); bounds or the sum rule measurably slow on the scale programs;
  the user judging point-free higher-order uses of `merge` (F2) not worth
  their upkeep and accepting AH's measured order differences (0 on raw,
  1 in 6,000 program shapes) or asking for the normal-form comparison
  that would remove the remaining kind.
- Toward C as planned (with the index): a measured rescan cost on large
  bodies.
- Toward A or A0: none of the evidence supports them; A0 is
  order-dependent and A loses the fact-forced commits AH keeps.
- Toward Z3 in production: a requirement that `determinate`-like
  programs be accepted (completeness on the finite abstraction), with
  the layering cost accepted.
- Any path: a corpus of real Waxwing programs using `merge`; the
  generators here are synthetic, and a corpus where merges always take
  known arguments would make the paths indistinguishable to users.

**Sunk and remaining, by path (estimates, tokens).**

| Path | Sunk in Tasks 0-4 | Remaining | Sunk work discarded |
|---|---|---|---|
| C as planned | 1.4M planned; Task 4 actual 0.6M | 1.95M (2.9M at Task 4's overrun) | none |
| C-lite (recommended) | same | 1.85-1.9M | none |
| AH | same | 1.8-1.95M | bounds and sum rule, about 400 src lines and tests |
| A | same | about as AH | also Commit, most of Homes |

## 10. Evidence limits

Labels only: field types (so nested equations), effect rows (so rollback
and the joint fixpoint) and texts are absent from both prototypes and
from the Z3 encoding. A, AH and A0 are toys written for this assessment,
not ports of the compiler; their order differences are characterised by
the examples in §5, not analysed exhaustively, and the exhaustive
domains A and B were not run on them. The A-side diagnostic texts in §7
are what the mechanism can support, not implemented renderings. The
effort figures are planning estimates; only Task 4's actual effort is
recorded.
