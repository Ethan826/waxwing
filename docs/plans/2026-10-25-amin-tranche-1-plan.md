# a-min tranche 1: generation records the effect problem (implementation plan, 2026-10-25)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> subagent-plan-execution (recommended) or inline-plan-execution to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax
> for tracking.

Status (2026-10-31): **tranche 1 accepted (§18.138): every task done,
Tasks 7-14 accepted; functional acceptance passed at 4ca1097,
performance qualification not run; coverage 18 fixture, 13
unfinished; no validator, no effect-soundness claim.** Earlier:
**Checkpoint A (Tasks 1-5) done, §18.98. Checkpoint B
(Tasks 15, 6, 17, 16, verify, one review) authorized, §18.99. Tasks
7-14 held.** The author
accepted the scope (dossier §18.96) and asked for this plan and the A2
options note (docs/plans/2026-10-25-amin-a2-options.md) for review.

**Goal:** the shadow generator records each declaration's effect
problem as the approved a-min statements describe it, with no change
to live compilation and no handler declaration certifiable.

**Architecture:** a separate `effects` record in `Fields`, built by a
marked layer that runs beside the existing effect-erased one: every
generated node carries a marked type (`MTy`) next to its `GenTy`, and
rules emit effect items through `Out` as they emit atoms. Atoms, the
problem pin and G0's input stay byte-identical; `Outside` markers stay;
only Decide's rule 1 reads the new record (FX032 → `EffectsUnchecked`).

**Tech stack:** PureScript 0.15.16, spago 1.0.4, purs-tidy 0.11.1,
node test runner; Go 1.26.4 for the live preservation checks.

**Spec:** docs/plans/r0-amin-statements.md, approved as a
representation at 535b780: §2 (package, "What generation records"),
§4 (E1-E12, Definitions 4.1-4.2), §9, §10, §12.2, §13. Scope and
requirements: docs/plans/2026-10-25-amin-tranche-1-proposal.md and
the author's conditions in dossier §18.96.

## Global Constraints

- AGENTS.md applies in full: maintained files at most 250 physical
  lines; .md/.mjs/.js/.wxw lines at most 80 code points
  (`node scripts/width.mjs` reports 0); `where`, never `let … in`; no
  anonymous lambdas; `maybe`/`either` with named helpers; pinned
  purs-tidy; Domain.*/Features.*/Format.* pure.
- Every Features.Check.Generate* module and Domain.Recorded.Internal is
  trusted surface: each diff gets token review, and export changes are
  re-pinned with `node scripts/trusted-surface-pin.mjs` in the same
  commit, the pin diff named in the commit message.
- Live compilation unchanged: what compiles, the first diagnostic and
  the generated Go text, for every program (checked on the pinned
  corpus, see "Preservation checks").
- Generation reads no checker state (T10 in test/r0-elab-rules.test.mjs
  stays green; no Features.Check.* checker import from Generate*).
- `Outside HandlerType`, `Deferred`, `FailFamily` and `EffectArgument`
  markers are emitted exactly as today.
