# R005 Tranche B Implementation Plan (open-row merge)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking. Implementation is not
> authorized: do not start Task 1 before the user approves this plan and
> Task 0's gate.

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
- docs/engineering.md, "Evidence for solvers and diagnostics" (proposed
  2026-10-17, needs the user's approval): the evidence rules below are
  this plan's requirements whether or not that section becomes general.

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
  `Unresolved`. No state, type or function is called ambiguous.
- **Forced moves only** (user decision 3): cancel, sum rule with upper
  bounds, one meta alone, commit a constant with one home, shared
  remainder, defer, quiet. No search, no basis expansion.
- **The merge literal** is Tranche A's `RecordExtension` with any number
  of `Spreading` items; Go lowering evaluates items left to right into
  temporaries and builds the struct from the items' ground layouts.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Status:** Draft 2026-10-17; implementation not authorized.

## Global Constraints

- **AGENTS.md governs:** files ≤250 lines; 80 columns (`node
  scripts/width.mjs` after `git add`, check its exit code); `where`, not
  `let … in`; no anonymous lambdas; `maybe`/`either` with named helpers;
  layer and IR allowlists; error codes as an ADT; regression proofs fail
  with the defect restored, in an isolated copy.
- **Three-way result.** Every diagnostic from row solving is rendered
  from a `RowOutcome` (above). A test asserts that no module this plan
  adds or changes for row solving or its texts contains `mbiguous`
  (case-insensitive; existing unrelated uses, such as Comparable's and
  Problem's, are outside its list) and that the D4 renderer's only input
  type is the `Unresolved` payload.
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
  not fix. The rank of `Equated` (last, design §1.3) is Proposed but the
  approved R10 decisions depend on it; Task 3 implements it as last and
  the user confirms it with Task 0's gate (Decisions, below).
- **Retired texts.** `Only one row tail is allowed` retires for record
  types (Format/Parse/RecordType.purs) in Task 2 and stays for effect
  rows (Format/Parse/Row.purs). Tranche A's approved `A record literal
  accepts at most one spread` (Problem `SecondSpread`, Resolve/Record)
  is **withdrawn** in Task 7, as draft 3's §13 slice 6 says: once merge
  literals exist no literal is refused for its number of spreads (an
  overlap is D2'), so no case remains where it applies. The withdrawal
  removes an approved text and so needs the user's confirmation
  (Decisions, below); until then Task 7 is blocked at that step.
- **Buildable commits** with placeholders, as in R004 and Tranche A:
  `Internal "R005B placeholder: <what> (Task N)"` at the first
  downstream function that can fail; a function that cannot fail gets a
  real case. Task 8 gates on `grep -rn "R005B placeholder" src` being
  empty; Task 10 repeats it.

  | Added in | Placeholder at | Text after `R005B placeholder: ` | Removed in |
  |---|---|---|---|
  | Task 2 | Check: the first record unification or flattening that meets a row with two or more tails (Check/UnifyRecord entry, Check/FlatRecord callers that assume one tail) | `rows with several tails are checked in Task 4` | Task 4 |
  | Task 2 | Check/Function and Check/Use where a resolved `Disjoint` constraint would be seeded | `disjoint constraints are checked in Task 3` | Task 3 |
  | Task 4 | Check/UnifyRecord: a residue whose constants each have several homes, or a quiet residue | `equations that wait are solved in Task 5` | Task 5 |
  | Task 4 | Check/Removal and Check/RecordPattern (rest binder): a receiver or scrutinee whose flattened row has two or more tails | `removal and rest binders over several tails are checked in Task 7` | Task 7 |
  | Task 4 | Specialize/Record: a row with two or more tails under a key | `rows with several tails are lowered in Task 8` | Task 8 |
  | Task 5 | the end-of-body report of an `Unresolved` outcome | `unresolved row equations are reported in Task 6` | Task 6 |
  | Task 5 | Require/Reject for a `Contradiction` whose reason is `Equated` (or a `boundBy` or `emptied` binding) | `contradictions from equations are reported in Task 6` | Task 6 |

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
     solutions. Permanent fixtures cover `Unresolved` with zero
     (odd cycle), one (determinate) and several (Example 1) solutions.
  2. *Executable examples.* Each worked example of the design and the
     diagnostics file is a data fixture (below), checked against the
     research oracle before Task 0's gate and run through the compiler
     from the task that implements it.
  3. *Rule arguments.* Every solving rule has a written argument before
     its task starts (Task 0): it preserves solutions, a rejection it
     makes establishes impossibility, its iteration terminates. Each rule
     is tested on a small exhaustive domain and on random problems.
     Performance heuristics are labelled `heuristic` in the arguments and
     in comments, apart from correctness rules.
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
- **Models:** Opus for Tasks 0, 3, 4, 5, 6, 7 and 9 (solver,
  diagnostics, evidence); Sonnet for Tasks 1, 2, 8 and 10 (mechanical),
  with an Opus review of Task 1's differential, Task 8's lowering and
  every task's regression rows.

## Review Focus

1. **The result classes.** No path renders D6 from `Unresolved` or D4
   from `Contradiction`; the odd-cycle program (no solution) is D4,
   because the checker has not established a contradiction. Tasks 4-6.
2. **Reasons survive solving.** R10.1 (commit and drain bindings keep
   their causal equation, and only those), R10.2 (U4's `{}` reports the
   pruning fact), R10.3 (a bound names an equation that excludes the
   atom, earliest site first). Tasks 3-6.
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

## Claims ledger (initial)

Each factual claim of draft 3 and the diagnostics file about the
algorithm, with what backs it today. "Argument" rows are the gate's
work list: Task 0 either adds the check named or the user accepts the
row as argument only. Commands run from research/open-row-merge/.

| # | Claim (where) | Backing today | Check to add |
|---|---|---|---|
| L1 | With one tail per side the rule makes ADR 013's rules 1-6 (design §2.3) | argument, not yet checked | Task 4 differential `--corpus all`, 0 differences; exhaustive one-tail domain in test/row-merge.test.mjs |
| L2 | The sum rule is sound: it restates `m ⊆ C2 ⊎ M2` (§2.5) | perm.mjs S and H, 0 of 480,000 runs per generator (labels only) | rule argument (Task 0); exhaustive domain (Task 4) |
| L3 | Solving terminates; the measure decreases (§2.7) | argument, not yet checked | rule argument; a step counter bounded by the measure in the compiler oracle test (Task 4) |
| L4 | At most `|Π|·|Κ|` solver-made metas (§2.7) | growth.mjs: worst 12 against 196 | compiler oracle test asserts the bound per problem (Task 4) |
| L5 | Satisfiability is NP-complete (§2.7) | argument (reduction); sat13.mjs shows the instances are D4 | none needed beyond the argument; accepted as argument |
| L6 | A least solution's existence is coNP-hard (§2.7) | switch.mjs, 400 of 400 | none |
| L7 | Quiet equations do not multiply (§2.2) | chain.mjs, n up to 40 | `r005b-quiet` timing row (Task 5) |
| L8 | Review F2's family: all 186 programs with a least solution accepted (§2.5) | shared.mjs | compiler oracle level 2 shared-parameter generator (Task 9) |
| L9 | C1: one pending equation at D4 ⇒ no least solution (§12) | perm.mjs `d4OnePendingWithLeast` 0 | compiler oracle test (Task 5) |
| L10 | C2: verdict class independent of order (§12) | perm.mjs `orderDiff` 0 | compiler oracle test (Task 4, 5) |
| L11 | Solved emits a solution | perm.mjs `solvedViolates` absent (0), 2026-10-17 campaign | compiler oracle test (Task 4) |
| L12 | Contradiction ⇒ no solution | perm.mjs `dishonest` 0 | compiler oracle test (Task 4) |
| L13 | Unresolved makes no claim on the count; occurs with 0, 1, several | unresolved.mjs; campaign buckets (README) | compiler fixtures `odd-cycle`, `determinate`, `diag-01` (Task 6) |
| L14 | D4 with a least solution needs two pending equations sharing a meta (C3, §2.2) | perm.mjs, 3,205 dense and 45 raw runs, all within C3 | compiler oracle test with a recorded ceiling (Task 5) |
| L15 | Removal by the fresh remainder keeps no held label (§5.2) | removal.mjs (labels) | `r005b-without-hole-*`, `r005b-rest-hole` (Task 7) |
| L16 | §8's `Both` example is accepted, unannotated D4 | annotation.mjs | `r005b-both-annotation` (Task 5, texts Task 6) |
| L17 | A nested equation is deferred once, at the outer site (§2.6) | argument, not yet checked (no field types in the prototype) | `r005b-nested-field`, `r005b-pending-dedup` (Task 5) |
| L18 | The joint fixpoint ends and is order independent (§6) | argument, not yet checked | `r005b-end-fixpoint` both directions (Task 5); rule argument |
| L19 | The store reverts with a postponed effect pair (§1.3, §6) | argument (it lives in `Subst`), not yet checked | `r005b-settle-rollback` (Task 5) |
| L20 | P1-P7's "before" texts (§1.6) | manual probe at 106ce60, not kept | fixtures `precedence-p1`… with `before`, red against main (Task 3) |
| L21 | No existing test expectation moves with the precedence (§1.6) | argument (grep), not yet checked | Task 3 runs the whole suite before changing any expectation |
| L22 | After specialization every row is ground (§9) | argument, not yet checked | Specialize asserts it (E_INTERNAL on a tail left); Task 8 generator |
| L23 | `x # x` forces `{}`; a rigid twice is D3' (§3.1) | argument; oracle's `wf` agrees by definition | exhaustive domain (Task 3/4); `r005b-self-apart` |
| L24 | The diagnostics examples' classes (diagnostics Appendix A) | diag.mjs, output identical to Appendix A | example fixtures (Task 0) |
| L25 | Appendix B's six refusal kinds differ from the approved texts | diag.mjs | fixtures `diag-03`, `-05`, `-13`, `-15`, `-17`, `-19`, `lone-meta-lack` assert approved texts (Task 6) |
| L26 | Example 14's text is order independent under R10.1 | argument, not yet checked | fixture `diag-14` in both orders (Task 6) |
| L27 | `expand` removes the raw-generator D4s with a least solution (§2.2) | perm.mjs `EXPAND=1`, recorded campaign | none (not adopted) |
| L28 | Programs calling `merge` with known arguments never wait (§2.7) | argument | Task 9 census: no pending equation in that shape |

## Review findings and their checks

| Finding | Closed by | Task |
|---|---|---|
| F1 removal keeps a held label | `r005b-without-hole-left`, `-right`, `r005b-rest-hole` | 7 |
| F2 determinate bodies refused | `r005b-upper`; Task 9 shared-parameter generator | 4, 9 |
| F3 property C untestable | oracle properties C1, C2, C3 in test/row-merge.test.mjs | 4, 5 |
| F4 drain with field types | `r005b-nested-field`, `r005b-pending-dedup` | 5 |
| F5 exponential pieces | `r005b-quiet` (timing) | 5 |
| F6 drain failures read as nonsense | `r005b-drain-text`, `r005b-drained-reason` | 6 |
| F7 end of body with postponed pairs | `r005b-end-fixpoint`, `r005b-settle-rollback` | 5 |
| F8 implied versus written clause | `r005b-precedence` and the P1-P7 fixtures | 3 |
| F9 signatures no call can use | D8 test; `r005b-both-annotation` (D7 withdrawn) | 2, 5 |
| F10 termination measure | step-counter assertion (L3) | 4 |
| F11 D2' late location | fixture `d2-late` (rule 1 wins) | 7 |
| F12 NP claim | ledger L5, L6 (argument plus switch.mjs) | 0 |
| F13 smaller points | creation-site harness in test/row-merge.test.mjs; `arrivedAt` fixture `d2-call` | 3, 4 |
| User review: D4's meaning | `r005b-three-way`; fixtures `odd-cycle`, `determinate` | 6 |
| User review: R10.1 limit | `r005b-participation` | 6 |
| User review: R10.2 | `r005b-pruned-reason` | 4, 6 |
| User review: R10.3 | `r005b-bound-reason` | 6 |
| User review: R3 identity | `r005b-part-identity` | 6 |
| User review: R5 | `r005b-owner-written` | 6 |

## Executable example fixtures

**Where.** test/fixtures/r005b/, one JSON file per example (data
fixtures, exempt from the line and width rules; they hold no code).
Names: `diag-NN` (diagnostics Examples 1-19, with `diag-NN-fix` for each
resolving edit), `design-*` (draft 3's §1.5, §2.4 four cases, §3.3 two
cases, §4, §5.2, §7, §8 annotated and unannotated), `precedence-p1` …
`-p7` and `-control-*` (§1.6), `odd-cycle`, `determinate`, `lone-meta-
lack` (Appendix B), and `found-*` (shrunk generator failures, Task 9).

**Format.**

```json
{
  "name": "diag-13",
  "from": "diagnostics §8 Example 13",
  "task": 6,
  "source": "fn merge(…) … fn main(): Int = apply1(merge, { z: 1 });",
  "result": "Contradiction",
  "diagnostic": {
    "id": "D6", "code": "E_TYPE",
    "message": "merge's { ...r, ...s } must be { x: Int, y: Int }, …",
    "at": { "text": "{ z: 1 }", "nth": 0 },
    "notes": [
      { "message": "required here",
        "at": { "text": "merge", "nth": 2 } }
    ]
  },
  "before": null,
  "output": null,
  "rows": {
    "hyp": { "lacks": {}, "apart": [] },
    "steps": [
      { "k": "dis", "l": { "fields": [], "tails": ["m0"] },
        "r": { "fields": [], "tails": ["m1"] } }
    ],
    "orders": "all"
  }
}
```

Strings elided with `…` above are written in full in a fixture, on one
line. `result` is `Solved`, `Contradiction` or `Unresolved`; `output` is the
expected stdout for a `Solved` program that runs; `before` holds
Tranche A's diagnostic where a fixture records a change (P1-P7);
locations are `{ text, nth }` as test/support.mjs `spanAt` takes them.
`rows` is the labels-only projection (research encoding), present when
the example has one.

**Runners.**
- research/open-row-merge/fixtures.mjs (Task 0) reads every fixture's
  `rows` and checks the claim with oracle.mjs and the prototype:
  `Solved` → solutions exist, the prototype accepts, and its solution
  is the least; `Contradiction` → zero solutions and the prototype
  refuses; `Unresolved` → the prototype ends in D4 (the count is
  printed, never asserted). Exit 1 on any mismatch. Run before the gate.
- test/r005b-fixtures.test.mjs (Task 4 onward) compiles each fixture's
  `source`: class, code, message, primary span and notes exactly; runs
  `output` through Go. A fixture lists the task that enables it
  (`"task": 6`); earlier tasks skip it by that field only, never by
  failure, and Task 10 asserts that no fixture is skipped.

## Pinned compiler programs from the user's review

The two counterexamples as Waxwing programs; their labels-only
projections were run on the prototype on 2026-10-17 (scratch
progcheck.mjs, to become fixtures in Task 0): odd cycle D4 with 0
solutions; determinate D4 with 1 solution, in both step orders.

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
{}`, `p = { a }`. Task 0 confirms both texts against R1-R11 before the
gate; a disagreement is a question for the user, not an edit.

---

### Task 0: Pre-implementation gate (arguments, ledger, fixtures)

Docs, research scripts and fixture data only; no src change.

**Files:**
- docs/plans/2026-10-17-open-row-merge-rules.md (new): one section per
  solving rule (flatten; common labels; cancel tails; residue failure;
  sum rule bound, lack, apart; one meta alone; homes; commit; shared
  remainder; defer; quiet; U2-U4; the bind rule §3.2; decomposition
  §3.1 with `x # x`; the drain and deduplication; the end default and
  the joint fixpoint; removal's fresh remainder), each with three
  paragraphs (preserves solutions; rejection establishes impossibility;
  terminates) and its exhaustive-domain bound. Heuristics labelled:
  the `naming` index, re-examining only changed equations,
  deduplication by normal form, stamping `arrivedAt` only on record
  metas, running the sum rule only on changed residues (if adopted).
- this plan's ledger, completed.
- test/fixtures/r005b/*.json: every fixture listed above except
  `found-*`.
- research/open-row-merge/fixtures.mjs (runner), exhaustive.mjs (each
  rule on every problem within a small bound: 2 labels, 1 rigid, 3
  metas, 2 equations of rows with at most 1 field and 2 tails, plus one
  `dis` or `lacks`; count and time recorded), README entries.

- [ ] Write the rule arguments; mark each `heuristic`.
- [ ] Write the fixtures; run fixtures.mjs: every class claim holds.
- [ ] Run exhaustive.mjs on the prototype: S, H, L, C1, C2 hold and
  `solvedViolates` 0 on every problem; record the count.
- [ ] Complete the ledger: every row backed, or listed for the user as
  "argument, not yet checked".
- [ ] Width check; commit; **gate: the user reviews the arguments, the
  ledger and the fixtures' texts, and authorizes Task 1.**

Size: about 250k tokens, one long session (4-5 h), most of it fixtures.

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

- [ ] Failing tests test/r005b-row.test.mjs (Domain level through
  output/): `recordRow` sorts tails and keeps repeats; flatten follows
  two bound tails and a chain of 10,000 without stack growth;
  `withoutLabels` and printing over `tails` of length 0 and 1 equal
  today's.
- [ ] Implement (splits first); verify; differential `--corpus all`:
  **0 differences** in every phase; commit.

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

- [ ] Failing tests test/r005b-parse.test.mjs and r005b-resolve.test.mjs:
  two and three tails in parameter, result, nested, declared-type and
  lambda-annotation positions; `where r disjoint s` alone and beside
  `lacks`; D8 written and through `Pair(...a, ...a)`; D9 at the second
  `r`; D3 with its hint for a body type under a signature without the
  fact, accepted with it and with an implying row (option A); a
  multi-tail signature reaching the Task 4 placeholder; effect rows
  still refuse a second tail.
- [ ] Implement; verify; differential: differences only in parse and
  resolve for sources with several record tails or `disjoint`
  constraints (all refused before), each classified; commit.

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

- [ ] Failing tests test/r005b-precedence.test.mjs: P1-P7 of design §1.6
  each asserting the "after" text, span and notes, and its fixture's
  `before` asserted against main in an isolated copy (the red log
  records all seven failing on main with exactly the `before` texts);
  the three controls (no clause: shape text before and after; two
  clauses: the first's note; a hole base's literal lack: shape text).
- [ ] Failing tests test/r005b-disjoint.test.mjs: `g(a: { ...r }, b: {
  ...s }): Int where r disjoint s` as `g(p, p)` over `{ ...t }` is D3';
  over `{ x: Int }` twice D2 with `first written here` at `arrivedAt`;
  a wrapper without the fact D3 with hint inside it, noted at g's
  clause; a wrapper with the fact refused at its caller, noted at the
  wrapper's clause; a decomposed lack keeps `Disjoint` (D2, not D1)
  unless a written `lacks` names the label (D1); `merge(p, p)` binds
  the meta pair to `{}` (self-apart); the property test of `prefer`.
- [ ] Implement; verify; differential: differences only P1-P7's class
  (shape text → D1) and sources using `disjoint`, each classified; L21
  checked (no existing expectation edited); commit.

Rows landing: `r005b-precedence`, `r005b-provenance`, `r005b-mixed-lacks`,
`r005b-self-apart`, `r005b-body-type`.

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

- [ ] Failing tests test/row-merge.test.mjs (level 1): the raw, dense
  and program-shaped generators ported from perm.mjs and
  programs-gen.mjs with seeds, each problem in five orders; S (the
  emitted solution satisfies every constraint), H (`Contradiction` ⇒
  no solution), L, C2; the step counter within the measure (L3) and
  fresh metas within `|Π|·|Κ|` (L4); the exhaustive one-tail domain
  equal to ADR 013's rules (L1) and the small multi-tail domain of
  Task 0. Problems that reach the Task 5 placeholder are counted.
- [ ] Failing tests test/r005b-unify.test.mjs: design §2.4 "forced by a
  fact" and "forced by a bound" (`both(merge, merge)`, `r005b-upper`);
  two holes against one; `{ ...r, ...s } ~ { ...s, ...r }` cancels;
  the lone meta pruned to `{}` by a written lack reports D1, not
  `Expected {}, found …` (R10.2, fixture `lone-meta-lack`).
- [ ] Implement; verify; differential: **0 differences** on existing
  sources (the §2.3 differential); commit.

Rows landing: `r005b-cancel`, `r005b-upper`, `r005b-mixed-tails`,
`r005b-apart-persist`, `r005b-pruned-reason`.

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

**Interfaces:** `type Pending = Equation & { residue ∷ Residue, seen ∷
Int, quiet ∷ Boolean }`; `drain ∷ Subst → Either Contradiction Subst`;
`endOfBody ∷ Subst → RowOutcome`.

- [ ] Failing tests test/r005b-pending.test.mjs: design §2.4 "resolved
  by a later argument" (`apply2(merge, { x: 1 }, { y: 2 })` accepted
  and prints 1, also with the arguments in the other order,
  `r005b-defer`); `apply0(merge)` is the Task 6 placeholder for D4
  (`r005b-pending-end`); quiet equations accepted (`h(merge × 12)`
  within a generous bound, `r005b-quiet`); the counterexample programs
  `odd-cycle` and `determinate` are `Unresolved` (placeholder text
  until Task 6); C1 and C3 join test/row-merge.test.mjs with C3's
  recorded ceiling.
- [ ] Failing tests test/r005b-both.test.mjs, **`r005b-both-annotation`**:
  `type Both(...r, ...s) = Both({ ...r, ...s }); fn example(): Both({
  x: Int }, { y: Int }) = Both({ x: 1, y: 2 });` is accepted and runs
  (also with the expected result met first); the unannotated `fn
  example(): Int = { let b = Both({ x: 1, y: 2 }); 0 };` is
  `Unresolved` at the argument (D4 text from Task 6).
- [ ] Failing tests test/r005b-nested.test.mjs: §2.6's `{ a: { ...?p,
  ...?q }, ...?r, ...?s } ~ { a: { x: Int, y: Int }, z: Int }` defers
  the inner equation once, at the outer site, reported once
  (`r005b-pending-dedup`, `r005b-nested-field`), and is solved when a
  later binding fixes `?p`.
- [ ] Failing tests test/r005b-settle.test.mjs: **rollback**, an
  equation deferred inside a postponed effect pair's label arguments is
  gone after the revert and deferred again at the retry with the pair's
  site (`r005b-settle-rollback`); **joint fixpoint**, both directions: a
  body whose effect retry unblocks a record equation is accepted, and
  one whose drain binds a meta a postponed pair waits on settles that
  pair (`r005b-end-fixpoint`); a `Fail` payload `{ ...?r, ...?s }`
  whose key waits reports the unresolved equation, not `Fail needs a
  concrete error family`.
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

- [ ] Failing tests test/r005b-fixtures.test.mjs enabled for every
  `diag-NN` and `diag-NN-fix` fixture (19 examples, exact text, span,
  notes, hint), `odd-cycle` and `determinate` (D4), `lone-meta-lack`,
  `diag-14` in both fact orders (L26), Example 19 with `{ z: 1 }` and
  `{ x: 1 }` (each names the right `merge`), and new fixtures
  `same-name-parts` (R3) and `participation-control` (R10.1's limit:
  an error whose responsible fact is not an equation keeps its own text
  although its meta took part in a solved equation), each pinned in
  Task 6's first commit and checked by fixtures.mjs before code.
- [ ] Failing test: an annotation that exposes a contradiction turns D4
  into the contradiction's text (Example 1 with `q: { x: Int }` is D2).
- [ ] Implement; verify; differential: 0 differences on existing
  sources; commit.

Rows landing: `r005b-drain-text`, `r005b-three-way`,
`r005b-drained-reason`, `r005b-participation`, `r005b-bound-reason`,
`r005b-part-identity`, `r005b-owner-written`.

Size: about 450k tokens, 7-8 h. Opus.

### Task 7: The merge literal, access, removal and rest binders

**Files:** Resolve/Record.purs (the second spread is no longer refused;
`SecondSpread` removed from Problem, Format/Diagnostic and Code after
the user confirms the withdrawal), Check/Extension.purs (198: extract
the overlap check to Check/Overlap.purs first; items in written order,
each spread's row joins the result's tails, `Spread` reasons for item
pairs, D2' immediate and late), Check/Removal.purs (design §5.2: one
requirement against `{ l1: α1, …, ...ρ }`, type `ρ`, never subtraction),
Check/RecordPattern.purs (206: extract the rest binder first) and
PatternRow.purs (the same for `{ l, ...rest }`), Check/Record `select`;
the Task 4 removal placeholder removed. Specialize keeps its
placeholder.

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
- [ ] Implement; verify; differential: differences only in sources with
  several spreads (refused before) and multi-tail removal or rest,
  classified; commit.

Size: about 300k tokens, 4-5 h. Opus.

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
| `r005b-mixed-lacks` | label/tail decomposition skipped | `{ id: Int, ...r }` merged with `{ ...s }` accepted without `s lacks { id }` | 3 |
| `r005b-self-apart` | `x # x` does not force `{}` | `merge(p, p)` over `{ ...r }` reaches `go build` with a field twice | 3 |
| `r005b-body-type` | Resolve.Lacking ignores tail pairs | a lambda annotated `{ ...r, ...s }` under a signature without the fact accepted | 3 |
| `r005b-mixed-tails` | tail/tail decomposition skipped | the same with the lack written, accepted without `r disjoint s` | 4 |
| `r005b-apart-persist` | a bound meta drops its apart pairs | `merge(merge(a, b), c)` with `a` and `c` sharing `x` accepted | 4 |
| `r005b-cancel` | common tails not cancelled | `{ ...r, ...s } ~ { ...s, ...r }` refused | 4 |
| `r005b-upper` | no upper bounds | `both(merge, merge)` unresolved | 4 |
| `r005b-pruned-reason` | U4's `{}` binding forgets the pruning fact (R10.2) | `granted({ admin: false })` (Tranche A's `granted`) reads a shape text such as `Expected {}, found { admin: Bool }` instead of D1 | 4 |
| `r005b-defer` | constants with several homes placed in the first home | `apply2(merge, { y: 2 }, { x: 1 })` refused | 5 |
| `r005b-quiet` | quiet equations expanded into the basis | `h(merge × 12)` exceeds its bound | 5 |
| `r005b-pending-dedup` | re-deferral appends | §2.6's nested equation reported twice | 5 |
| `r005b-pending-end` | pending equations dropped at the end | `apply0(merge)` accepted | 5 |
| `r005b-end-fixpoint` | no drain in the settle rounds | a body whose effect retry unblocks a record equation is unresolved | 5 |
| `r005b-settle-rollback` | the store kept outside the substitution | an equation deferred inside a postponed pair survives the revert | 5 |
| `r005b-nested-field` | a nested equation given the expression's site | §2.6's nested D4 at the inner expression | 5 |
| `r005b-both-annotation` | record-row arguments not unified before the drain, or the deferred equation dropped | §8's `example()` unresolved | 5 |
| `r005b-drain-text` | drain failures use Require's own text | `apply2(merge, { z: 1 }, { y: 2 })` reads `Expected { ..._ }, found { z: Int }` | 6 |
| `r005b-three-way` | an `Unresolved` outcome rendered through the contradiction path | Example 1 prints a D6 form | 6 |
| `r005b-drained-reason` | a drain binding loses its causal equation (R10.1) | Example 17 reads `Expected {}, found { z: Int }` | 6 |
| `r005b-participation` | every binding that took part in an equation reports D6 | fixture `participation-control` prints D6 | 6 |
| `r005b-bound-reason` | the last narrowing is named (R10.3) | Example 19 with `{ z: 1 }` notes the second `merge` | 6 |
| `r005b-part-identity` | parts deduplicated by printed name (R3) | fixture `same-name-parts` lists one part | 6 |
| `r005b-owner-written` | the owner's side printed through the substitution (R5) | Example 13 prints `{ x: Int, ..._ }`-style resolved rows | 6 |
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
| 7 literal, removal, rest | Opus | 300k, 4-5 h |
| 8 lowering, interpreter | Sonnet | 250k, 4 h |
| 9 generator, oracle level 2 | Opus | 300k, 4-5 h |
| 10 close-out | Sonnet | 200k, 3 h |

About 3.3M tokens and 50-60 hours of agent time, each task plus one
verify (12 min) and one differential (about 10 min).

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
- The SecondSpread withdrawal waits for the user (below); Task 7 cannot
  finish without it.

## Decisions needed from the user

1. **Authorize this plan and Task 0;** after Task 0, the gate (rule
   arguments, the completed ledger with any rows left as "argument,
   not yet checked", the fixtures' texts) before Task 1.
2. **Withdraw Tranche A's approved `A record literal accepts at most one
   spread`** in Task 7 (proposed here; draft 3 §13 slice 6 already says
   it retires). No case remains where it would apply.
3. **The rank of `Equated`**: last in the precedence, between two the
   earlier site (design §1.3, Proposed). R10.1-R10.3 as approved assume
   it.
4. **The counterexample programs' texts** (`odd-cycle`, `determinate`,
   above), derived from R1-R11; confirmed or corrected at the gate.
5. **docs/engineering.md's proposed evidence section** as a general
   rule (optional; this plan applies it either way).
