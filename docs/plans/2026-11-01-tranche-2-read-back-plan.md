# Tranche 2: the effect read-back (implementation plan, 2026-11-01)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> subagent-plan-execution (recommended) or inline-plan-execution to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax
> for tracking.

Status (2026-11-03): **resumed under §18.157: the four ForcedTail
refusals admitted to the pin (floors 2805 and 2813), the pin script's
`--explain` corrected, and Task 16 authorized; A2's Task 16 held.**
ForcedTail identifies dependency on the provisional forcing restriction,
not demonstrated causation (§18.157 (1)); these four losses join the
earlier forcing-loss evidence (stand-in runs: aroundBoth and k2f
refused, A2 validator plan Provenance V1a); neither list is
exhaustive. Before that: (2026-11-02) **Stage B stopped at Task 13 for
the author (§18.156).** Before that: (2026-11-01, later)
**Stage A complete (§18.154); Stage B
(Tasks 3-16 below) authorized with rulings, dossier §18.155; A2's Task
16, replacement, F14's retirement and pushing held.** Before that:
**Stage A (Tasks 1-2) authorized, dossier
§18.151, with its clarifications and the directions Q1 live graph, Q2
`NoCandidate` first, Q3 acceptable in principle; Stage B and Task 16
held; no push.** Then §18.152 (inventory stop) and §18.153 (trace,
not solver); Q2's "`NoCandidate` first" is realized as the design's one
routing, a read fault in `Certificate.effects`. Earlier: proposed, not
authorized (§18.150).
Stage A (Tasks 1-2) is design and measurement only and ends at an
approval gate; Stage B (Tasks 3-9) is specified at the interface
level and is rewritten in detail from Stage A's approved design before
it runs.

**Goal:** the online strategy produces an honest `EffectPackage` for
every declaration it solves, so that I3 and the validator run on honest
corpus packages, the deferred compatibility property and corpus
differential run, and the activation gate for Task 16 is specified.

**Architecture:** today's online strategy runs the live checker
(`recheck`) and reads its answer back to problem variables by position
(Strategy/ReadBack.purs). Tranche 2 extends the read-back, still
untrusted, to the effect side: effect-row bindings read from the live
checked declaration and checker state, mark terms computed as least
terms over today's mark graph (statements §5), holes numbered once. The
trusted validator (`Substitution.validate`, accepted §18.150) judges
the result and still mints nothing; Task 16 stays held.

**Tech Stack:** PureScript (purs, spago, purs-tidy), Node test runner
over the compiled output, the R0 corpus (998 programs, 3071
declarations with an effect problem).

**Spec:** the statements docs/plans/r0-amin-statements.md (§2 the
package and ownership, §5 least terms, §6 holes, §7 step 3 the online
read-back, §8 A1-A4, §11 U2-U4); the A2 specification
docs/plans/2026-10-31-a2-specification.md (§2 the package, §2.4
completion, §2.5 erasure and the compatibility property, §4 the
pipeline, §11 owed checks); dossier §18.148-§18.150; the A2 plan's
Task 16 (docs/plans/2026-10-31-a2-validator-plan.md).

**Verified premise** (observed by reading at 696fc92, not run):
- The online strategy is `recheck` plus `readBack`
  (Strategy/Online.purs header, imports); its `Certificate` carries
  `unsettled ∷ Substitution`, the checked declaration and holes, no
  effect data.
- The checked IR's types carry effect rows whose labels carry today's
  `Mark` (Domain/Type/Core.purs `TFun (Ty v) (TyRow v) (Ty v)`,
  `THandler`; Domain/Row.purs `Mark = NoFail | Plain | MarkVariable
  String | MarkMeta Int | Unmarked`).
- Today's mark graph is in the checker's substitution: `MarkStore {
  bindings ∷ Map Int Mark, edges ∷ Stack (MarkEdge t), fresh }`
  (Check/MarkStore.purs); clause rows are in `State.restricted`
  (Check/Restricted.purs `ClauseEntry`).
- The recorded side names effect variables `EffFresh Path ERole`
  (roles `EffInst`, `EffectOf`, `ResultClauses`, `HandlerInference`,
  `HandlerClauses`, `Clauses k`, `AnnotationClauses j k`, `Stage k`,
  `OpenedRow`, `EntryTail`) and positions `Frame`, `Literal`,
  `Opened`, `Annotation`, `Instantiated` (Domain/Recorded/Effect.purs).