- Every new test is shown failing with its defect restored, in an
  isolated copy (a regression proof registered as today's are).
- One `npm run verify` at a time: `mkdir $CLAUDE_JOB_DIR/tmp/verify.lock`
  first, anchored `pgrep -f "^node scripts/verify.mjs"`, clear
  .build/go-cache after.
- Stage explicit paths; no push; research probes as `.wxw.txt`.
- Gate changes need the author: an allowlist entry, a re-pinned
  fixture or a widened structure rule is named in the task and in the
  commit message, never folded in silently.

## Provenance

- Marked translation of written types: a structural map over
  Domain.Type's `Ty` (the existing Translate.purs walk, extended);
  standard, faithful to Translate.purs.
- H′, the ResultC tail rule (`occurs` over parameters, the callee's
  row and the result without R's tail): invented (FX033 repair on main
  at 6b4be77; statements E4′). Approval: the representation approval
  (535b780, §18.95) and FX033's landing. Evidence: Review 2's nine
  channels refused (observed). RC′ stays open; generation records the
  choice and claims nothing about it.
- Annotation C with a fresh tail: FX008 §3.4 design (review M5).
- Occurs check: standard syntactic occurrence fold; faithful.
- No validator algorithm in this tranche (A2 is the author's choice).

## Review Focus

1. H′'s cases: x1 (variable in the result outside R's tail → R's tail)
   against r1 (only as R's tail → fresh `ResultClauses`). Task 4.
2. An annotation C's tail is fresh even when R is closed or rigid (F6).
   Task 4.
3. O1 and O2 are recorded; with either removed, §12.1's programs lose
   their equation. Task 7.
4. A handler declaration is never Solved, with or without recorded
   obligations. Tasks 5 and 12.
5. Marked and erased layers agree: erasing every node's `MTy` gives the
   type its atoms use, corpus-wide. Task 4.

## Preservation checks (named, with what each covers)

| Check | Covers | Does not cover |
|---|---|---|
| test/r0-first-diagnostic.serial.test.mjs | every pinned-corpus program: SHA-256 of accepted Go text, wired first diagnostic of rejected | programs outside the pinned corpus |
| test/r0-verdict.test.mjs, "the CLI reaches the R0 types only through the driver" | from Program.Main, no generation, checking or strategy module reachable; only listed data modules | behaviour of the reachable data modules |
| test/r0-problem-pin.serial.test.mjs | every corpus declaration's atoms, byte for byte (G0 sees the same problem) | the new `effects` record (Task 14 pins it separately) |
| test/compiler.test.mjs | examples/ run through the CLI and Go | — |

The verified boundary statement: generation is **unreachable from live
compilation** (r0-verdict's graph walk from Program.Main). It is
imported by Decide/Shadow.purs and Strategy/Online.purs, both shadow.

## File structure

| File | Responsibility |
|---|---|
| src/Domain/Recorded/Effect.purs (create) | data only: `EVar`, `ERole`, `Fixed`, `Position`, `MarkRef`, `MTy`, `MRow`, `MLabel`, `SiteKind`, `Obligation`, `UnsupportedKind`, `EffectProblem`, `emptyEffects` |
| src/Domain/Recorded/Internal.purs | `Fields += effects ∷ EffectProblem` |
| src/Domain/Verdict.purs | `Unsupport += EffectsUnchecked (Array UnsupportedKind)` |
| src/Features/Check/Generate/Out.purs, Assemble.purs | `Out += effects ∷ Array EffectItem`; assembly into `EffectProblem` |
| src/Features/Check/Generate/Marked.purs (create) | `marked`: written type to `MTy` under a `MarkNaming` |
| src/Features/Check/Generate/Owned.purs (create) | `resultClauses` (H′), `annotationClauses` (F6) |
| src/Features/Check/Generate/Node.purs | `Generated`, `Ruled` gain `marked ∷ MTy` |
| src/Features/Check/Generate/Obligation.purs (create) | emit helpers: `equalAt`, `consumeAt`, `ambientAt` |
| Generate rule modules (Signature, Callee, Call, Operator, Control, Block, Effect, Failure, Record, Update, Builtin, Pattern, Expr, Body) | each rule's marked type and obligations |
| src/Domain/Resolved/Core.purs, src/Features/Resolve/Effect.purs | `OperationInfo += effects ∷ Maybe (TyRow VarId)` (data; live reads none) |
| src/Features/Check/Decide/Reason.purs | rule 1 reads `Unsupported` obligations |
| test/r0-effects-canonical.mjs (create) | canonical JSON of `EffectProblem` |
| test/fixtures/r0/effects.json (create) | the effect pin |
| tests named per task | below |

## Tasks

### Task 1: effect-problem types, recorded empty

**Files:** create src/Domain/Recorded/Effect.purs; modify
src/Domain/Recorded/Internal.purs, src/Domain/Verdict.purs,
src/Features/Check/Generate/Out.purs, Assemble.purs,
scripts/trusted-surface.json, test/r0-verdict.test.mjs (allowlist,
**author approval**); create test/r0-effects-types.test.mjs,
test/r0-effects-canonical.mjs.

**Interfaces (produces):**
```purescript
data EVar = EffRigid VarId | EffFresh Path ERole
data ERole = EffInst VarId | EffectOf | ResultClauses | HandlerInference
  | HandlerClauses | Clauses Int | AnnotationClauses Int Int | Stage Int
data Fixed = FixedN | FixedM | FixedRigid String
data Position = Frame Path | Literal Path | Opened Path
  | Annotation Path Int Int | Instantiated Path String
-- AnnotationClauses j k: parameter j's annotation, k-th eligible
-- handler occurrence in it (pre-order). Annotation p j n: parameter
-- j's annotation, n-th unwritten mark in it (pre-order, R's and every
-- C's marks counted once each).
data MarkRef = Written Fixed | At Position
type MLabel = { effect ∷ EffectRef, args ∷ Array MTy, mark ∷ MarkRef }
type MRow = { labels ∷ Array MLabel, tail ∷ Maybe EVar }
data MTy = MBase Base | MVar Var | MArrow MTy MRow MTy
  | MRecord (Array (Tuple String MTy)) (Array Var)
  | MData TypeId (Array MTy) (Array MRow)
  | MHandler MLabel { inference ∷ MRow, clauses ∷ Maybe MRow }
data SiteKind = AtCall | AtPerform | AtApply | AtPipe
  | AtStage Int | AtCallback | AtDefer | AtInstalledC | AtDeferredRow
  | ClauseIntoR Int | ClauseIntoC Int | InstallR
data UnsupportedKind = OperationWithRow EffectId Int
data Obligation
  = Equal MTy MTy
  | Consume { site ∷ SiteKind, source ∷ MRow, target ∷ MRow
            , marks ∷ Boolean, bare ∷ Boolean }
  | HandlerLit { m ∷ Position, inference ∷ EVar, clauses ∷ EVar
               , clauseRows ∷ Array EVar }
  | Install { frame ∷ Position, handler ∷ MTy, ambient ∷ MRow }
  | Defer { row ∷ EVar, enclosing ∷ MRow }
  | Entry MRow
  | FailConcrete MTy
  | Unsupported UnsupportedKind
type EffectProblem =
  { obligations ∷ Array (Entry Obligation)
  , nodes ∷ Map Path MTy   -- each node's marked type (beside `types`)
  , instances ∷ Map Path MTy
  , annotations ∷ Map Path MTy
  , rigidMarks ∷ Array String
  , effectRigids ∷ Array VarId
  , arities ∷ Map Path Int
  , ambient ∷ Map Path MRow
  , flexEff ∷ Array EVar
  , positions ∷ Array Position
  }
emptyEffects ∷ EffectProblem
```
`ResultClauses` names `⟨p, result clauses⟩` (A2 input 2), `flexEff`
and `positions` are A2 inputs 3-4, `SiteKind` input 1. If the author
rules an input out, drop its field here.

- [ ] **Step 1: failing tests** `test/r0-effects-types.test.mjs`:
  "emptyEffects is empty" (`emptyEffects` encodes, through
  r0-effects-canonical, to `{obligations: [], instances: [],
  annotations: [], nodes: [], rigidMarks: [], effectRigids: [],
  arities: [], ambient: [], flexEff: [], positions: []}`); "every
  generated declaration carries an effects record" (for each
  declaration of `examples/services.wxw`, `fields(problem).effects` has
  exactly those ten keys; contents not asserted, so later tasks never
  weaken it).
- [ ] **Step 2:** run `node --test test/r0-effects-types.test.mjs`;
  expected FAIL (`effects` undefined).
- [ ] **Step 3:** add the types; `Fields.effects`; `Out.effects ∷
  Array EffectItem` (Generate/Out.purs: `data EffectItem = Obliged
  (Entry Obligation) | NodeAt Path MTy | InstanceAt Path MTy |
  AnnotationAt Path MTy | RigidMark String | EffectRigid VarId |
  ArityAt Path Int | AmbientAt Path MRow | MintedVar EVar |
  MintedPosition Position`) with `concatOut` and `noOut` extended;
  `assemble` folds items into `EffectProblem` (empty while no rule
  emits). `Unsupport += EffectsUnchecked (Array UnsupportedKind)`.
- [ ] **Step 4:** the allowlist in test/r0-verdict.test.mjs gains
  `Domain.Recorded.Effect` (plain data, as Domain.Recorded.Atom;
  approved by the author, §18.97, on condition that it grants no
  generation or checking reachability), and a new assertion that its
  imports are Prelude, Data.* and Domain.* only (so a later import of a
  Features.* module fails the gate); re-pin the trusted
  surface; `npm run build`; the new test and test/r0-verdict.test.mjs
  pass; test/r0-problem-pin.serial.test.mjs passes unchanged.
- [ ] **Step 5: commit** the listed files.

### Task 2: marked translation of written types

**Files:** create src/Features/Check/Generate/Marked.purs,
test/r0-marked.test.mjs.

**Interfaces:** produces
```purescript
data MarkNaming = Declared
  | AtUse Path                              -- instance at path p
  | InAnnotation Path Int                   -- parameter index j
marked ∷ Tables → MarkNaming → Ty VarId → Either GenerationFault MTy
```
Rules (statements §2, §3): `Declared` keeps a declared effect-row
variable as `EffRigid`, written marks `Written` (`nofail` N, plain M,
`nofail(k)` `FixedRigid k`); `AtUse p` names type and record-row
variables `FreshVar p (Inst v)`, as Fresh.purs `instances` names them
(the recorded atoms' names, so Task 3's erasure test can compare), and
makes each effect-row variable
`EffFresh p (EffInst v)` and each `nofail(k)` `At (Instantiated p k)`,
one position per k across the whole signature (T2-c); an unwritten
annotation mark is `At (Annotation p j n)` (Task 1's comment); a
Console label is always `Written FixedN` (T3-e). C is absent here
(Task 4 adds owned Cs).

- [ ] **Step 1: failing tests**, each over a resolved signature:
  "Declared keeps rigid rows and written marks"
  (`fn f(g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log`:
  both labels `FixedRigid "k"`, tails `EffRigid`); "AtUse shares one
  position per k" (the same signature at path p: both labels
  `At (Instantiated p "k")`, tails `EffFresh p (EffInst v)` with one v);
  "Console is N" (`nofail(k) Console` → `Written FixedN`).
- [ ] **Step 2:** run; expected FAIL (module absent).
- [ ] **Step 3:** implement `marked` beside Translate.purs's walk
  (same arrow-spine loop, Generate.Elab.Stages).
- [ ] **Step 4:** run; PASS. Re-pin the trusted surface.
- [ ] **Step 5: commit.**

### Task 3: every node's marked type, outside handler constructs

**Files:** Node.purs (`Generated`, `Ruled` += `marked ∷ MTy`);
Signature, Callee, Call, Operator, Control (match only), Block,
Record, Update, Builtin, Pattern, Expr, Body; create
test/r0-marked-corpus.serial.test.mjs.

**Interfaces:** consumes `marked`; produces `marked` on every node.
A node whose type the rule builds (an arrow, a record) builds its
`MTy` with a fresh `EffFresh p Stage k` where today's `arrowOf` puts
`closedRow`; a variable's node takes the local's `MTy` from
`Context.locals` (now `{ ty, marked }`). Lambda, handler, `with`,
`handle` and `fail` nodes get an `MTy` whose erasure is right and
whose effect rows are closed placeholders; Task 4 replaces them (the
erasure test cannot see the difference, Task 4's tests can).
Signature.purs records `rigidMarks` (the declaration's `nofail(k)`
names) and `effectRigids` (its effect-row variables).

- [ ] **Step 1: failing test** "erasing every node's marked type gives
  its recorded type": over the pinned corpus, for each node path p,
  `erase(marked(p))` (drop marks, clauses and effect rows) equals
  `types(p)` from the recorded problem (canonical form). Report the
  first ten mismatches.
- [ ] **Step 2:** run; FAIL (`marked` absent).
- [ ] **Step 3:** thread `marked` through the listed rules.
- [ ] **Step 4:** run; PASS; problem pin unchanged; T10 green.
  Node marked types are recorded in `effects.nodes` (`NodeAt`), which
  the test reads; a node's type variables are named as
  Generate/Elab/Recorded.purs names them in `types`.
- [ ] **Step 5: commit.**

### Task 4: lambdas, handler constructs, instances and annotations

**Files:** Control.purs (lambda), Effect.purs (perform, handler,
with), Failure.purs (handle, fail), Callee.purs (instances); create
src/Features/Check/Generate/Owned.purs; extend
test/r0-marked-corpus.serial.test.mjs; create
test/r0-owned-clauses.test.mjs.

**Interfaces:** produces
```purescript
resultClauses ∷ Path → MTy → MTy   -- instance type, ResultC added (H′)
annotationClauses ∷ Path → Int → MTy → MTy  -- param j; owned Cs (F6)
```
`resultClauses`: when the instantiated result is a top-level
`MHandler`, C = R's labels bare (no arguments; `Fail` keeps its
payload head), R's marks, tail R's tail variable when it occurs in a
parameter, in the callee's own row, or in the result with R's tail
dropped; else `EffFresh p ResultClauses`; closed when R is closed.
`annotationClauses`: every handler type not inside another's rows gets
C with R's labels bare, marks `At (Annotation p j n)` distinct from
R's, tail `EffFresh p (AnnotationClauses j k)`, k the occurrence's
pre-order index among the annotation's eligible handler types, so two
sibling handler types never share a tail. The lambda's effect row
is `EffFresh p EffectOf`; instances go to `effects.instances` at the
use's path, annotations to `effects.annotations`. `assemble` collects
every `EffFresh` minted into `flexEff`.

- [ ] **Step 1: failing tests** (statements §12.2, F3 and F6 rows):
  "ResultC tail, five cases" — parameter occurrence, callee row, result
  outside R's tail (FX033's x1), only R's tail (r1), R closed: recorded
  tails R's, R's, R's, `EffFresh p ResultClauses`, closed; "annotation
  C below the top" (`fn(f: Unit -> Handler(nofail Ask with Log))`: the
  arrow result's handler type owns C with label `Log` bare, tail
  `AnnotationClauses 0 0`); "annotation C tail fresh with closed R";
  "sibling handler types get distinct C tails" (`fn(f:
  Handler(nofail Ask with Log) -> Handler(nofail Tick with Log))`:
  tails `AnnotationClauses 0 0` and `AnnotationClauses 0 1`, distinct);
  "no position or effect variable minted twice" (the minted lists'
  lengths equal their set sizes, checked before any set comparison).
  Corpus test extended to lambda, handler, `with`, `handle` nodes.
- [ ] **Step 2:** run; FAIL.
- [ ] **Step 3:** implement; markers untouched.
- [ ] **Step 4:** run; PASS; markers unchanged (problem pin).
- [ ] **Step 5: commit.**

### Task 5: the blocking boundary (Checkpoint A)

**Files:** create test/r0-effects-boundary.test.mjs.

- [ ] **Step 1: test** "no handler declaration is Solved": for every
  corpus declaration whose recorded effects hold a handler-typed
  instance or annotation, or whose source has a handler literal, `with`
  or `handle`, the shadow verdict is not Solved and its `outside` list
  holds `HandlerType` (or `FailFamily` for `handle`).
- [ ] **Step 2:** passes on the tree as built (it pins a boundary).
- [ ] **Step 3: regression proof:** in an isolated copy, suppress the
  `HandlerType` marker in Node.purs `markersAt`; the test fails.
- [ ] **Step 4: commit.** Task 12 extends it to obligations.

### Task 6: R031's two repairs

**Deferred (author, 2026-10-27, §18.100):** neither target form is
representable today. The witness has only `Inline RTExpr | Free Int`
and effect-row reads are unsupported, so (1)'s hole has no binding
form; image reconstruction drops data-type row arguments and has no
tables, so (2)'s count is unavailable. No invented hole indices,
closed-tail substitutes or padding pass. Both defects stay open with
their defect-pinning tests; Task 6 is not done and full typed-output
correspondence is not established. It moves to the tranche adding
effect-row bindings and table-aware reconstruction.

**Files:** Control.purs:181 (was 149-151) (annotated parameter), Translate.purs
`rowOf`, Generate/Elab/Image.purs; rewrite test/r0-r031.test.mjs;
BACKLOG.md R031.

- [ ] **Step 1:** rewrite both tests to today's form: the annotation's
  ambient tail in `build`'s body is a `Hole`, not `Rigid` (defect 1);
  `Thunk` has one row at the constructor and one at the image
  (defect 2). The old assertions go verbatim into the commit message
  and the BACKLOG closure.
- [ ] **Step 2:** run; FAIL on both (the defects stand).
- [ ] **Step 3:** translate the annotation with the lambda's own
  effect row in place of the declaration's ambient variable (a hole in
  `build`); images build `TData o args` with the declared row count of
  closed rows.
