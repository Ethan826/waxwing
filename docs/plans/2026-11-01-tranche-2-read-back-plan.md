# Tranche 2: the effect read-back (implementation plan, 2026-11-01)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> subagent-plan-execution (recommended) or inline-plan-execution to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax
> for tracking.

Status (2026-11-01): **proposed; not authorized** (dossier §18.150:
the A2 acceptance authorizes neither this plan's implementation nor a
push). Stage A (Tasks 1-2) is design and measurement only and ends at
an approval gate; Stage B (Tasks 3-9) is specified at the interface
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
  Effects module or to Substitution.purs in this plan. A validator
  refusal of an honest package, or a disagreement between the
  validator and an independent checker, is a stop for the author,
  never fixed in a lane, and neither side is presumed correct
  (§18.145).
- No minting change: the G0-only `certify` keeps minting under F14;
  Task 16 is not part of this plan. Live compilation unchanged: the G0
  problem pin, first diagnostics and generated Go, the effect pin, and
  the census, window and RT8 fixtures stay byte-identical.
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
- Auxiliary effect variables without a live counterpart: **open**.
  Either refused (`NoCandidate`) or completed by row unification with
  scoped labels [Leijen 2005], **adapted**, as the type read-back
  completes auxiliaries by Robinson unification (ReadBack.purs step 2).
  Decided at Stage A's gate (question Q2).
- Hole numbering: A2 specification §2.4 (one numbering across sorts),
  **faithful**.
- Corpus differential against an independent checker: the A2 plan's
  M-B collector, **faithful**; extended from fixtures to corpus
  packages.

## Review Focus

- A recorded effect variable or position with no live counterpart must
  make the read-back return `NoCandidate` with the missing role named,
  never a guessed value (Task 3, test "unread role is NoCandidate").
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

- [ ] **Step 1:** for every corpus declaration the online strategy
  solves, list each recorded flexible effect variable by role and each
  recorded position by kind, with counts.
- [ ] **Step 2:** for each role and kind, find where today's checker
  holds its value (a node type's row at the path, an instantiation
  slot, a `Restricted` clause entry, a mark meta) by reading the
  checked declaration and `State` the online strategy already has;
  count the occurrences found and not found.