Where each role's value lives in the live checker is **not** verified;
Task 1 measures it.

## Global Constraints

- AGENTS.md applies in full: maintained files at most 250 physical
  lines (about 100 targeted); .md/.mjs/.js/.wxw lines at most 80 code
  points (`node scripts/width.mjs` reports 0); `where`, never `let …
  in`; no anonymous lambdas; `maybe`/`maybe'`/`either` with named
  helpers; pinned purs-tidy; Domain.*/Features.*/Format.* pure; imports
  only to the same or an earlier layer.
- The read-back is untrusted search. New read-back modules live under
  Features.Check.Strategy.ReadBack, are not on the trusted-surface list,
  and never import Domain.Verdict.EffectPackage.Internal; they build
  the plain `EffectPackage` input type only. A defect in them may lose
  acceptances, never certify.
- The validator is frozen: no change to any Features.Check.Strategy.
  Effects module or to Substitution.purs in this plan, except Task 4's
  duplicate-entry record check (§18.155 (2)), after which it is frozen
  again. A validator
  refusal of an honest package, or a disagreement between the
  validator and an independent checker, is a stop for the author,
  never fixed in a lane, and neither side is presumed correct
  (§18.145).
- No minting change: the G0-only `certify` keeps minting under F14;
  the A2 plan's Task 16 is not part of this plan. Live compilation
  unchanged: the G0 problem pin, first diagnostics and generated Go,
  and the census, window and RT8 fixtures stay byte-identical; the
  effect pin moves only in Task 3, for exactly the 31 declarations
  with their contents verified (§18.155 (1)). Any other protected-pin
  movement is a stop.
- Inference never reads the trace (§18.155 (4)); a trace clash or a
  duplicate entry is kept and surfaces as a read fault, never resolved
  by overwriting or choosing (§18.155 (3)).
- Comparison rules (§18.150): the erased-substitution property uses
  test/r0-a2-canonical.mjs (record field order only, tails in order).
  Full effect packages are compared by R-A's semantic row equality:
  distinct keys commute; same-key occurrence order, multiplicity,
  arguments, marks and tails stay significant. No generic helper
  reorders arbitrary arrays.
- Evidence labels as the statements use them: observed (who ran it),
  bounded, fixture-level, reasoned, owed. No soundness claim anywhere.
  Corpus results are corpus-observed, never "for every program".
- Every new invariant gets a restored-defect regression row in
  scripts/regression-r0-t2-<lane>.mjs with its probe in
  test/regression-r0-t2-<lane>.mjs, spread into
  scripts/regression-r0.mjs by the controller.
- One `npm run verify` at a time (lock, anchored `pgrep`, clear
  .build/go-cache after); a failed run is investigated, never rerun for
  green. Stage explicit paths; no push; research probes as `.wxw.txt`.

## Provenance

- Positional read-back of types (T-R0b §5.3): existing, **faithful**
  to its design; extended to effect rows in Task 3, **adapted**: the
  role-to-live-location map is new. Approval: owed at Stage A's gate.
  Evidence: Task 1's inventory.
- Least mark terms over equality classes: statements §5, **derived**
  (universal argument given P1-P3, bounded oracle
  research/amin-mark-oracle/). Union-find [Tarjan 1975] for the
  classes, reachability over the edge graph for "reaches", least
  solution of atomic constraints in a finite lattice [Rehof and
  Mogensen 1999], **adapted** (lattice of N, `J S`, M). Approval:
  statements approved as a representation (535b780). Evidence: the
  oracle; P1 and P2 open (U6).
- Auxiliary effect variables without a live counterpart: **decided**
  (§18.151, §18.153): live-value tracing, no completion solver; a value
  the trace cannot read is a read fault (design note §C.6), never a
  completed binding. The design note's §G is the provenance table for
  Stage B.
- Hole numbering: A2 specification §2.4 (one numbering across sorts),
  **faithful**.
- Corpus differential against an independent checker: the A2 plan's
  M-B collector, **faithful**; extended from fixtures to corpus
  packages.

## Review Focus