- [ ] **Step 4:** run; PASS. test/r0-elab-corpus.serial.test.mjs's T2
  pins unchanged (prediction: T2 erases these rows); any move listed.
- [ ] **Step 5:** regression proof per defect (restore each in an
  isolated copy, see its rewritten test fail; record both outputs in
  progress.md); BACKLOG R031 closed with commits; **commit.**

**Checkpoint A (reached 2026-10-26, §18.98):** Tasks 1-5, by the
author's instruction (it superseded "stop after Task 6").

**Checkpoint B (authorized 2026-10-27, §18.99):** Task 15 (duplicate
writes), Task 6 (R031), Task 17 (boundary scope from source), Task 16
(regression rows), in that order; then `npm run verify` under the lock
and one fresh whole-checkpoint review; then stop for the author. Tasks
7-14 stay held. Budget: the existing 2.4M ceiling for all of Tasks
1-17's Checkpoint A and B work; stop and report before exceeding it.
Task 6's restored-defect proofs are registered rows (one per repair);
report any pin movement for the author rather than re-pinning it.

**Correction unit C (authorized 2026-10-27, §18.102):** Task 18 (R033),
Task 19 (R032), Task 20 (I2 amendment and rows), then verify and one
targeted review of the corrections; total ceiling 3.5M (a cap, not a
prediction); stop and report before exceeding it. Task 7 held; R031
deferred; no push.

