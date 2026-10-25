# a-min tranche 1: generation records the effect problem (implementation plan, 2026-10-25)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> subagent-plan-execution (recommended) or inline-plan-execution to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax
> for tracking.

Status: **corrected per the author's review (§18.97); Tasks 1-6
(Checkpoint A) authorized for subagent execution; Tasks 7-14 not.** The author
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
data ERole = EffInst VarId | Effect | ResultClauses | HandlerInference
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
  annotations: [], rigidMarks: [], effectRigids: [], arities: [],
  ambient: [], flexEff: [], positions: []}`); "every generated
  declaration carries an effects record" (for each declaration of
  `examples/services.wxw`, `fields(problem).effects` has exactly those
  nine keys; contents not asserted, so later tasks never weaken it).
- [ ] **Step 2:** run `node --test test/r0-effects-types.test.mjs`;
  expected FAIL (`effects` undefined).
- [ ] **Step 3:** add the types; `Fields.effects`; `Out.effects ∷
  Array (Entry EffectItem)` with `concatOut` and `noOut` extended;
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
data MarkNaming s = Declared
  | AtUse Path (Array (Maybe (Handle s)))   -- type handles as Translate
  | InAnnotation Path Int                   -- parameter index j
marked ∷ ∀ s. Tables → MarkNaming s → Ty VarId → Either GenerationFault MTy
```
Rules (statements §2, §3): `Declared` keeps a declared effect-row
variable as `EffRigid`, written marks `Written` (`nofail` N, plain M,
`nofail(k)` `FixedRigid k`); `AtUse p` makes each effect-row variable
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
is `EffFresh p Effect`; instances go to `effects.instances` at the
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

**Files:** Control.purs:149-151 (annotated parameter), Translate.purs
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

**Checkpoint A (author review):** Tasks 1-6 are the representation's
recorded form with the boundary pinned. Stop after Task 6, run
`npm run verify` under the lock, report, and wait for the author before
Task 7. Budget: 1.6-2.4M tokens; stop and report before exceeding
2.4M.

### Task 7: E1 equations, O1 and O2 included

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

**Files:** Obligation.purs (`consumeAt`, `ambientAt`); Call.purs,
Operator.purs (pipe), Builtin.purs, Effect.purs (perform), Body.purs
(declared row as the body's ambient row), Control.purs (lambda's
`Effect` row); create test/r0-obligations-consume.test.mjs.

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
before 2.4M. Tasks 7-14 need a separate authorization.