- A recorded effect variable or position with no live counterpart
  gives a read fault naming the missing role, as `Left` in the
  certificate's `effects` field while G0 decides as today (design note
  §C.6, one routing), never a guessed value.
- Two positions sharing one live mark meta take the same least term
  (one term per class, statements P2); a per-position computation is
  the oracle's known mutant (Task 4, test "shared meta, one term").
- `Fail` labels carry N and `Console` labels N (statements §2); a
  read-back that copies today's `Plain` onto them is refused by I3
  (Task 4, test "Fail and Console read as N").
- An open live row tail becomes `PTailHole n` on the same numbering as
  type holes, one sort per hole number (Task 5, test "effect and type
  holes never share a number").
- An honest package the validator refuses for a declaration today
  accepts is a stop, reported with the refusal, never a test
  adjustment (Task 7, the A1 row's assertion).
- Clause rows (`HandlerClauses`, `AnnotationClauses`, `Clauses k`) may
  be read bare or full, as check (k) allows; a read-back that strips
  `Fail` payloads to nothing is refused (Task 3, test "bare C keeps
  Fail's payload").

---

## Stage A: design and measurement (no src change)

### Task 1: inventory of effect variables and positions

**Files:**
- Create: research/t2-read-back-inventory/inventory.mjs (a research
  script, not maintained code; reads the built output)
- Create: research/t2-read-back-inventory/README.md (the table)

- [ ] **Step 1:** the denominator (§18.151 (1)): every corpus
  declaration, split into live-checker refusal, online-search failure,
  existing certification and successful mapping. Within the mapped
  cohort, list each recorded flexible effect variable by role and each
  recorded position by kind, with counts; record-owned forced tails
  (`ResultClauses` in F) apart from package-owned inputs.
- [ ] **Step 2:** for each role and kind, find where today's checker
  holds its value (a node type's row at the path, an instantiation
  slot, a `Restricted` clause entry, a mark meta) by reading the
  checked declaration and `State` the online strategy already has;
  count the occurrences found and not found.
- [ ] **Step 3:** identity and sharing (§18.151 (2)): for each mark
  position, the live meta it reads and whether two positions share one
  (P2's classes, observed); for each effect variable, which occurrences
  must share a value and which stay distinct; how live rigid names map
  to recorded identities. Distinguishing examples for nested handlers,
  annotations, partial applications and entry tails.
- [ ] **Step 4:** record the table, the not-found counts by role and
  three example declarations per not-found role. Label all of it
  corpus-observed. Commit the README and script only.

### Task 2: read-back design, adversarial review, approval gate

**Files:**
- Create: docs/plans/2026-11-0X-tranche-2-read-back-design.md

- [ ] **Step 1:** write the design from Task 1's table: the source of
  every role and position; the least-term computation and the graph it
  reads (Q1); the rule for roles with no live value (Q2); label
  arguments and nested rows; hole numbering; the interfaces of Tasks
  3-9; the claims (honest package passes I3 for every declaration
  today accepts, U2) with the check backing each.
- [ ] **Step 1b:** a research implementation of the least-term
  calculation over the live graph (§18.151 (3); research tree only),
  compared with the bounded mark oracle and on the corpus.
- [ ] **Step 2:** run adversarial-procedure-review on the least-term
  computation and the role map: restrictions table, soundness and
  completeness passes, distinguishing examples, the bounded mark oracle
  re-run against the implementation's algorithm. Record the report.
- [ ] **Step 3:** **stop for the author.** Questions:
  - Q1. Honest marks from today's live mark graph (statements U2:
    "least mark terms from today's mark graph"; P2 maps metas to
    classes) or from the recorded graph? Recommended: live, as U2 says;
    the recorded graph is the validator's, and computing from it would
    make the differential circular.
  - Q2. A role with no live counterpart: `NoCandidate`, or completion by
    row unification? Recommended: `NoCandidate` first, completion only
    for roles Task 1 shows are frequent.
  - Q3. Online's `Certificate` gains the package before Task 16 (a
    change to a trusted module's surface, non-minting)? Recommended:
    yes, as `effects ∷ Either ReadFault EffectPackage`.
  Stage B is rewritten in detail from the approved design.

## Stage B: implementation (authorized, dossier §18.155)

The design note docs/plans/2026-11-01-tranche-2-read-back-design.md
(revision 3) is this stage's specification: each task names the
sections it implements, and its exact values (keys, counts, test
programs) are there. §18.155's rulings bind every task and win over
the design where they differ. Stage B's first draft (Tasks 3-11 as
proposed before Stage A) is superseded and kept in git history.
Production changes are marked [P]; pin or trusted-surface changes
[pin]. Every task is test-first with RED shown, and every new
invariant gets its restored-defect row in
scripts/regression-r0-t2-<lane>.mjs with its probe in
test/regression-r0-t2-<lane>.mjs. Stops (§18.155): a semantic
amendment beyond the rulings, unexpected protected-pin movement, an
unexplained compatibility failure, a differential disagreement.

### Task 3: the generation correction and its effect re-pin [P][pin]

Design §B.2-§B.4, Task 3a. Ruling §18.155 (1).
**Files:** src/Features/Check/Generate/Marked.purs (`lambdaAmbient`),
Generate/Context.purs (`implicit`), Generate/Body.purs,
Generate/Control.purs (`parameterAt`: record the renamed annotation,
mint the unrenamed one); test test/r0-t2-annotation-row.test.mjs;
rows scripts/regression-r0-t2-generation.mjs.
- [ ] Tests first: the six distinguishing cases of design §B.4
  (implicit versus explicit rows, closed rows, nested lambdas, sibling
  annotations, an annotation's own clause row unchanged);
  test/r0-marked-corpus.serial.test.mjs passes unchanged.
- [ ] Re-pin scripts/trusted-surface.json for the four modules (named
  in the commit). Re-pin test/fixtures/r0/effects.json: exactly the 31
  keys of design §B.3 move. **Contents verified:** a committed check
  (test or script under test/) decodes each moved declaration's effect
  problem before and after and shows the only difference is the
  implicit annotation tail, `EffRigid ι` to `EffFresh p EffectOf`, at
  the annotation's places (`AnnotationAt`, the parameter's local, the
  lambda's node type), with `flexEff` unchanged. The G0 problem pin
  (test/fixtures/r0/problems.json) does not move.
- [ ] Rows: restoring `EffRigid` for the implicit tail fails; minting
  from the renamed annotation (the double mint) fails
  test/r0-marked-corpus's "minted twice".

### Task 4: duplicate declaration entries are a record defect [P][pin]

Ruling §18.155 (2): the one exception to the validator freeze.
**Files:** src/Features/Check/Strategy/Effects/Record.purs and, if the
check needs its own module, a new Effects/RecordDuplicates.purs
(trusted; AGENTS.md list, structure lists, trusted-surface re-pin);
spec docs/plans/2026-10-31-a2-specification.md §4.1 and §5 item 1;
test test/r0-a2-record-duplicates.test.mjs; row in
scripts/regression-r0-a2-record-duplicates.mjs (spread into a2Rows).
- [ ] Controller ruling: a new record check, index 6, "declaration
  lists without repeats": a repeated entry in `flexEff` or `positions`
  is reported once as `InRecord { table: InDeclaredLists, path:
  Nothing }` with check 6, a new `RecordTable` constructor placed after
  `InDeclarations` and before `InCoverage`; the check reads the lists
  before any conversion to a set.
- [ ] Tests: a repeated `flexEff` entry and a repeated `positions`
  entry each give the defect; the same variable referenced many times
  across types and obligations, listed once, gives none (the
  distinction); the corpus record test stays at 0 defects.
- [ ] Row: the check dropped (or the list converted to a set first)
  fails. Then the validator is frozen again (ledger line).

### Task 5: hole numbering exported [P]

Design §C.3, Task 3b. **Files:** src/Features/Check/Holes.purs
(`numbering`, `holes` through it; review-required lowering boundary,
token review). Tests: `holes` byte-identical on the corpus (existing
pins pass); "numbering is first occurrence".

### Task 6: the trace [P]

Design §C.1-§C.6 (with §C.6's corrected `recordApplied ∷ Span → Span →
TyRow Open → Trace → Trace` and its (span, argument span) key), Task
3c. Ruling §18.155 (3), (4). **Files:** create
src/Features/Check/Trace.purs (constructor unexported); modify
Check/Scheme.purs, Check/DeclarationUse.purs, Check/Use.purs,
Check/Operation.purs, Check/Apply.purs, Check/Function.purs (`recheck`
returns `trace ∷ Traced`); test test/r0-t2-trace.test.mjs.
- [ ] Fail-closed: entries under one key are kept as an array in
  arrival order; nothing overwrites or chooses; a clash surfaces at
  read-back (Task 8), never here.
- [ ] Tests: design Task 3c's list (instance metas, dropped stages,
  applied rows keyed by argument on over-applied.wxw.txt's three
  cases, pipe rows keyed by the left operand, trace metas renumbered
  with the body, extension numbers after the body's).

### Task 7: trace gates, inertness and collection cost [P]

Design Task 3d, review M4, M5. **Files:** scripts/structure-*.mjs (the
scan), test/r0-t2-trace-inert.serial.test.mjs, rows.
- [ ] Scan: Trace's constructor unexported; no `Eq`, `Ord`, `Show` or
  `Generic` instance on `Trace`; `finish` imported only by
  Check/Function; no inference module reads the trace.
- [ ] Inertness (production counterpart of H3): `recheck`'s checked
  declaration and `State` less `trace`, the problem pin, first
  diagnostics with Go, the effect pin (after Task 3), census, window,
  RT8 and shadow fixtures byte-identical.
- [ ] Cost (§18.155 (4)): compile time and peak memory with and without
  collection on the corpus, measured by a script under scripts/ or
  research/, reported apart from functional acceptance and not gated.

### Task 8: effect rows read back

Design §C.1-§C.2, §D, Task 4. Ruling §18.155 (8). **Files:** create
src/Features/Check/Strategy/ReadBack/EffectRows.purs,
ReadBack/EffectSites.purs; test test/r0-t2-rows.test.mjs.
```purescript
readRows
  ∷ RecordedProblem → Checked.FunctionDecl → Traced
  → Either ReadFault (Map EVar PRow)
```
- [ ] Tests: one per role and site (design Task 4's list, show and
  crash stages on the effectful examples/builtins.wxw.txt included);
  "unread role is a read fault"; "two trace entries under one key are
  a `Clash`"; "located and traced disagree is `Apart`"; "bare C keeps
  Fail's payload"; applied and piped rows read as the consumed row.

### Task 9: mark terms as least terms

Design §E, §F, Task 5. **Files:** create ReadBack/Marks.purs
(`leastTerms ∷ MarkStore t → Map Int Term`, `readMarks`); tests
test/r0-t2-marks.test.mjs, test/r0-t2-marks-oracle.test.mjs.
- [ ] Tests: shared meta one term; Fail and Console read as N, payload
  and effect identity kept (§18.153 (4)); an unconstrained meta reads
  N; FX008's §7a trace; `J {k}`; agreement with the bounded oracle's
  families (bounded, labelled so).

### Task 10: type images as `PTy`

Design §C.8, Task 6a. Ruling §18.155 (6). **Files:** create
ReadBack/Images.purs (`readImage ∷ MarkTerms → Ty Open → Either
ReadFault PTy`); test test/r0-t2-images.test.mjs with design Task 6a's
tests, the f05-print-key record-row field and the two `UnreadImage`
declarations by name.

### Task 11: holes and assembly

Design §C.7, Task 6. Ruling §18.155 (3). **Files:** create
ReadBack/Package.purs (`readEffects`, design Task 6's signature);
ReadBack.purs gains `holeBindings`.
- [ ] Numbering tests across the complete package: shared identities
  (one live meta, one hole number in every map that reads it),
  distinct identities (two metas, two numbers), sort separation (no
  hole number used at two sorts), extension holes after the body's in
  the stated order; "a hole θ binds reads bound on both sides"
  (planted θ); "erased types equal today's unsettled"; no forced
  binding; `Declined` for an `Unsupported` problem.

### Task 12: the online certificate carries the package [P]

Design §C.6, Task 7. Ruling §18.155 (4), (5). **Files:**
src/Features/Check/Strategy/Online.purs (`Certificate.effects ∷
Either ReadFault EffectPackage`); test test/r0-t2-online.test.mjs.
- [ ] Tests: field present on a solved fixture; a read fault keeps the
  candidate and G0's verdict; nothing reports a read fault as effect
  validation; Online imports no Effects.Validate or Complete (scan);
  protected pins unchanged.

### Task 13: honest packages through I3 and the validator

Design Task 8. Ruling §18.155 (7), (8). **Files:**
test/r0-t2-honest.serial.test.mjs, test/r0-t2-honest-report.mjs, pin
test/fixtures/r0/t2-honest.json and its reviewed pin script.
- [ ] Both denominators (corpus loader; effect pin's sources).
- [ ] The pin may be initialized from the first run only if list (a)
  is exactly the unsupported declarations and the two `UnreadImage`
  declarations, and list (b) holds at most the three
  `RequirementUnjudged` candidates, each with the same G0 refusal
  confirmed individually. Floors (c) derive from those lists and the
  denominators. Anything else (a `Malformed`, another read fault, an
  unexpected refusal) is a stop; no floor lowered, no exception added.
- [ ] Assertions both ways, must-fail probes (extra refusal, removed
  entry, floor minus one), the 11 annotation declarations validated
  (H2 observed or a stop). Observed (§18.157 (2)): the 11 validate;
  with the defect restored ten refuse at the reported checks (nine at
  `Consumed` `InstallR` check 0, one `RigidExact`), not at E1.
- [ ] Ruling (8)'s test: every dropped partial-stage row is traced
  unconstrained, settles empty, and its consumption obligation passes;
  the result names its scope (those stages only).

### Task 14: the owed compatibility checks

Design Task 9; spec §2.5, §11. On honest packages: `erase` equals
today's σ by test/r0-a2-canonical.mjs; erase∘settle = settled∘erase;
G0 monotonicity; effect-hole numerals. Corpus-observed, each labelled.

### Task 15: the corpus differential, marks only

Design Task 10, §F; §18.151, §18.155. M-B collector on honest packages
and mark forgeries only, labelled "marks only"; row forgeries are not
run as differential evidence. Any disagreement is a stop.

### Task 16: activation gate, records, review, acceptance

This plan's Task 16 (the A2 plan's Task 16, the minting switch, stays
held). Create docs/plans/2026-11-0X-a2-activation-gate.md (the gate's
criteria, each with the check that measures it; none a decision) and a
gate report script with must-fail probes; records (statements and spec
status, design status, closure checklist, progress, findings,
BACKLOG); two whole-branch reviews (read-back semantics; gates, pins,
live), their fixes; one routine verify alone under the lock;
performance and collection cost reported separately.

## Estimate

Stage B (§18.155): design note §I's 4.4-6.0M plus Task 4 (about
0.25M) and the controller's 0.5-0.8M; about 4.9-6.8M with
coordination, an estimate, not a cap. The table below is the
pre-Stage-A estimate, kept as a record.

From the A2 stage's history (implementer 0.25-0.33M, task review
0.10-0.20M, fix round 0.08-0.21M, whole-branch reviewer 0.16-0.28M):

| Part | Dispatches | Tokens | Wall clock |
|---|---|---|---|
| Stage A (Tasks 1-2, adversarial review) | 5 | 0.7-1.0M | 4-6 h, then the author |
| Stage B (Tasks 3-9) | 21 | 3.0-4.0M | 12-16 h |
| Tasks 10-11, reviews, verify | 6 | 0.8-1.1M | 4 h |
| Controller | — | 0.5-0.8M | — |
| **All in** | **32** | **5.0-6.9M** | **20-26 h** |

Runs over if Task 1 shows many roles without a live counterpart (Q2's
completion becomes its own task), if P2 fails on the corpus (two
classes for one meta, a statements question), or if Task 7 stops on
honest refusals.

## Self-review

Spec coverage: statements §7 step 3 (Tasks 3-5), §5 least terms
(Task 4), §6 holes (Task 5), §8 A1-A3 (Tasks 7-8), §11 U2 (Task 7), U4
stated (Task 10); A2 spec §2.5 and §11 owed checks (Task 8), the
corpus differential (Task 9); §18.150's comparison rule (Global
Constraints, Task 9); the activation gate (Task 10). Not covered, by
design: U6/P1 (generation's coverage; Task 10 states it), Task 16.
Stage B's steps are deliberately coarser than an executable plan: they
are rewritten after Stage A, and no Stage B task runs from this text.