### Task 18: opened rows and indexed Opened positions (R033)

**Files:** Domain/Recorded/Effect.purs (an `Opened` role/position with
an index), Generate/Callee.purs, Node.purs, Effect.purs, Marked.purs or
Owned.purs as needed; tests; regression rows.

Match the live checker exactly (DeclarationUse `openedRow`, Stages,
MarkUse `openHandlers`): a callee's closed own row is opened at each
use with a fresh tail (functions, constructors, operations, as live);
at function uses, the handled label of each eligible top-level
handler-typed parameter written M, and of the result written N, gets
its own indexed `Opened` position; Console, Fail and deeper labels stay
as written. Each opened identity is reused consistently across the
instance, the reference node and partial-application stages, and is
minted once. Separating tests: several eligible handler parameters
plus a result (distinct positions); labels that must stay unopened
(Console, Fail, deeper, wrong written mark); a closed callee row opened
at a reference, a partial application and a call. Registered
restored-defect rows.

### Task 19: the declaration's own marked signature (R032)

**Files:** Domain/Recorded/Effect.purs (a `signature` field),
Generate/Signature.purs, Out.purs/Assemble.purs (its item kind in
duplicate detection), minting/domain tests, the boundary test.

Record the declaration's `Declared` marked signature (parameters, row,
result). It joins duplicate-write detection and the two-way minting
and domain accounting; the boundary test's signature-only cases check
the recorded signature's MHandler (representation), not only the
marker. Separating test: a signature-only handler declaration. A
registered restored-defect row.

