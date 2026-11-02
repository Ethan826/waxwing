# Tranche 2 read-back: design note (Task 2, 2026-11-01)

Status: **design and research only; proposed, not approved.** Task 2
of docs/plans/2026-11-01-tranche-2-read-back-plan.md, under the
author's ruling in dossier §18.153 (trace, not solver), continuing
§18.151 and §18.152. Nothing under src/, test/ or scripts/ changed; no
pin moved; no trusted-surface change. The production changes below are
designs for Stage B, which stays held. The independent adversarial
review of this note (plan Task 2 Step 2) is still owed: §H is written
for it, but no second reader has tried to break it.

Evidence labels: **corpus-observed** (run by the Task 2 agent on
2026-11-01 at ccc22b7, branch t2/stage-a, with the probes in
research/t2-read-back-design/), **bounded** (oracle families),
**reasoned** (read from code, not run), **owed**. No soundness claim
anywhere. Corpus results hold for today's pinned sources only.

Probes (run from the repository root after `npm run build`; a scratch
copy of output/ is made under .build/t2-scratch/ and deleted after):

| Probe | What it measures | Section |
|---|---|---|
| `manifest.mjs` | the two source sets and their difference | §A |
| `scratch.mjs` | patched copies of the compiled output (`generation`, `trace`, `both`), each edit matching once | §B, §C |
| `redirect.mjs` | runs any test or research script against a copy | §B, §C |
| `hook-generation.mjs` | the generation correction as a research hook | §B |
| `generation.mjs` | effect and problem pin movement, annotation reads | §B |
| `hook-trace.mjs` | the live-value trace as a research hook | §C |
| `trace.mjs`, `trace-rules.mjs` | the trace read back role by role; recovery, cross-checks, mapping | §C, §D |
| `same.mjs` | non-interference: `recheck` digests, first diagnostics and Go | §C |
| `examples/annotations.wxw.txt` | implicit, explicit, closed, nested and sibling annotations | §B, §H |

Commands: `node research/t2-read-back-design/scratch.mjs trace`, then
`T2_SCRATCH=trace node --import ./research/t2-read-back-design/
redirect.mjs research/t2-read-back-design/trace.mjs` (about 50 s); for
the correction add `--import ./research/t2-read-back-design/
hook-generation.mjs` and use the `generation` or `both` copy;
`scratch.mjs clean` deletes the copies.

## A. Reporting corrections: the source manifest

Two source sets are in use, and the inventory read only the first.
Corpus-observed (`manifest.mjs`):

| Set | Defined by | Entries | Programs | Unresolved | Declarations |
|---|---|---|---|---|---|
| corpus loader | test/r0-corpus.mjs `loadCorpus` (tracked files, manifest-pinned) | 1,138 | 994 | 144 | 3,061 |
| effect pin | test/r0-effects-pin-run.mjs `sourcesOf`: `rt8Sources` (the corpus plus test/r0-r022-probes.mjs) then test/r0-shadow-known.mjs `defectProbes` | 1,142 | 998 | 144 | 3,071 |
| effect pin file | test/fixtures/r0/effects.json | - | 998 | - | 3,071 |

- The corpus loader's set is a subset of the effect pin's: every
  corpus origin is in the pin set with byte-identical source text.
- The pin set adds 4 inline programs and 10 declarations, none in the
  corpus loader: `inline:r022-disjoint` (d2, g, main),
  `inline:r022-lacks` (d2, g, main), `inline:r020` (pair, main),
  `inline:fx032` (g, main). Under the inventory's four-way split, 9 are
  candidates that today's G0-only `certify` accepts and
  `inline:r020#main` is a live refusal (`NoCandidate Exhausted`).
- The pin file's own counts (998, 3,071) are reproduced from
  `sourcesOf`.

Denominators kept apart from here on: **3,061** (corpus loader; 2,823
candidates) and **3,071** (effect pin; 2,832 candidates). The Task 1
inventory (research/t2-read-back-inventory/README.md) covers the first
only; it is not whole-pinned-set coverage. Its README now says so.

**The inventory's counts restated** (corpus loader, 2,823 candidates;
"located" means every required variable and position met at least one
live value; "consistently" means no recorded variable or position met
two live values and no recorded rigid tail met anything but itself,
`main`'s signature apart, whose live tail is `EntryTail`'s meta by
design). Corpus-observed, `trace.mjs` (`inventoryView`), with today's
generation:

| Inventory outcome | Declarations | Of which consistent |
|---|---|---|
| located (inventory "mapped"; 1,087 of them require nothing) | 1,372 | 1,371 |
| not located (unread roles) | 1,442 | 1,432 |
| `UnframedInstall` (records `Unsupported`), not located | 9 | 0 |

The inconsistent non-`Unsupported` declarations (1 located, 10 not
located) are exactly the 11 local-annotation declarations of §B. The
9 `UnframedInstall` declarations stay unsupported even where values
were found: their recorded `with` ambient is the outer row alone
(§18.124 ruling 4), so the reads differ by design, and `certify`
refuses an `Unsupported` problem before I3 whatever a read-back offers.

Over the 10 pin-only declarations (the trace with the correction, §C):
8 candidates map, `inline:fx032#g` records `Unsupported
OperationWithRow` (stays unsupported), `inline:r020#main` is refused
live. Over the effect pin set the totals are therefore 2,832
candidates, 2,822 mapped consistently, 10 `Unsupported`.

## B. The generation correction for local annotations

### B.1 What differs today (reasoned, from the code)