- [ ] **Step 3:** for each mark position, the live meta it reads and
  whether two positions share one (P2's classes, observed).
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

## Stage B: implementation (after Stage A's approval)

Interfaces below are proposed and change with the design.

### Task 3: effect rows read back by position

**Files:** Create src/Features/Check/Strategy/ReadBack/Effects.purs,
ReadBack/EffectRows.purs; test test/r0-t2-rows.test.mjs.

**Interfaces (proposed):**
```purescript
data ReadFault = Unread EVar | UnreadPosition Position | Clash EVar

readRows
  ∷ RecordedProblem → Checked.FunctionDecl → State
  → Either ReadFault (Map EVar PRow)
```

- [ ] Tests first: per role, a fixture declaration and the expected
  `PRow`; "unread role is NoCandidate"; "bare C keeps Fail's payload";
  a row read at a stage, an instantiation, a handler literal's R and C,
  an annotation C, `main`'s entry tail. RED, implement, GREEN, rows,
  commit.

### Task 4: mark terms as least terms

**Files:** Create ReadBack/Marks.purs; test test/r0-t2-marks.test.mjs;
oracle comparison test/r0-t2-marks-oracle.test.mjs.

**Interfaces (proposed):**
```purescript
leastTerms ∷ MarkStore t → Map Int Term     -- per live meta's class
readMarks
  ∷ RecordedProblem → State → Map Int Term
  → Either ReadFault (Map Position Term)
```

- [ ] Tests first: "shared meta, one term"; "Fail and Console read as
  N"; FX008's §7a trace (honest x = M); the rigid case `J {k}`; the
  oracle's three verdicts agree with `leastTerms` on its bounded
  families (bounded). Then label terms inside rows (Task 3's labels
  take the term of their meta). Commit.

### Task 5: holes and assembly

**Files:** Create ReadBack/Package.purs; modify ReadBack.purs (types
and rows keep today's values); test test/r0-t2-package.test.mjs.

**Interfaces (proposed):**
```purescript
readPackage
  ∷ RecordedProblem → Checked.FunctionDecl → State → Substitution
  → Either ReadFault EffectPackage
```

- [ ] Tests first: "effect and type holes never share a number";
  `types` and `rows` equal today's `unsettled` images converted to
  `PTy` (no new type value); no binding of a forced `ResultClauses`
  tail (spec §3). Commit.

### Task 6: the online certificate carries the package (Q3)

**Files:** modify Strategy/Online.purs (trusted; re-pin named in the
commit); test test/r0-t2-online.test.mjs.

- [ ] The certificate gains the package; nothing calls `validate` from
  the strategy, nothing mints. Tests: certificate field present on a
  solved fixture; live and pinned outputs unchanged (problem pin,
  first diagnostics, effect pin, census, shadow). Commit.

### Task 7: honest corpus packages through I3 and the validator

**Files:** test test/r0-t2-honest.serial.test.mjs; reporter
test/r0-t2-honest-report.mjs.

- [ ] For every corpus declaration the online strategy solves: the
  read-back outcome (package or `ReadFault` by role), I3's verdict, and
  `validate`'s verdict, tallied by kind. Assertions: no `Malformed` on
  an honest package; for every declaration today's `certify` accepts,
  `validate` accepts or the row is listed with its refusal (A1, U2).
  Any `Malformed`, or an unlisted refusal, is a stop. Records the
  A3 effect part (solved-form refusals on honest packages).

### Task 8: the owed compatibility checks

**Files:** modify test/r0-a2-properties.serial.test.mjs (or a sibling
under 250 lines).

- [ ] Spec §2.5 and §11, now on honest packages: `erase` of each
  honest package equals today's read-back σ by the canonical comparison
  (field order only); `erase`∘`settle` = `settled`∘`erase`; G0 accepts
  `erase P_c` whenever it accepts `erase (settle P_in)`; hole numerals
  with effect holes present. Each result corpus-observed.

### Task 9: the corpus differential

**Files:** test test/r0-t2-differential.serial.test.mjs; extends the
M-B collector (test tree only).

- [ ] On honest corpus packages and their forged variants (each mark
  raised or lowered one step, each label dropped or duplicated, each
  tail moved): the validator against the independent checker, both
  directions (spec §5's soundness direction on forged packages,
  completeness on least-term packages). Disagreements are stops.
  Packages compared by R-A semantic row equality where compared at
  all.

### Task 10: the activation gate (specification)

**Files:** Create docs/plans/2026-11-0X-a2-activation-gate.md; a gate
report script test/r0-t2-gate-report.mjs (reads Tasks 7-9's tallies;
gate-integrity: must-fail probes for each criterion).

- [ ] The conditions under which Task 16 may be proposed, each with
  the check that measures it, none of them a decision:
  1. Tasks 7-9 run on the whole corpus with no stop open.
  2. A1: every declaration today certifies is validated, or each
     exception is listed and ruled by the author.
  3. The C6 replacement-compatibility decision made by the author.
  4. BACKLOG R034 (2) (merged `EffectsUnchecked` kinds) and (10)
     (duplicate owners) landed.
  5. The census, window, RT8 and shadow dumps compared with the
     validator minting in a scratch build (r0-results-diff), every
     moved row listed.
  6. Performance qualification of the validator on the corpus,
     companion scan included (R034 (11)), reported separately.
  7. U4 and U6 stated as they stand; F14's retirement is the author's.

### Task 11: records, review, acceptance

- [ ] Records (statements status, spec §11 owed checks run or still
  owed, closure checklist, progress, findings), a whole-branch review
  (two Opus: read-back semantics; gates and pins), its fixes, one
  routine verify alone under the lock; performance reported separately.

## Estimate

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