### Task 20: the `fail`-only amendment (I2) and the rows

**Files:** test/r0-effects-boundary.serial.test.mjs, docs.

Formally amend the boundary scope: a declaration containing only
`fail`, with no other handler-bearing construct or recorded handler
type, need not acquire a new blocker for this test; pin the current
verdicts of that cohort (no verdict change), stating that this grants
no assurance that its effects were independently validated. Keep I5's
corrected account of the handler-marker row.

**Correction unit D (authorized 2026-10-27, §18.104):** Tasks 21-23, one
targeted review with one fix round, full verify; cap 0.45M (running
ceiling 3.95M); stop and report before exceeding it. Task 7 held; R031
deferred. A newly exposed recording defect is reported and fixed within
this scope and cap; broader design or gate changes need a ruling.

### Task 21: a missing signature write is a generation fault

Assembly rejects a declaration with no `SignatureAt` (new narrow fault,
e.g. `MissingSignature`, mapped like the others); the placeholder is
never compared against, since a legitimate unit signature equals it.
Tests: a missing write faults; a present one does not. Registered row:
omit the signature write of a declaration whose legitimate signature
equals the placeholder (`fn f(): Unit` shape); the row's probe fails.

### Task 22: the cohort pin is written only by a separate script

Move the writer to `scripts/r0-fail-only-pin.mjs`; the test only
compares, whatever the environment. Registered row: a moved cohort
fails even with `WXW_PIN_FAIL_ONLY=1` set, and the pin file is not
modified (restored defect: the in-test writer).

### Task 23: signature rigids match effectRigids and rigidMarks

A consistency check: every rigid effect-row variable and every rigid
mark the recorded signature names, nested handler types included, is in
`effectRigids` and `rigidMarks` respectively (and, if the spec requires,
the converse). Registered row: drop one rigid from the recording.

**Unit D accepted (2026-10-28, §18.106):** Task 22's proof is
registered by a narrow harness extension that mutates and runs the real
comparison (not an import gate); the two Task 21 rows are labeled
separately (direct: omission rejected; end-to-end: a placeholder-shaped
signature accepted). Awaiting the author's cap; Task 7 held.

**Task 24 and Task 7 (authorized 2026-10-28, §18.107):** Task 24 cap
0.18M (ceiling 4.0M); Task 7 only after Task 24's targeted review and
full verify pass with no unresolved blocking finding, 0.65M more
(ceiling 4.65M). One review and one fix round each; report actual spend
and verification at the transition.

### Task 24: register Task 22's proof as a behavioral row

**Files:** scripts/regression-run.mjs (and regression-clone.mjs if
needed), scripts/regression-r0-amin.mjs or a sibling row file,
test/regression-run.test.mjs, scripts/regression-r0-amin-signature.mjs
(comments only).