- Resolve gives every declaration an implicit ambient row variable, the
  last `VarId` (named `""`, so no source can write it): Resolve/
  Signature.purs `resolveSignature` (`ambient = Just (VarId (length
  written))`) and, for lambda annotations, Resolve/Lambda.purs
  `parameter` (`VarId (length annotations.variables − 1)`). An unwritten
  row in an annotation (a handler type's `with`, an arrow's row, a data
  type's row argument; label arguments have none, FX024) ends in it.
- The live checker substitutes the **enclosing lambda's own row** for
  it: Check/Lambda.purs `checkLambda` makes `row = openRow (Hole
  state.next)` and passes it to `parameterType`, whose
  `substitute { types: rigidType, rows: annotationRow }` maps the
  implicit id to `row` and every other row id to `Rigid id`, before
  `localMarks`. That `row` is the lambda's `current` ambient (the body
  is inferred in it) and the row of its last arrow (`stages … row`).
- Generation keeps the declaration's rigid: Generate/Control.purs
  `parameterAt` (its `annotated` arm) calls Generate/Marked.purs
  `marked … (InAnnotation path index)`, whose `effectVar` maps every
  row variable under that naming to `EffRigid v`. The marked type is
  then recorded three ways: in `annotations` (`AnnotationAt`, via
  Generate/Assemble.purs `addItem`), as the parameter's marked type
  bound to the local (so every obligation over the parameter's uses
  carries it), and in the lambda's node type (`stagedArrow`).
- In the record, the lambda's own row is `EffFresh p EffectOf`, p the
  lambda's path: Control.purs `lambda` mints it (`effect`), records it
  as the body's ambient (`enter bodyPath (ownRow EffectOf path)`) and
  as the last arrow row of the node type.

### B.2 The correction (design; a production change for Stage B)