A row may edit a file under `test/`. Such a row copies `test/` into
its own row directory, skips the purs compile, applies its edit there
and runs the probe from that copy (healthy run from the real tree must
pass; the copy's run must fail with the row's message). Source rows
are unchanged. Row: restore the in-test writer inside `assertCohort`
(write the pin under `WXW_PIN_FAIL_ONLY=1`, then compare); the probe
fails with "a moved cohort passed". Harness tests: a missing needle is
an error; an edit in the copy never reaches the real `test/` (bytes
before and after, the real fixture included); existing harness tests
pass. Label the two MissingSignature rows (direct: omission rejected;
end-to-end: a placeholder-shaped signature accepted). Stop on a probe
dependency outside `test/` or scope growth.

### Task 15: duplicate effect writes are a generation fault

**Files:** Generate/Fault.purs (one constructor), Generate/Assemble.purs
(and Elab.purs `sealed` only if the fault must surface there), pins;
test/r0-effects-duplicates.test.mjs (create).

Detect a second write of the same keyed item kind at the same path
(NodeAt, InstanceAt, AnnotationAt, ArityAt, AmbientAt) before the map
is built, identical values included; different kinds at one path are
allowed. The fault (`DuplicateEffect` with the kind and path) maps to
`Internal InputShape` like the others. Scope (author): this fault and
its boundary and pin updates only; no other Elaborating change.

- [ ] **Step 1: failing tests:** two items of one kind at one path
  (equal values) give the fault; two different kinds at one path do
  not; a variable-free callee use (a callee with no type or row
  variables) recorded twice gives the fault; the corpus generates
  with no such fault.
- [ ] **Steps 2-5:** FAIL; implement; PASS (problem pin unchanged);
  commit, naming the fault and pin diff.

### Task 16: regression rows for Tasks 1-5, 15 and 17

**Files:** scripts/regression-r0-amin.mjs, test/regression-r0-amin.mjs
(create, in the form of scripts/regression-r0-elab.mjs and its probe
file), scripts/regression-r0.mjs (spread the rows), docs/progress.md.

One row per invariant or defect, not per assertion: at least Fail is N;
Plain in an annotation is a position; AtUse names as instances; H′'s
occurs check (result part); closed R stays closed; sibling annotation
tails distinct; minted once and only where named; partial application
reuses its instance's stages; erasure agreement of node types; the
blocking marker; duplicate effect writes; the source-derived boundary
scope. Each row restores the defect in compiling form and its probe
shows the failure. Keep the original demonstration logs (the plan
ledger's task reports) and cite them in progress.md.

### Task 17: the boundary's expected cases from resolved source

**Files:** test/r0-effects-boundary.serial.test.mjs.

Derive the expected handler cases independently of generation: walk
the resolved declaration (handler literals, `with`, `handle`, `fail`,
and handler types written in signatures and annotations). For each,
inspect recorded types, markers and verdicts: a recorded handler type
requires `HandlerType` (a lone `FailFamily` does not satisfy it); a
declaration whose only constructs are `handle`/`fail` with no recorded
handler type may use `FailFamily`; none is Solved. A source case with
no recorded handler type and no marker is a breach.

- [ ] **Step 1:** extend the test; floors on the source-derived count.
- [ ] **Step 2:** restored-defect proof: generation drops both the
  marked handler type and the marker for one construct; the test fails.
- [ ] **Step 3: commit.**

### Task 7: E1 equations, O1 and O2 included

**Amended 2026-10-29 (§18.119):** no E1 at the handler literal's node
(deferred to Task 9; statements §4 amendment). The trusted-surface
re-pin for Generate.Obligation and the Gen/Out export changes is
authorized, its diff named in the commit; G0's problem pin, the gates
and live compilation stay unchanged. Origins use explicit tagged
provenance: an E1 tied to an existing atom references its unchanged
AtomId; an effect-only site has a deterministic site-local identity. No
negative indices or offsets. The identity and uniqueness rules are
written here before coding. The corpus comparison checks the marked
sides, not only the identity.

**Provenance rules (written before coding).** `EffectProblem.
obligations` holds `Placed Obligation`, a record `{ provenance, rule,
span, value }` (Domain.Recorded.Effect; `Origin` and `AtomId` are
untouched, so atoms and the problem pin cannot move). `provenance` is
one of two tagged forms:
- `BesideAtom AtomId`: the E1 recorded next to a `GenEqual`; it holds
  that atom's own, unchanged AtomId. The E1 rides on its atom's own
  entry (`EmitEqual`, one entry that joins `b` as the `GenEqual` and
  records the obligation), so no index moves and every existing AtomId
  is byte for byte what it was. Deterministic: the id is a function of
  the rule's listed order alone. Unique: an AtomId is rule-local (its
  `index` is the position in its rule's listed order, and the root
  body path is shared by Sig3 and the body's own rule), so the
  identity of a `BesideAtom` obligation is its AtomId together with its
  `rule` field, exactly as an atom's is `origin.atom` with
  `origin.rule`. Each atom has at most one E1, so no two are equal.
- `AtSite { decl, path, rule, role }`, role `ClauseBody` (O1) or
  `WithNode` (O2): an E1 with no atom. Deterministic: the rule's own
  path, rule id and role. Unique: O1 is emitted once per handler clause
  at that clause's path (`Handler/clauses/k`), O2 once per `with` node
  at its path, and a path names one node, so (decl, path, role) is
  never repeated. The two forms are different constructors, so they
  never equal each other.
No other effect-only E1 site exists: handle, `if`, `match` and records
all list `GenEqual`s, so their E1s are beside atoms. The corpus test
checks all provenances are distinct, and that each E1's sides erase to
its atom's two sides in order. The handler literal's node is deferred
to Task 9 and listed as such in the test.

**Files:** create Generate/Obligation.purs (`equalAt ∷ At → MTy → MTy
→ Tagged s`); every rule that emits `GenEqual`; Effect.purs
(literal node, O1 in `handlerClause`, O2 in `with`); Failure.purs
(`handle`), Control.purs (`if`, `match`), Record.purs; create
test/r0-obligations-equal.test.mjs.

- [ ] **Step 1: failing tests:** "E1 beside every GenEqual" (each
  `GenEqual` entry's origin has an `Equal` obligation at the same
  path whose erasure is the atom's sides; corpus); "O1 clause body"
  and "O2 with node" (§12.1's programs: the obligation exists with
  the sides §4 names; the operation result's row variables closed);
  "E1 marked sides" (T3-a: a written `Log` side keeps `Written FixedM`).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5:** regression proofs (drop O1; drop O2); **commit.**

### Task 8: consumptions and ambient rows (E2, E10, E11)

**Amended 2026-10-30 (§18.124):** `fail` is also an E2 site: its
closed `Fail(payload)` row consumed into the current ambient row,
beside E9, with the pure-callback separating example (live refuses a
`fail` in a `with pure` callback; the recorded Consume is what a
validator would refuse) and a registered proof that dropping it is
detected. No effect-soundness claim. A `with` whose installed handler's
marked type is not an `MHandler` records an explicit `Unsupported`
restriction (never Solved, tested) instead of an ambient row without
`f L`; symbolic framing stays Task 9 design.

**Files:** Obligation.purs (`consumeAt`, `ambientAt`); Call.purs,
Operator.purs (pipe), Builtin.purs, Effect.purs (perform), Body.purs
(declared row as the body's ambient row), Control.purs (lambda's
`EffectOf` row); create test/r0-obligations-consume.test.mjs.

Each stage records `Consume { site, source: stage row, target:
ambient, marks: true, bare: false }`; partial and over-application
record `AtStage k`; a callback stage `AtCallback`. `arities` records
each use's callee arity at its path.

- [ ] **Step 1: failing tests:** "every stage consumes into its ambient
  row" (§12.2 `sites` row: a two-parameter lambda's inner stage, an
  Apply, a Pipe, a partial call: one `Consume` each, with its
  `SiteKind`); "E10 targets the declared row" (`fn g(): Int with Log
  = f()`: target is g's declared row); "ambient rows recorded" (body,
  lambda, `with` body `f L + ρ` with `Frame p`, `handle` body
  `Fail(E…) + ρ`, clause, deferred expression).
- [ ] **Steps 2-5** as Task 7; regression proof: drop the stage site.

### Task 9: handler family (E3, E4, E5)

**Done 2026-10-31 (§18.137):** ff736de, bdd9f14 and the fix round
bdad600..e88b866; tests in test/r0-obligations-handler.test.mjs; A3 is
tested as the exact set at the literal (HandlerLit and two
consumptions per clause), since the approved E4 consumptions sit
there too; identity is also checked through block results,
record-literal fields and lambda results.

**Amended 2026-10-30 (§18.124; design note
docs/plans/2026-10-30-task-9-literal-design.md approved in direction):**
no literal-node E1 (Q1). Step 1 now records `HandlerLit`, h's uses
carrying `Literal p` (A2, and A5 corpus-wide over let/local, Q2) and
the argument E1 (A1); the regression row is the note's
`r0-amin-literal-reaches-use`, replacing "drop the literal E1". Roles
`LiteralSite` and `InstallSite` (Q4), inside the uniqueness gate;
`Clauses k` minted by the literal, once per identity, shared with the
clause ambient rows (Q5, done at f020475); R through `Install` from the
package (Q6, in principle; it does not supply the body's installed
label). Coverage of the literal connection is satisfied only when this
evidence passes. Implementation not yet authorized.

**Added 2026-10-29 (§18.119):** Task 9 also records the literal E1
deferred from Task 7: the connection between a handler literal's
marked type and its image or use, named explicitly in its test and in
its restored-defect proof.

**Files:** Effect.purs, Callee.purs (opened label → `At (Opened p)`),
Obligation.purs; create test/r0-obligations-handler.test.mjs.

`HandlerLit` at each literal (m `Literal p`, clause rows `Clauses k`,
`ClauseIntoR k` and `ClauseIntoC k` consumptions); `Install` at each
`with` (frame `Frame p`, `InstallR` consumption, `InstalledC` site);
`positions` lists every position minted.

- [ ] **Step 1: failing tests** (§12.1 rows recorded, not judged):
  the let-bound failing handler records `HandlerLit` and the E1 joining
  h's image to `Literal p`; the owned-C program records `instances`
  with the ResultC; "no position minted twice" (list length equals
  set size), then "positions are exactly those minted" (set equality
  with the positions the obligations, instances and annotations name).
- [ ] **Steps 2-5** as Task 7; regression proof: drop the literal E1.

### Task 10: defer, Fail, entry, FX032

**Amended 2026-10-30 (§18.124):** FX032's `Unsupported` depends on
whether the operation's row was written, kept apart from resolving it
(a row that fails to resolve still blocks). main's open top-level tail
is one minted flexible effect variable shared by its body ambient row
and `Entry` (statements E8 amendment); the recorded signature keeps its
rigid variable; the checked IR is unchanged.

**Files:** Block.purs or the `defer` rule, Failure.purs, Body.purs
(`Entry` for `main` only), Domain/Resolved/Core.purs and
Features/Resolve/Effect.purs (`OperationInfo.effects`, data only),
Effect.purs (`Unsupported (OperationWithRow e k)` for every perform
form of such an operation: call, pipe, partial application, value);
create test/r0-obligations-misc.test.mjs.

- [ ] **Step 1: failing tests:** "defer records Defer and its
  consumption" (FX008 §1's `work`); "FailConcrete at each payload";
  "Entry only in main"; "FX032's operation records Unsupported in each
  perform form" (§12.2 FX032 row, four forms, nested lambda included).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS, and
  test/r0-first-diagnostic.serial.test.mjs unchanged (Resolve touched).
- [ ] **Step 5:** regression proof; **commit.**

### Task 11: rule 1, `EffectsUnchecked`

**Files:** Decide/Reason.purs `blocks`; Decide/Reason or Decide's
reason mapping; extend test/r0-decide.test.mjs.

- [ ] **Step 1: failing tests** (§12.2 routing rows): FX032's program
  → Unresolved `Unsupported [EffectsUnchecked [OperationWithRow …]]`,
  never Solved, although `online` accepts; a program with no
  `Unsupported` keeps its verdict.
- [ ] **Steps 2-5** as Task 7; regression proof: drop the new block.

### Task 12: the blocking boundary, extended to obligations

**Files:** extend test/r0-effects-boundary.test.mjs.

- [ ] **Step 1:** add "recorded obligations never make a handler
  declaration Solved": every declaration with a recorded `HandlerLit`
  or `Install` is not Solved and keeps its `HandlerType` marker.
- [ ] **Step 2:** passes; **Step 3:** the Task 5 regression proof
  rerun against the extended test; **Step 4: commit.**

### Task 13: coverage accounting (U6, bounded)

**Files:** create test/r0-effects-coverage.test.mjs,
test/fixtures/r0/effects-coverage.json.

The fixture lists every row of statements §13 with one of:
`{ fixture, obligation, site, verdict }` (a constructible source
program, tested for its recorded obligation; `verdict` says whether
the shadow verdict is blocked, which does not remove it from
coverage: a blocked program still records obligations),
`{ unconstructible: reason }` (no source program reaches the rule
today, e.g. a resolve-time refusal that precedes generation), or
`{ unfinished: reason }` (constructible, no fixture yet).

- [ ] **Step 1: test:** every §13 row appears exactly once; every
  `fixture` row's program records the named obligation kind at the
  named site; the test prints the counts per class. `unfinished` rows
  are reported as open coverage, never counted as covered; an
  `Outside` marker alone never justifies `unconstructible`.
- [ ] **Step 2:** run; PASS for the rows it claims.
- [ ] **Step 3:** regression proof: drop one obligation kind from
  generation; its rows fail.
- [ ] **Step 4: commit.**

### Task 14: effect pin, census, window, records

**Done 2026-10-31 (§18.137):** pin 4dad5d0 (225 declarations moved,
exactly those recording HandlerLit or Install;
docs/plans/2026-10-31-effect-pin-moves.txt); census, window and RT8:
no row moved; coverage 18 fixture, 13 unfinished (f20d6ec, 302e140).

**Files:** test/r0-effects-pin.serial.test.mjs (create),
test/fixtures/r0/effects.json, census and window fixtures as rerun;
statements status, closure checklist (A1, 2d), progress, dossier.

- [ ] **Step 1:** pin every corpus declaration's encoded `effects`.
- [ ] **Step 2:** rerun census and window; list every moved row in the
  commit message and progress.md (prediction: FX032-shaped
  declarations to `EffectsUnchecked`; nothing else).
- [ ] **Step 3:** `npm run verify` under the lock; record what ran.
- [ ] **Step 4:** fresh whole-branch review; fixes; **commit.**

## Self-review notes

Spec coverage: §2's recordings (Tasks 2-4), §4's E1 (7), E2/E10/E11
(8), E3-E5 (9), E6/E8/E9 (10), E7 and E12 are validator-side (edges
of E2; judged in tranche 2), §9 FX032 (10, 11), §10 interfaces (1),
§12.2 generation rows (2-11), §13 (13). Not here: I3, read-back,
validator, Definition 4.1/4.2 evaluation, U8's extension.

## Execution and cost

Rough, from the task list (14 tasks, three trusted-surface re-pins,
two corpus-wide serial tests, at least two full verifies):

- **Subagent:** about 40 dispatches; 4-6M tokens; several days of
  wall clock, dominated by verify runs and corpus tests.
- **Inline:** one review dispatch; 2.5-4M tokens; similar wall clock.

Recommended: **subagent**, because the tasks change trusted surface in
many rule modules, and a per-task reviewer catches a wrong marked type
before later tasks build on it. Checkpoint A splits the spend: Tasks
1-6 are roughly 40% of it.

**Authorized (author, 2026-10-25, §18.97):** subagent execution through
Checkpoint A only, budget 1.6-2.4M tokens with a stop and report
before 2.4M. **Extended (2026-10-27, §18.99):** Checkpoint B within the
same 2.4M ceiling. Tasks 7-14 need a separate authorization.