In every annotation of the lambda at path p, the row tail `EffRigid
ι` (ι the declaration's implicit `VarId`) becomes `EffFresh p
EffectOf`, the variable the record already uses for the lambda's own
row. Nothing else changes:

- explicitly written rows keep their variable (`with ...e` stays
  `EffRigid e`) or stay closed (`with pure`);
- each annotation's clause rows (`AnnotationClauses j k`, Generate/
  Owned.purs `annotationClauses`) keep their fresh tails; their labels
  are R's, bare, and carry no row variable, so renaming before or after
  `annotationClauses` gives the same record (reasoned);
- marks, positions (`Annotation p j n`), types and record rows are
  untouched; the G0 atoms (Generate/Translate.purs `translate …
  Rigidly`) are row-free and untouched;
- nested lambdas: each annotation takes its **own** lambda's
  `EffectOf` (the innermost lambda whose parameter it annotates), as
  each `checkLambda` passes its own `row`;
- sibling annotations (two parameters of one lambda) both take that
  lambda's `EffectOf`: they share one variable, as they share one live
  row.

Exact change (Stage B Task 3a):

- Generate/Marked.purs: a new exported function, the recorded
  counterpart of Lambda.purs `annotationRow`:
  ```purescript
  -- Every row tail `EffRigid implicit` in an annotation's marked type
  -- becomes the enclosing lambda's own row, as Check/Lambda.purs
  -- `annotationRow` substitutes it; written rows stay.
  lambdaAmbient ∷ VarId → Path → MTy → MTy
  ```
  It maps every `MRow` tail (arrows, data rows, handler inference and
  clause rows, label arguments) and nothing else.
- Generate/Context.purs: `Context` gains `implicit ∷ VarId`;
  Generate/Body.purs `generateIn` sets it to `VarId (length
  function.variables − 1)` (the resolved declaration's variables end in
  the implicit one).
- Generate/Control.purs `parameterAt`: `annotationClauses path index
  (lambdaAmbient context.implicit path markedType)`.

All four modules are on the pinned trusted surface
(scripts/trusted-surface.json): the change needs token review and a
trusted-surface re-pin, and its own effect re-pin (§I Task 3a).

### B.3 Expected movement, checked by the research hook

`hook-generation.mjs` applies exactly this renaming in the `generation`
copy (Control.purs's compiled `annotated` arm patched to call it before
`annotationClauses`). Corpus-observed over the effect pin's 3,071
declarations (`generation.mjs`):

- **Effect pin: 31 declarations move**, and the hook renamed a tail in
  exactly those 31 (predicted 31, moved 31, none either way apart);
  none added or removed. By the inventory's split: 12 candidates
  `certify` accepts, 18 live refusals (`NoCandidate Exhausted`), 1 live
  refusal (`NoCandidate Broke`).
- The 12 candidates are the 11 declarations of §18.152 plus
  test/fixtures/r0/audit/expected-handler.pinned-selection.json#k, an
  `UnframedInstall` declaration (unsupported either way). The 11:
  test/fx008-probes/rev6/amb.wxw#main, rev6/amb3.wxw#f,
  rev6/annotb.wxw#main, rev7/annotc.wxw#main, rev7/annotd.wxw#main,
  witness/famw2.wxw#main; test/fixtures/r0/erased/
  form.annotation-bare.json#g, form.annotation-label.json#g,
  obligation-annotation.control.json#g;
  test/fx-console-programs.mjs:values#2#main;
  test/fx008-defer-programs.mjs:a1Control#1#main.
- **Problem pin: no program moves** (0 of 998; test/r0-problem-pin-
  run.mjs `problemTable` against test/fixtures/r0/problems.json).
- **Annotation reads**: recorded rigid tails met by a live value other
  than the rigid fall from 11 declarations to 0; `EffectOf` variables
  met by two live values stay at 5, all `UnframedInstall`.
- First diagnostics, generated Go and `recheck`'s output do not move
  (the correction is generation-only; `same.mjs` under the `both` copy:
  0 of 1,138 corpus entries and 0 of 3,061 declarations apart).
- Not run: test/fixtures/r0/effects-coverage.json and
  effects-fail-only.json (their tests read generation; Stage B's verify
  runs them), and unit tests that read annotation records
  (test/r0-owned-clauses.test.mjs among them; a text search found no
  test file naming both `annotations` and `EffRigid`, which is a
  search, not a run).

### B.4 Distinguishing tests (proposed for Stage B; observed here)

`examples/annotations.wxw.txt`, read with the inventory's examples
script under both builds (corpus-observed on this file):

| Declaration | Annotation | Recorded R tail today | Corrected | Live R |
|---|---|---|---|---|
| `implicitRow` | `fn(h: Handler(Log))` | `EffRigid 0` | `EffFresh p EffectOf` | `[Tick@m\|rigid 0]`, the lambda's `EffectOf` value |
| `explicitRow` | `fn(h: Handler(Log with ...e))` | `EffRigid 0` (e) | unchanged | `[\|rigid 0]` |
| `pureRow` | `fn(h: Handler(Log with pure))` | closed | unchanged | closed |
| `nested` | outer and inner lambda, each `Handler(Log)` | `EffRigid 0` twice | each its own lambda's `EffectOf` (two variables) | outer `[Tick@m\|rigid 0]`, inner `[Log@m Tick@m\|rigid 0]` |
| `siblings` | `fn(h: Handler(Log), k: Handler(Tock))` | `EffRigid 0` twice | one shared `EffectOf` | one row, `[Tick@m\|rigid 0]`, for both |

(VarIds are each declaration's own: in `explicitRow` VarId 0 is `e`
and the implicit is 1; elsewhere the implicit is 0.) In every case the
clause rows `AnnotationClauses 0 0` and, for `siblings`,
`AnnotationClauses 1 0` are unchanged and distinct. A sibling pair
installed one inside the other (`with h { with k { … } }` with both
`Handler(Log)`) is refused by today's checker (both R are the lambda's
row, so the inner install would need `ρ = Log + ρ`); that refusal is
the live checker's, not the read-back's, and the example uses
sequential installs.

Stage B tests (assertions in words): "implicit annotation row is the
lambda's EffectOf" (the `annotations` entry's R tail equals the
lambda's minted `EffectOf`); "explicit annotation row stays rigid";
"closed annotation row stays closed"; "nested annotations take their
own lambda"; "sibling annotations share one EffectOf, keep their own
C"; "annotation clauses unchanged" (the C rows and positions are
byte-equal before and after).

### B.5 The E1 refusal prediction (reasoned, not run)

Without the correction, an honest package for one of the 11 binds the
literal's R (`HandlerInference`) to the live row, with labels, while
the recorded annotation R is `[] | EffRigid ι`; the `Equal` at the
application relates them, so E1 would refuse (a rigid tail cannot
absorb labels). With the correction the annotation R is `[] | ⟨p,
EffectOf⟩`, whose honest binding is the lambda's live row, and E1
holds. **Reasoned**: no package was built and `validate` was not run.
Stage B Task 8 observes it, and Task 3a's restored-defect row shows it
(§I).

## C. The live-value trace

### C.1 What is traced, and where the checker allocates it

Every value below already exists in today's checker; the trace keeps
it beside the inference, under the span where it was made. Allocation
sites (reasoned from the code; each confirmed by the probe's
cross-checks in C.5):

| Recorded | Live allocation | Value kept |
|---|---|---|
| `EffInst v` at use p | Check/Scheme.purs `instantiate` (VarId i becomes meta `base + i`), called by Check/DeclarationUse.purs `declarationUse` | the use's instantiated slot for v |
| `Instantiated p k` | Check/MarkUse.purs `instantiateMarks` (in `declarationUse`), one meta per mark name | the mark meta for k |
| `OpenedRow` at p | Check/Stages.purs `openedRow` (in `declarationUse`), only when the callee's own row is closed | the opened row's minted tail |
| `Stage k` at a use p, k < n − 1 | Check/Stages.purs `stages` (in `declarationUse`) | `Use.rows[k]` |
| `Opened p i` | Check/MarkUse.purs `openHandlers` via Check/Use.purs `openedUse` (function uses only) | the opened mark of field i, or of the result for i = n |
| `Stage k` at an `Apply` p | Check/Apply.purs `applyNext`: the row `open` gives for argument k (the callee type's k-th row; `bindArrow` allocates it only when that type is a meta) | the row consumed at stage k |
| `Stage 0` at a `Pipe` p | Check/Apply.purs `applyValue`, called by Check/Pipe.purs `checkPipe` | the row consumed |

Use sites: Check/Use.purs `functionUse` and `ctorUse` (from
Check/Call.purs `checkCall`, `checkConstruct`, and the references
`checkFunctionRef`, `checkCtorRef`), Check/Operation.purs
`operationUse` (perform and operation references). Over-application
(Check/Call.purs `overApplied`) is a saturated use followed by
`applyAll` at the same span, so its extra stages are `Apply` entries.
Two roles stay positional, as today: a lambda's `Stage k` (the lambda
node's arrow rows) and an instance at a constructor pattern (the
pattern's type; 2 such `EffInst` in the corpus, both located).

### C.2 The key: formed at allocation, matched to the recorded path

- **At allocation** the trace key is the span the checker already
  holds: `using.span` in `functionUse`/`ctorUse`, `span` in
  `operationUse` and `applyNext` (the `Apply` node's span), and the left
  operand's span in `applyValue`. Use entries, applied rows and piped
  rows are three separate maps; applied rows keep their order, so the
  k-th applied row at a span is stage k.
- **At read-back** a recorded `EffFresh p role` or position at p is
  matched by walking the checked body to the node at p
  (Strategy/ReadBack/Walk.purs `nodeAt`, the walk the type read-back
  already uses), taking that node's span and kind, and choosing the
  map and index by the table in C.1: a use node (`Call`, `Construct`,
  `FunctionRef`, `CtorRef`, `OperationRef`, `Perform`, or an `Apply`
  that is an over-applied call) reads the use entry; `Stage k` at an
  `Apply` reads applied row k; at a `Pipe`, the piped row keyed by its
  left operand's span.
- **The stable use-site identity** is therefore the node the recorded
  path names, identified in the trace by its span within one
  declaration and the site kind. Spans are not renumbered by `holes`
  and are identical in the raw body, the checked body and the trace.
  Threading generation's `Path` through the checker's `Env` would
  identify sites directly but touches every `infer` case and duplicates
  generation's path scheme; rejected unless the span key fails.
- **A key met twice is a clash**: the read-back returns `NoCandidate`
  naming it, never picking one. Corpus-observed: 0 shared use keys
  among 40,287 use entries; every applied and piped lookup found its
  entry.

### C.3 Identity through substitution and hole renumbering

- **Substitution.** Trace values are raw (metas as allocated). They are
  read through the final substitution exactly as the body is retyped
  (`Walk.retype (resolved settledSubst)` in Check/Function.purs
  `checkFunction`), so a meta bound later reads its final value, and
  two recorded variables whose live values are one meta read one
  value. Marks are read through the final mark store
  (Check/MarkStore.purs `resolveMark`) and never renumbered: they are
  not holes, and the package's marks are least terms per class (§F).
- **Holes.** `holes` (Check/Holes.purs) renumbers the body's unsolved
  metas 0, 1, … in first-occurrence order and leaves a meta it never
  met unrenamed. The trace must use the **same** map: Holes gains
  `numbering ∷ Checked.Expr → Map Int Int` (the fold `holes` already
  computes) and `holes` becomes `renumber (numbering body) body`, a
  behaviour-preserving refactor. A traced meta outside the body (an
  inert partial stage, a constructor use's opened tail that reaches no
  node type) takes an **extension number** from `Map.size numbering`
  upward, in first-occurrence order over the finished trace read in
  key order (uses, then applied, then piped; within a use: slots,
  opened tail, stages, fields, result). Corpus-observed: of the metas
  in traced rows, 1,930 occurrences are in the body's numbering and
  36,564 are outside it, so the extension is needed, not an edge case.
- **One numbering.** Type holes and the type read-back's σ are the
  body's numbers; effect-row holes are the same numbers where shared
  and extension numbers otherwise; A2 completion (spec §2.4) numbers
  fresh holes after the largest in P_in's types, rows and effects, so
  after the extension numbers. One sort per number holds if no meta is
  both a type and a row tail, which the checker's construction keeps
  (Holes.purs: "Type, record and row metas share one numbering";
  reasoned, and tested in Stage B: "effect and type holes never share a
  number").
- The renumbering is done once, in `checkFunction`, after `holes`,
  producing the `Traced` value `recheck` returns; the read-back never
  sees raw metas.

### C.4 Collection adds no constraint and changes no decision

- **By construction (reasoned; a gate in Stage B).** The trace is a
  `State` field of an opaque type whose module exports only `record…`
  functions (append) and `finish`. No inference module can read it, so
  no unification, refusal or diagnostic can depend on it; `finish` is
  imported by Check/Function.purs alone, after every check has run. A
  source scan (Stage B Task 3d) pins those importers.
- **Observed** (`same.mjs`, corpus-observed): with the research hook
  collecting (41,728 entries over all 3,061 declarations' `recheck`),
  `recheck`'s whole result (checked declaration and final `State`,
  compared by a SHA-256 of its structural encoding) equals the
  healthy build's for all 3,061 declarations; `compile` and
  `compileReport` match test/fixtures/r0/first-diagnostic.json (Go
  text by SHA-256, wired first diagnostic) for all 1,138 corpus entries.
  The same holds under the `both` copy (correction and trace).
- **Determinism** (corpus-observed): the hook ran twice per declaration
  (`recheck`, then the inventory's rebuild); the two sequences of
  entries agree on all 2,823 candidates.

### C.5 The trace read back, corpus-observed (`trace.mjs`)

Over the 2,823 candidates of the corpus loader, the `both` copy
(correction and trace; the trace columns are the same without the
correction):

| Role | Required | Located before | Traced | Traced = located | Recovered | Not recovered |
|---|---|---|---|---|---|---|
| `EffInst` | 17,997 | 916 | 17,995 | 914 of 914 | 17,081 | 0 |
| `OpenedRow` | 22,313 | 76 | 22,313 | 76 of 76 | 22,237 | 0 |
| `Stage k` | 1,601 | 309 | 1,486 | 194 of 194 | 1,292 | 0 |
| `Opened` | 16 | 7 | 16 | 7 of 7 | 9 | 0 |
| `Instantiated` | 10 | 1 | 10 | 1 of 1 | 9 | 0 |

- Located but not traced, by design: 115 lambda `Stage k` (node type)
  and 2 pattern `EffInst` (pattern type).
- Cross-check of applied and piped stages against the k-th arrow row
  of the applied value's own type: 815 of 815 and 160 of 160 equal.
- Mapping, every required variable and position located or traced and
  no value apart: **2,814 declarations** (2,803 without the
  correction, the 11 annotation declarations then inconsistent), plus
  the 9 `UnframedInstall` declarations, located but inconsistent and
  unsupported. No candidate is left without a value.
- Entries kept: function calls 17,559, constructions 22,050, function
  references 196, partial applications 236, operations 246, applied
  stages 815, piped stages 160.

What this shows: on today's corpus, the values the trace keeps agree
with every value the inventory could already read, and supply every
value it could not. It does not show that a recorded variable means
the live value it is matched to beyond today's checker, which is the
baseline, not the specification.

### C.6 Production design (Stage B Tasks 3b-3d) and Q3's placement

```purescript
-- Features.Check.Trace (Features layer, pure; untrusted search)
type SpanKey = Tuple Int Int                -- span start, end offsets
type UseTrace =
  { slots ∷ Array (Ty Open)                 -- `instantiate`, by VarId
  , marks ∷ Array (Tuple String Mark)       -- `instantiateMarks`
  , opened ∷ Maybe (TyRow Open)             -- `openedRow`'s minted tail
  , stages ∷ Array (TyRow Open)             -- `stages`, before the last
  , fields ∷ Array (Ty Open)                -- after `openHandlers`
  , result ∷ Ty Open
  }
newtype Trace = Trace Recorded              -- constructor not exported
emptyTrace ∷ Trace
recordUse ∷ Span → UseTrace → Trace → Trace
recordApplied ∷ Span → TyRow Open → Trace → Trace
recordPiped ∷ Span → TyRow Open → Trace → Trace
type Traced =
  { uses ∷ Map SpanKey (Array UseTrace)
  , applied ∷ Map SpanKey (Array (TyRow Open))
  , piped ∷ Map SpanKey (Array (TyRow Open))
  }
-- After `holes`: every type and row resolved, metas renumbered by the
-- body's numbering, extension numbers after it (C.3).
finish ∷ (Ty Open → Ty Open) → Map Int Int → Trace → Traced
```

- Check/Scheme.purs: `State` gains `trace ∷ Trace` (`start` sets
  `emptyTrace`; every other site updates records and keeps it).
- Check/DeclarationUse.purs: `Use` gains `allocated ∷ { slots, marks,
  opened, stages }`, built from values `declarationUse` already
  computes. Check/Use.purs `functionUse`/`ctorUse` and
  Check/Operation.purs `operationUse` append `recordUse span` with the
  final fields and result; Check/Apply.purs `applyNext` and
  `applyValue` append `recordApplied`/`recordPiped` with the row they
  pass to `consumeAt`.
- Check/Holes.purs: `numbering` exported; `holes` unchanged in
  behaviour.
- Check/Function.purs: `recheck ∷ … → Either Diagnostic { function,
  state, trace ∷ Traced }`, `trace = finish (resolved settledSubst)
  (numbering settled) marked.trace`.
- **Q3, the non-minting package and its placement.** The package is
  built by new untrusted modules under
  Features.Check.Strategy.ReadBack.Effects (Features layer; not on the
  trusted surface; never importing Domain.Verdict.EffectPackage.
  Internal; building only the plain `EffectPackage` that
  Domain.Verdict.EffectPackage re-exports):
  ```purescript
  data ReadFault
    = Unread EVar | UnreadPosition Position | Clash SpanKey
    | Apart EVar | Declined UnsupportedKind
  readEffects
    ∷ RecordedProblem → Checked.FunctionDecl → MarkStore Open → Traced
    → Either ReadFault EffectPackage
  ```
  Strategy/Online.purs's `Certificate` gains `effects ∷ Either
  ReadFault EffectPackage`, filled in `searched` from `recheck`'s
  result. Online keeps calling the G0-only `certify` on `unsettled`;
  it imports neither Effects.Validate nor Effects.Complete, and nothing
  mints from `effects` (Task 16 held). Online is review-required
  (AGENTS.md) though not in scripts/trusted-surface.json: its diff
  needs token review, no re-pin. A defect in the read-back can lose an
  acceptance at the validator later; it cannot certify.

## D. Unread stage rows (and every other unread role), classified

§18.153 (3) separates missing provenance from synthetic variables:
class (i), a live value exists but nothing indexed by path leads to it
(the trace recovers it); class (ii), a recording auxiliary with no live
counterpart (no trace can recover it). Corpus-observed (`trace.mjs`,
`stageMechanism`), over the 2,823 candidates:

| Unread role | Count | Class | Mechanism |
|---|---|---|---|
| `Stage k`, partial use | 317 | (i), allocated at the use | `stages` allocates n − 1 rows; a partial application drops the first `supplied` (Check/Call.purs `supplied`, `drop count rows`), which stay unconstrained |
| `Stage k`, `Apply` | 815 | (i), consumed at the site | the row `applyNext` consumes for argument k |
| `Stage 0`, `Pipe` | 160 | (i), consumed at the site | the row `applyValue` consumes |
| `EffInst` | 17,081 | (i), allocated | `instantiate` |
| `OpenedRow` | 22,237 | (i), allocated | `openedRow` |
| `Opened` | 9 | (i), allocated | `openHandlers` |
| `Instantiated` | 9 | (i), allocated | `instantiateMarks` |
| any | 0 | (ii) | none observed |

The 1,292 unread stage rows are 317 + 815 + 160. The located ones
(309) are 115 lambda stages and 194 use stages of references and
partial applications whose node type carries them.

Two refinements the author may want to rule on:

- The 975 applied and piped rows are live values at the recorded role
  (the row the checker consumes into the ambient at that stage, the
  counterpart of the recorded `Consume … AtStage`), but the checker
  allocates no variable for them unless the callee's type was a meta:
  they are the callee type's rows. The trace reads the value the
  checker consumed; that is read-back, not reconstruction. Their
  recorded variables share live values with other recorded variables
  (an applied `Stage 0` and the reference's own `Stage 0` in `let f =
  add; f(1, 2)` read one row), which is sharing two holes may have, not
  a violation.
- The 317 partial-use stages are allocated but never constrained: the
  read-back gives `[] | hole n` with an extension number (§C.3), and the
  recorded `Consume … AtStage k` (Generate/Consume.purs
  `partialStages`) of that row holds once the hole settles to the
  closed empty row (reasoned; Task 8 observes it). Today's
  checker imposes no such consumption; generation records one the
  checker does not perform, which is harmless only because the source
  row is empty. Reported, not changed.

Class (ii) is empty on today's corpus, so no reconstruction rule is
proposed. `NoCandidate` stays the rule wherever the trace has no entry
(`Unread`), a key is met twice (`Clash`), or two sources disagree
(`Apart`). A future construct with a class (ii) variable gets
`NoCandidate` until a reconstruction rule is proposed separately,
stated as a rule with its source and fidelity, and approved.

## E. `Fail` normalization

Corpus-observed (inventory): 107 recorded `FixedN` marks on `Fail`
labels meet a live `Unmarked` (Resolve/Row.purs `concrete` writes
`Label FailEffect [payload] Unmarked`; the checker keeps it). The
statements' representation rule (§2: a `Fail` label carries N as a
placeholder; I3 refuses any other term) decides the read-back's
output, not the live mark:

- every label read back whose effect is `FailEffect` gets `TermN`,
  whatever its live mark; its payload (`args`) is read as any argument
  is, so the payload type and its holes are preserved; its effect stays
  `FailEffect`; its position in the row (same-key order and
  multiplicity) is kept;
- `ConsoleEffect` labels get `TermN` (live `NoFail` already; the rule
  states it rather than relies on it);
- other labels take the least term of their mark's class (§F).

Test (Stage B Task 5): "Fail and Console read as N": a fixture whose
live row holds `Fail(Text)` with `Unmarked` and a Console label; the
package row has `{ effect: FailEffect, args: [PBase TextBase], mark:
TermN }` at the same index and `TermN` on Console; a mutant giving
the `Fail` label any other term (its class's least term, say) is
refused by I3. "bare C keeps Fail's payload" (plan Review Focus)
stays.

## F. Least terms: standing

As §18.153 states it: the least-term results (research/t2-read-back-
inventory/least.mjs) support **bounded agreement with the stated
definition** (statements §5): 0 disagreements with the bounded mark
oracle on its families, term by term, and 0 disagreements with
Mark.purs `violation` on the corpus. With the disclosed shared label
pairing (classes.mjs repeats, simplified, the validator's E1 pairing),
they **do not independently establish correspondence between the
recorded and live graphs**. P1 (the recorded graph is FX008's) is
untested; P2 is observed on located positions only (now all
positions, with the trace; still observed, not argued).

Stage B's differential (plan Task 9) may claim: on honest corpus
packages and their mark-forged variants, the validator and the M-B
collector agree on **marks**, labelled as a mark comparison. It may not
claim row semantics: dropped labels, duplicated labels and moved tails
need separately justified checks (§18.151) before any differential
claim covers them; until then forged row variants are reported as the
validator's verdicts alone, not as agreement with an oracle.

## G. Provenance

| Component | Published source | Fidelity | Approval |
|---|---|---|---|
| Positional read-back of node types (rows added) | T-R0b §5.3, today's ReadBack | faithful (types); adapted (rows) | owed at this gate |
| Recording each use's instantiation during inference | elaboration of implicit instantiation into explicit type application in Damas-Milner inference (the System F translation of Peyton Jones, Vytiniotis, Weirich and Shields, JFP 2007) | adapted: metas and rows kept beside the IR, not written into it | owed |
| Reading the trace through the final substitution | substitution application after unification (Robinson 1965); GHC's zonking | faithful | - |
| Span-keyed matching of recorded paths to trace entries, the site table, applied-stage order | none | **invented** (small; checked by C.5's cross-checks) | **the author's** |
| Extension numbering of trace metas outside the body | adapts Holes.purs `holes` (first-occurrence numbering) | adapted; the key order **invented** | **the author's** |
| Generation correction | today's Check/Lambda.purs `parameterType` (the baseline) | faithful to the baseline | §18.153 (1) |
| Least terms over equality classes | statements §5; union-find (Tarjan 1975); least solution of atomic constraints (Rehof and Mogensen 1999) | adapted (lattice N, J S, M) | statements approved as a representation |
| `Fail`/Console as N | statements §2 | faithful | §18.153 (4) |
| `NoCandidate` for a missing value | statements §7 (T5-b) | faithful | §18.151 Q2 |
| Research scratch copies and redirect | research only, not maintained | - | - |

## H. Claims, checks and distinguishing examples

Each claim names its check and its label. An adversarial reviewer
should try to break each with a program the table does not cover.

| # | Claim | Check | Standing |
|---|---|---|---|
| H1 | The correction renames exactly the implicit annotation tails, to the enclosing lambda's `EffectOf`; written rows, C rows, marks, positions and atoms unchanged | 31 renamed = 31 moved; problem pin 0 moved; B.4 examples; Stage B unit tests | corpus-observed; tests owed |
| H2 | Without the correction an honest package fails E1 on the 11; with it, E1 holds there | B.5 | reasoned; Task 8 and Task 3a's restored defect owed |
| H3 | Collecting the trace adds no constraint and changes no inference decision | opaque type, export scan; `same.mjs`: 3,061 `recheck` results, 1,138 first diagnostics and Go identical | reasoned + corpus-observed; gate owed |
| H4 | The span key identifies one use site per kind in a declaration | 0 shared keys of 40,287; clash gives `NoCandidate` | corpus-observed; test owed |
| H5 | The role table reads the live value the recorded role names | traced = located on every overlap (EffInst 914, OpenedRow 76, use stages 194, Opened 7, Instantiated 1); applied/piped rows = the callee's arrow rows (975) | corpus-observed agreement with today's checker only |
| H6 | Every unread role of a corpus candidate is class (i) | C.5, D: 0 not recovered | corpus-observed |
| H7 | Trace and body share one hole numbering; one sort per number | C.3 construction; 36,564 extension occurrences | reasoned; test owed |
| H8 | `Fail` and Console labels read as N, payload and effect kept | E | rule faithful; test owed |
| H9 | Least terms agree with statements §5 | F | bounded; not independence |
| H10 | An honest package passes I3 and the validator for every declaration `certify` accepts today (U2, A1) | Task 8 | owed; any refusal is a stop |

Restrictions the representation adds (adversarial-review table, first
pass):

| Restriction | Beyond the meaning? | If violated |
|---|---|---|
| one use entry per (span, site) | yes, an implementation key | `Clash`, `NoCandidate`: loses an acceptance, never a wrong value |
| applied rows in argument order | read from `applyAll`'s left-to-right `threadAll` | wrong stage row; caught by the callee-row cross-check in Stage B's test |
| trace from `recheck`'s final state only | yes: values from abandoned attempts are not kept | none today: no speculative inference observed (halves agree) |
| patterns and lambda stages positional | inherited | `Unread`, `NoCandidate` |
| extension numbers in key order | arbitrary but deterministic | numerals may differ from a future `bindingsOf`; identity unaffected; the spec §11 effect-hole numeral check is owed |

Distinguishing examples, expected results (all observed on the probe
files named; texts as the inventory prints them: `[labels|tail]`, `@N`,
`@M`, `@m:n` a mark meta, `meta:n` a row meta, `E0` the first declared
effect):

- **Partial application** (research/t2-read-back-inventory/examples/
  partial.wxw.txt). `apply(add(1), 2)`: `add(1)`'s `EffInst 0` reads
  `[|rigid:0]`; its `Stage 0` reads an inert `[|meta:4]`, outside the
  body's numbering (an extension hole). `let f = add; f(1, 2)`: the
  `Apply`'s `Stage 0` reads `[E0@m:-1|rigid:0]`, the same row as the
  reference's own `Stage 0` (two recorded variables, one live value);
  its `Stage 1` reads `[E0@M|rigid:0]`. `5 |> add(1)`: the `Pipe`'s
  `Stage 0` reads `[E0@M|rigid:0]`, `add(1)`'s `Stage 0` an inert meta.
  The partial call's dropped stage appears in no node type, so only the
  trace reads it.
- **Entry tails** (entry.wxw.txt): `work()`'s `EffInst 0` (the
  callee's implicit row) reads `[Console@N|meta:-5]` in `main`, ending
  in `EntryTail`'s meta, and `[Console@N|rigid:0]` for the same body in
  `notMain`. A read-back mapping `main`'s live tail to the signature's
  `EffRigid` would be wrong (inventory).
- **Nested handlers** (nested-handlers.wxw.txt): `Log.log(2)`, inside
  both installs, opens its closed row to `[E1@m:-6 Console@N|meta:-10]`
  (the inner body's ambient less Log, ending in `main`'s `EntryTail`
  meta -10); `Tick.tick()` in the Log clause opens to `[|meta:-5]`, the
  clause row's own tail. Two `OpenedRow` variables, two distinct live
  values; the inventory's nested-handler reads (distinct literal and
  frame metas) are unchanged.
- **Annotations and sibling annotations**: B.4's table.

## I. Revised Stage B task list

Every task: tests first (RED shown), maintained files under 250 lines,
80 columns, `where` not `let … in`, named helpers; each new invariant
gets a restored-defect row in scripts/regression-r0-t2-<lane>.mjs with
its probe in test/regression-r0-t2-<lane>.mjs. Production changes are
marked **[P]**; trusted-surface or pin changes **[pin]**. Estimates are
implementer plus review, from the A2 history.

**Task 3a [P][pin]. Generation correction and its effect re-pin.**
Files: Generate/Marked.purs (`lambdaAmbient`), Generate/Context.purs
(`implicit`), Generate/Body.purs, Generate/Control.purs; test
test/r0-t2-annotation-row.test.mjs. Tests: the six of B.4. Re-pins:
scripts/trusted-surface.json (four modules, token review);
test/fixtures/r0/effects.json, exactly the 31 keys of B.3 and no other
(the commit lists them); problems.json must not move. Regression row:
restoring `EffRigid` for the implicit tail fails "implicit annotation
row is the lambda's EffectOf". Its own commit, before any read-back
work. 0.3-0.4M.

**Task 3b [P]. Holes numbering export.** Check/Holes.purs `numbering`,
`holes` via it (review-required lowering boundary; token review). Test:
`holes` byte-identical on the corpus bodies (existing pins), and
"numbering is first occurrence". 0.1-0.15M.

**Task 3c [P]. The trace.** Create Check/Trace.purs (C.6); modify
Check/Scheme.purs (`State.trace`), Check/DeclarationUse.purs
(`allocated`), Check/Use.purs, Check/Operation.purs, Check/Apply.purs,
Check/Function.purs (`recheck` returns `trace`). Tests
(test/r0-t2-trace.test.mjs): "a call's slots are its instance metas";
"a partial use keeps its dropped stages"; "applied rows in argument
order"; "a pipe's row is keyed by its left operand"; "trace metas
renumber with the body" (a shared meta reads the body's number);
"extension numbers follow the body's". 0.35-0.5M.

**Task 3d. Trace gates.** scripts/structure-*.mjs scan: Check/Trace's
constructor unexported; `finish` imported only by Check/Function.
Corpus serial test test/r0-t2-trace-inert.serial.test.mjs: problem pin,
first-diagnostic pin, effect pin (post-3a), census, window, RT8 and
shadow fixtures byte-identical. Regression row: a mutant inference
module reading the trace fails the scan. 0.15-0.2M.

**Task 4 (plan Task 3). Rows read back.** Create
Strategy/ReadBack/EffectRows.purs, ReadBack/EffectSites.purs (the role
table of C.1-C.2); test test/r0-t2-rows.test.mjs.
```purescript
readRows
  ∷ RecordedProblem → Checked.FunctionDecl → Traced
  → Either ReadFault (Map EVar PRow)
```
Tests: one per role and site (call, construct, reference, partial,
operation, apply, pipe, over-application, lambda stage, pattern
instance, literal R and C, annotation C, `main`'s entry tail); "unread
role is NoCandidate" (a problem naming a path with no trace entry);
"trace key clash is NoCandidate"; "located and traced disagree is
Apart"; "bare C keeps Fail's payload". 0.45-0.6M.

**Task 5 (plan Task 4). Marks.** Create ReadBack/Marks.purs (`leastTerms ∷
MarkStore t → Map Int Term`, `readMarks`); tests
test/r0-t2-marks.test.mjs and test/r0-t2-marks-oracle.test.mjs: "shared
meta, one term"; "Fail and Console read as N" (E); FX008's §7a trace;
the rigid case `J {k}`; agreement with the bounded oracle's three
verdicts on its families (bounded). 0.35-0.45M.

**Task 6 (plan Task 5). Holes and assembly.** Create ReadBack/Package.purs:
```purescript
readEffects
  ∷ RecordedProblem → Checked.FunctionDecl → MarkStore Open → Traced
  → Either ReadFault EffectPackage
```
`types`/`rows` from today's `unsettled` (no new type value); effect
holes `PTailHole n` on the shared numbering; no binding of a forced
`ResultClauses` tail; `Declined` for an `Unsupported` problem. Tests:
"effect and type holes never share a number"; "types equal today's
unsettled"; "no forced binding". 0.3-0.4M.

**Task 7 [P] (plan Task 6). Online carries the package (Q3).**
Strategy/Online.purs `Certificate.effects`; test
test/r0-t2-online.test.mjs: field present on a solved fixture; Online
imports no Effects.Validate/Complete (scan); problem,
first-diagnostic, effect, census and shadow pins unchanged. Token
review, no re-pin (not in trusted-surface.json). 0.2-0.3M.

**Task 8 (plan Task 7). Honest packages through I3 and the
validator.** Test test/r0-t2-honest.serial.test.mjs, reporter
test/r0-t2-honest-report.mjs:
over both denominators (§A), each candidate's read-back outcome, I3's
verdict and `validate`'s, tallied. Assertions: no `Malformed`; every
declaration `certify` accepts is validated or listed with its refusal
(A1, U2); B.5's 11 validated (H2 observed). Any `Malformed` or
unlisted refusal is a stop for the author. Restored-defect row for
3a: with `EffRigid` restored in an isolated copy, the 11 refuse at E1.
0.35-0.5M.

**Task 9 (plan Task 8). Owed compatibility checks** (spec §2.5, §11) on honest
packages: `erase` = today's σ by the canonical comparison; erase∘settle
= settled∘erase; G0 monotonicity; effect-hole numerals. 0.25-0.35M.

**Task 10 (plan Task 9). Differential, scoped (§F).** Marks only, labelled; row
forgeries reported as validator verdicts until separately justified
row checks exist. 0.3-0.4M.

**Tasks 11-12.** The activation-gate specification and records,
whole-branch review (two reviewers), one verify under the lock,
performance reported separately (plan Tasks 10-11). 0.8-1.1M.

Stage B total: about 3.9-5.4M before the controller's share (the
plan's 0.5-0.8M), against the plan's 3.0-4.0M for Tasks 3-9 plus
0.8-1.1M for Tasks 10-11; Tasks 3a-3d (generation correction and
trace) are the addition.

## Points for the author

1. Approve or amend the generation correction (§B; four trusted
   generation modules, the effect pin moving 31 keys).
2. The invented components (§G): span-keyed matching with its site
   table and applied-stage order, and the key order of extension hole
   numbers.
3. The trace as a `State` field of an opaque type (§C.6), and Q3's
   placement (untrusted ReadBack.Effects; Online's certificate field).
4. §D's refinements: the 975 applied and piped rows read as the
   consumed row (no allocation), and generation's consumption of
   dropped partial stages, which today's checker does not perform.
5. The adversarial review of this note (plan Task 2 Step 2) has not
   run.
