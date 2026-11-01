# A2: the trusted effect validator (implementation plan, 2026-10-31)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> subagent-plan-execution (recommended) or inline-plan-execution to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax
> for tracking.

Status (2026-11-01): **Tasks 0-15 implemented, reviewed and integrated;
Task 17 records, whole-branch review and acceptance verify in dossier
§18.147; Task 16 held.** Earlier: **Tasks 0-15 and 17 authorized for
subagent execution with the
corrections of dossier §18.145, applied below (2026-11-01); Task 16
(the minting switch) held until tranche 2 supplies effect packages;
pushing, a live switch, read-back implementation and any soundness
claim unauthorized.** Until Task 16 the existing substitution-only
`certify` stays the minter under F14 item 1, joint-checker assurance;
the new validator does not protect current strategy acceptances, and
its successes are validation results, not `Certified` values.
Earlier status: a plan for the author's review. Nothing here
discharges a soundness obligation. Executing this plan builds a
checker of the recorded obligations; whether those obligations
establish effect safety or abort safety rests on obligations that stay
open: O-SUB, A1 (static rows to dynamic frames), P4, [FX008-5] points
1-4, Definition 4.2's sufficiency, E10's reading, U2, U3, U4 (the
effect-hole default), U5, U6/P1, U7, U8's extension (statements §0e's
carried table). The C6 divergence (a hole-headed `Fail` payload
passing E9 at `Int`) stays a replacement-compatibility decision to
resolve before the new checker is enabled live (§18.143). Four
questions in "Open questions before execution" block parts of it.

**Goal:** `certify` judges one completed effect package against the
recorded problem (records first, then `Unsupported`, I3, G0, the
obligations), with M-A as the trusted mark gate and M-B as a
test-only differential, built and tested on hand-built packages, the
minting path switched only when the author rules (Task 16).

**Architecture:** new trusted modules under
Features.Check.Strategy.Effects compose pure judgments over a new
Domain package type; `certify` (Strategy.Substitution) stays the only
minter. Record validation also runs before search as a Decide block.
The online read-back cannot yet produce effect bindings or mark terms
(tranche 2), so every validator test before Task 16 uses packages
built in tests over problems generation records from source.

**Tech Stack:** PureScript 0.15.16, spago 1.0.4, purs-tidy 0.11.1,
node test runner (`node --test`), Go 1.26.4 for the live preservation
checks.

**Spec:** docs/plans/2026-10-31-a2-specification.md (integrated at
3228901; rulings §18.139-§18.144), with docs/plans/r0-amin-statements.md
(§2, §4, §5, §7, §10 as amended 2026-10-31) and the options note
docs/plans/2026-10-25-amin-a2-options.md.

## Global Constraints

- AGENTS.md applies in full: maintained files at most 250 physical
  lines (about 100 targeted); .md/.mjs/.js/.wxw lines at most 80 code
  points (`node scripts/width.mjs` reports 0); `where`, never `let …
  in`; no anonymous lambdas; `maybe`/`maybe'`/`either` with named
  helpers; pinned purs-tidy; Domain.*/Features.*/Format.* pure; imports
  only to the same or an earlier layer (Domain, Features, Format,
  Runtime, Program): `erase` and every function over `Substitution`
  live in Features.
- Token rules: only Domain.Verdict.Certified and
  Features.Check.Strategy.Substitution import
  Domain.Verdict.Certified.Internal; only the facade
  Domain.Verdict.EffectPackage and Features.Check.Strategy.Effects.Complete
  (which constructs `Completed`) import
  Domain.Verdict.EffectPackage.Internal (new structure rule, Task 1,
  named with its pin in the commit; §18.145). Conversion helpers get no
  constructor access for convenience.
- Every new or changed trusted module carries the `-- trusted surface`
  header; its export changes are re-pinned with
  `node scripts/trusted-surface-pin.mjs` in the same commit, the pin
  diff named in the commit message. AGENTS.md's review-required list
  gains every Features.Check.Strategy.Effects.* module and
  Domain.Verdict.EffectPackage(.Internal) (Task 1 lists them).
- Live compilation unchanged: generation, Decide and every strategy module stay
  unreachable from Program.Main (test/r0-verdict.test.mjs, "the CLI reaches the
  R0 types only through the driver"); the G0 problem pin
  (test/r0-problem-pin.serial.test.mjs), the first diagnostics and the generated
  Go (test/r0-first-diagnostic.serial.test.mjs) and the effect pin
  (test/r0-effects-pin.serial.test.mjs) stay byte-identical until the minting
  switch, Task 16. Task 16 may move census, window and RT8 rows only as the
  author rules.
- No soundness claim anywhere: test names, comments and commit
  messages say "checks the recorded obligation", never "sound".
- The specification's values are copied exactly: refusal constructor
  names, the site table (spec §9), I3's check order (a)-(j) (spec §5),
  the within-obligation order (spec §9's last column), Dep's edges
  (spec §5.1).
- Every new invariant gets a restored-defect regression row in
  scripts/regression-r0-a2-<lane>.mjs with its probe in
  test/regression-r0-a2-<lane>.mjs, shown failing with the defect
  restored (`node scripts/regression.mjs <row>`), spread into
  scripts/regression-r0-a2.mjs (Task 1).
- One `npm run verify` at a time: `mkdir $CLAUDE_JOB_DIR/tmp/verify.lock`
  first, anchored `pgrep -f "^node scripts/verify.mjs"`, clear
  .build/go-cache after; a failed run is investigated, never rerun
  hoping for green; no threshold changes.
- Stage explicit paths; no push; research probes as `.wxw.txt`.
- Owed checks stay labeled owed until their task runs them; a bounded
  or fixture result is reported as bounded or fixture-level, never as
  a proof.
- Shared surfaces are controller-owned (see "Lanes"): lanes never edit
  scripts/trusted-surface.json, AGENTS.md, scripts/structure*.mjs,
  scripts/regression-r0.mjs or docs/progress.md; they hand the
  controller a re-pin request.

## Provenance

Copied from the specification's component table (A2 packet §2, with
the fidelity corrections D14 applied and the rulings of §18.139-§18.143).

- V0 certifying architecture: [MMNS11], **adapted** (one-sided:
  acceptances only). Approval: D1/D14, §18.139. Evidence: source
  partly verified (an author's slides).
- V1 settling to lowering's defaults: certify argument C1-C2 extended,
  **invented** for effect rows (the ∅ default). Approval: statements
  §11 "Novel"; representation approval 535b780. Evidence: argued; U4
  open.
- V1a forcing (E4′, always R's tail): **invented**, provisional
  restriction. Approval: author 2026-10-25, §R7b; D5 §18.139. Evidence:
  stand-in runs (r1, r2, r9 kept; aroundBoth, k2f refused; observed).
- Completion (absent variables as fresh holes): today's `bindingsOf`
  rule, **faithful**; one numbering across sorts, **adapted** (§18.141
  A2). Evidence: owed (Task 15 hole-numbering check).
- V2 solved form: [BS01] §2.2.3 idempotence plus §18.76 item 2's
  restriction, **adapted**. Approval: D9, D14, A3. Evidence: BS01
  verified; U8 corpus count 0 of 14,867.
- V3 row equality: [L05] Figure 1 with labels compared by key as
  [L17] §3, `Fail` keyed by `typeHead`, plus marks, **adapted**.
  Approval: D2, D14. Evidence: L05 verified (draft), L17 partly; the
  grouped normal form's bounded check is Task 6.
- V4 E1 structural equality: Robinson-style term equality, **faithful**.
- V5 Definition 4.1 with rule J: **invented**. Approval: §18.85.
  Evidence: u7.mjs, derived.mjs (bounded).
- V6 E2 per-key matched-pair consumption: **invented** (FX001).
  Approval: statements §11 "Novel". Evidence: rows.mjs (bounded).
- V7 Definition 4.2: **invented**, conservative restriction. Approval:
  §18.85. Evidence: k1.mjs (bounded), p2/p4/p6/p7 simulations.
- V8 `norm`, `holds`: **invented** term language. Approval: statements
  §11. Evidence: §5's universal argument; pairs36, the mark oracle
  (bounded).
- V9 edge collection from completed rows: FX008 §3.4-3.5, **invented**.
  Evidence: P1/U6 open; the M-B differential (Task 13) tests agreement
  on exercised inputs only.
- V10-V12 (E8 entry, E9 keys, I3): **adapted** / Waxwing-specific.
  Approval: D11, D12, A5, the E9 rulings (D7 rejected). Evidence:
  fixtures in this plan.
- Dep (§5.1) and `NotCertifiable` classification: **invented**.
  Approval: A1 §18.141, N3 §18.143. Evidence: §18.144's probe (C1, C15,
  C16 observed); Dep completeness owed (Task 15).
- M-B differential: union-find [Tar75] (verified, memo) and
  reachability (textbook BFS) over FX008's step-5 criterion
  (project), **faithful** to FX008; test-only.

## Review Focus

Distinguishing cases from the specification §12, each pinned to the
task whose tests carry it:

- C1 forced-tail domain (A, A′, B, W1-W4): Tasks 5 (B), 10 (A, A′).
- C2 prerequisites against recorded order: Task 11.
- C3 Unsupported at the entry point (`ClaimsComplete`, no
  `CandidateRefused`): Task 11 (validator), Task 12 (reading).
- C4 record defect (a), (b), W1, W2: Tasks 3, 12.
- C5 unread frame term: Task 5 (I3 alone), Task 11 (refused at step 1).
- C6 completion order and the expected divergence: Tasks 4, 14.
- C7 settled projection (a), (b): Tasks 4, 15.
- C8 nullary data: Task 2.
- C9 BindsForced against an extra key: Task 5.
- C10 rigid-tailed consumption (a), (b): Task 8.
- C11 type image naming an absent variable: Task 5.
- C12 Console's term (`TermJ ∅`): Tasks 5, 6.
- C13 image-owned C through `Equal` only, the program blocked: Tasks 7,
  11.
- C14 forced tail's source (hole, rigid): Task 4.
- C15 dependency through a frame, rigid forced tail: Task 10.
- C16 unrelated failure: Task 10.

Input classes no specification case names, most likely first:

1. A declaration with no effect variables and no positions (most of
   the corpus's simple functions): the empty effect maps are well
   formed and every obligation judged. Task 11, test "empty effect
   package certifies a pure declaration".
2. A `Fail` label whose payload is a closed record (2 corpus
   `FailConcrete`s, observed): keyed by its sorted labels. Task 7, test
   "closed-record Fail payload has a key".
3. Two holes of one number at two sorts inside one image. Task 5, test
   "HoleTwoSorts".
4. A `TermJ` naming two rigid marks against `TermJ` naming one
   (`J {k, l} ⊑ J {k}` false). Task 6, test "join subset".
5. A ResultC whose R is closed (no forced tail): completion adds
   nothing for it. Task 4, test "closed ResultC forces nothing".

---

## Open questions before execution

Answered by the author, 2026-11-01 (dossier §18.145): (1) yes, §2.2's
representation is approved as the encoding; sort correctness and
canonical forms still rest on I3's checks; (2) (a): Task 16 held until
tranche 2 supplies effect packages, the existing minter kept under F14
as joint-checker assurance; Task 17 closes this stage without Task 16;
(3) yes: the record-defect block lands before Task 16, tested
independently of whether any strategy offers a candidate, no
census/window/RT8 movement expected (any movement explained and ruled
before re-pinning); (4) a new test-side reporter; r0-results-diff.mjs
keeps its existing results. The questions as asked:

1. **Representation.** Is the specification §2.2 representation
   (`Term`, `PTy`, `PRow`, `PTail`, `PRecordRow`, `PLabel`, the four
   maps of `EffectPackage`, `Completed` behind an Internal module)
   approved as the type to implement: yes or no? D4 approved one
   package, not this type. Blocks Task 1 and everything after.
2. **Switching the minting path before tranche 2.** The online
   read-back produces no effect bindings or mark terms. If Task 16
   replaces the substitution-only `certify` now, every shadow
   declaration that records an effect variable or position is refused
   `Malformed (MissingKey …)` and loses Solved, a blocked/Solved
   movement (a substantive stop). Choose: (a) hold Task 16 until
   tranche 2's read-back produces effect packages, the
   substitution-only `certify` staying the minter under F14 item 1
   ("joint checker, untrusted") meanwhile; or (b) run Task 16 now and
   accept the movement. The plan recommends (a); §18.141's "no path
   bypasses effect validation" then holds from Task 16 on, not
   before.
3. **The record-defect block before Task 16.** Task 12 adds
   `RecordDefective` to `Decide.Reason.blocks` for every problem. The
   corpus records no defect (observed, §18.140), so zero census
   movement is predicted. Land it before Task 16: yes or no?
4. **Differential home.** Report validator categories, including
   `C6-expected-divergence`, by extending scripts/r0-results-diff.mjs
   (its STOP/MOVED rows) or in a new test-side reporter? The plan
   assumes a new reporter, test/r0-a2-differential.mjs (Task 14), and
   no change to r0-results-diff.mjs.

## Lanes, dependencies and integration order

```
T0 docs ──────────────────────────────────────────────┐
T1 types+stubs ─► T2 erase/settle/under/key ─┬─► Lane A: T4
                                             ├─► Lane B: T3 ─► T5 ─► T12
                                             ├─► Lane C: T6 ─► T7 ─► T8, T9
                                             └─► Lane D: T10
                    {T4, T5, T7, T8, T9, T10} ─► T11 (validator)
                    T11 ─► {T13 M-B, T14 differential, T15 properties}
                    {T11, T12, T13, T14, T15} ─► T17
                    T16 (HELD until tranche 2; not part of this stage)
```

- Interfaces agreed before lanes split: Tasks 1 and 2's Produces
  blocks, frozen at their commit; a lane that needs a change stops and
  asks the controller.
- File ownership: Task 1 creates every shared file stub; then each
  lane owns only the files its tasks list. Lane A owns
  Effects/Complete.purs; lane B owns Effects/Record.purs,
  Effects/Malformed*.purs, Strategy/Witness.purs,
  Decide/Reason.purs, Decide/Reading.purs, Domain/Verdict.purs
  (Task 12's edit only); lane C owns Effects/Term.purs, Rows.purs,
  Equal.purs, Handler.purs, Consume.purs, Sites.purs; lane D owns
  Effects/Dependency.purs. Each lane owns its own
  scripts/regression-r0-a2-<lane>.mjs and
  test/regression-r0-a2-<lane>.mjs and its tests. The controller owns
  the shared surfaces (Global Constraints).
- Integration order: T0, T1, T2 on the integration branch; then lanes
  A, B (T3, T5), C, D in parallel worktrees, merged in the order D, A,
  B, C (smallest first), one re-pin per merge; T11; then T12, T13, T14,
  T15 (parallel; disjoint files); T17's whole-branch review, then its
  acceptance verify (a tree the review changes is verified). T16 is
  held (§18.145).

## File Structure

| File | Responsibility | Task |
|---|---|---|
| src/Domain/Verdict/EffectPackage.purs (create) | `Term`, `PTy`, `PRecordRow`, `PLabel`, `PTail`, `PRow`, `EffectPackage`, abstract `Completed`, `completedPackage` | 1 |
| src/Domain/Verdict/EffectPackage/Internal.purs (create) | `newtype Completed = Completed EffectPackage` | 1 |
| src/Domain/Verdict/Search.purs | `CheckAt`, `PackageKey`, `MalformedReason`, `Limitation`; `CheckRefusal` += four constructors | 1 |
| src/Domain/Verdict.purs | `Unsupport` += `RecordDefective Provenance`, `EffectLimit Limitation` | 1 |
| src/Features/Check/Strategy/Effects/Forced.purs (create) | `forcedTails` (F and each source t) | 1 |
| src/Features/Check/Strategy/Effects/Package.purs (create) | `erase`, `eraseTy`, `settle`, `settleTy`, `under`, `key` | 2 |
| src/Features/Check/Strategy/Effects/Complete.purs (create) | `complete`, `witnessOf` | 4 |
| src/Features/Check/Strategy/Effects/Record.purs (create) | the site table, `recordDefect` | 3 |
| src/Features/Check/Strategy/Effects/Malformed.purs, MalformedTerms.purs (create) | I3 checks (a)-(j) | 5 |
| src/Features/Check/Strategy/Witness.purs | `outside` shared; `unsolvedKey` for packages | 5 |
| src/Features/Check/Strategy/Effects/Term.purs (create) | `norm`, `holds`, `sameTerm`, `readMark` | 6 |
| src/Features/Check/Strategy/Effects/Rows.purs (create) | `grouped`, `sameRow` | 6 |
| src/Features/Check/Strategy/Effects/Judged.purs (create) | `Failure`, `Judged`, `Context` (shared result types) | 1 |
| src/Features/Check/Strategy/Effects/Equal.purs, Handler.purs (create) | E1, Definition 4.1 | 7 |
| src/Features/Check/Strategy/Effects/Consume.purs (create) | E2 and Definition 4.2 per site | 8 |
| src/Features/Check/Strategy/Effects/Sites.purs (create) | E4, E5, E6, E8, E9 | 9 |
| src/Features/Check/Strategy/Effects/Dependency.purs (create) | `Node`, `mentions`, `dependencySet`, `classify` | 10 |
| src/Features/Check/Strategy/Effects/Validate.purs (create) | `prerequisites`, `judgeObligations` | 11 |
| src/Features/Check/Decide/Reason.purs, Reading.purs | `defective` block; readings of the new refusals | 12 |
| src/Domain/Verdict/Certified.purs, Certified/Internal.purs, src/Features/Check/Strategy/Substitution.purs, Online.purs | `Certified Valid Completed Compilation`; new `certify` | 16 |
| test/r0-a2-package.mjs (create) | compact JSON to package values; `problemOf(source, name)` | 1 |
| test/r0-a2-*.test.mjs (create) | per task, named below | 2-15 |
| test/r0-a2-mb-collector.mjs, r0-a2-mb-graph.mjs (create) | M-B, independent JS code | 13 |
| test/r0-a2-differential.mjs (create) | category reporter (Q4) | 14 |
| scripts/regression-r0-a2.mjs (create) + one file per lane; test/regression-r0-a2.mjs (create) + one per lane | regression rows and probes | 1, then lanes |

## Tasks

### Task 0: the five optional wording items of §18.144

**Files:** docs/plans/2026-10-31-a2-specification.md.

- [ ] **Step 1:** apply, each dated 2026-10-31 citing §18.144: C16's
  order note corrected (a `with` that is a block's result records
  `Install`, `InstallR` and `AtInstalledC` before the preceding
  `defer`'s obligations; the reported failure is unchanged because
  those three hold); §5.1 states the coarseness where the ambient tail
  is flexible (in `main` and lambda bodies every obligation sharing
  that tail is `ForcedTail`); §4.1's older forced-variable wording
  replaced by a reference to §2.3's placement rule; C7(b)'s
  no-witness result labeled reasoned; C15's order labeled observed.
- [ ] **Step 2:** `node scripts/width.mjs` → `0 lines over 80`.
- [ ] **Step 3: commit** the file.

### Task 1: shared types, stubs and fixture builder (interfaces frozen)

**Files:** create the two EffectPackage modules, Effects/Forced.purs,
Effects/Judged.purs, test/r0-a2-package.mjs,
test/r0-a2-types.test.mjs, scripts/regression-r0-a2.mjs (empty
`a2Rows` spreading `a2PackageRows`, `a2PrereqRows`, `a2JudgeRows`,
`a2DepRows`, each `[]` in its own lane file), test/regression-r0-a2.mjs
(probe dispatch to lane files); modify Domain/Verdict/Search.purs,
Domain/Verdict.purs. Controller: scripts/regression-r0.mjs spreads
`a2Rows`; scripts/structure*.mjs gains the EffectPackage.Internal
importer rule; AGENTS.md lists; re-pin.

**Interfaces (produces):**
```purescript
-- Domain.Verdict.EffectPackage
data Term = TermN | TermM | TermJ (Set String)
data PTy = PBase Base | PVar Var | PArrow PTy PRow PTy
  | PRecord PRecordRow | PData TypeId (Array PTy) (Array PRow)
  | PHandler PLabel { inference ∷ PRow, clauses ∷ Maybe PRow }
type PRecordRow = { fields ∷ Array (Tuple String PTy), tails ∷ Array Var }
type PLabel = { effect ∷ EffectRef, args ∷ Array PTy, mark ∷ Term }
data PTail = PTailRigid VarId | PTailHole Int
type PRow = { labels ∷ Array PLabel, tail ∷ Maybe PTail }
type EffectPackage =
  { types ∷ Map Var PTy, rows ∷ Map Var PRecordRow
  , effects ∷ Map EVar PRow, marks ∷ Map Position Term }
data Completed            -- constructor in .Internal
completedPackage ∷ Completed → EffectPackage
-- Domain.Verdict.Search
type CheckAt = { provenance ∷ Provenance, check ∷ Int }
data PackageKey = KeyType Var | KeyRow Var | KeyEffect EVar
  | KeyMark Position
data MalformedReason = BindsForced EVar | WrongSort PackageKey
  | MissingKey PackageKey | ExtraKey PackageKey
  | NonCanonical PackageKey | UnknownMark PackageKey String
  | NotN PackageKey | HoleTwoSorts Int | UnsolvedImage PackageKey
  | KeylessFail PackageKey
data Limitation = UnsupportedRecorded UnsupportedKind | RigidExact
  | ForcedTail
-- CheckRefusal += RecordDefect CheckAt | Malformed MalformedReason
--   | NotCertifiable Limitation CheckAt | ObligationFailed CheckAt
-- Domain.Verdict: Unsupport += RecordDefective Provenance
--   | EffectLimit Limitation
-- Features.Check.Strategy.Effects.Forced
type Forced = { forced ∷ EVar, source ∷ EVar }
forcedTails ∷ RecordedProblem → Array Forced
-- Features.Check.Strategy.Effects.Judged
type Failure = { check ∷ Int, limit ∷ Boolean }
type Judged = Either Failure Unit
type Context = { package ∷ EffectPackage, rigidMarks ∷ Array String }
```
`forcedTails` returns, for each `instances[p]` whose result is an
`MHandler` with `clauses: Just C` and C's tail `EffFresh p
ResultClauses`, that variable and R's tail variable in the same
result (spec §2.3, §2.4 (ii)). test/r0-a2-package.mjs exports
`packageOf(spec)` (compact JSON: `{types, rows, effects, marks}` with
terms as `"N" | "M" | ["J", ...names]`) and `problemOf(source, name)`
(generation through test/r0-generate-support.mjs).

- [ ] **Step 1: failing tests** test/r0-a2-types.test.mjs: "an empty
  package round-trips" (`packageOf({})` has four empty maps);
  "forcedTails finds C1's tail" (on spec C1's `use`, exactly one
  entry, `forced` an `EffFresh _ ResultClauses`, `source` an
  `EffFresh _ (EffInst _)`); "a closed ResultC forces nothing"
  (Review Focus 5: `fn mk3(): Handler(nofail Ask with pure) with pure
  = handler Ask { ask() => () }; fn use4(): Unit = with mk3() { () }`
  gives `[]`); "the refusals construct" (each of the four new
  `CheckRefusal` constructors is built and compared with `eq`).
- [ ] **Step 2:** `npm run build` then
  `node --test test/r0-a2-types.test.mjs`; expected FAIL (modules
  absent).
- [ ] **Step 3:** add the types, `forcedTails`, the stubs; extend
  every exhaustive `case` over `CheckRefusal` and `Unsupport`
  (Decide/Reading.purs `refusedWith` arms read claimed for now;
  Task 12 sets them) so the build compiles with no wildcard arm.
- [ ] **Step 4:** controller re-pins the trusted surface and adds the
  structure rule; `npm run build`; the new test passes;
  test/r0-problem-pin.serial.test.mjs, test/r0-verdict.test.mjs and
  test/structure-trusted.test.mjs pass.
- [ ] **Step 5: commit** the listed files, pin diff named.

### Task 2: erase, settle, under, key

**Files:** create Effects/Package.purs, test/r0-a2-erase.test.mjs;
lane file rows `r0-a2-nullary-erase`, `r0-a2-settle-order`.

**Interfaces:**
- Consumes: Task 1's types.
- Produces:
```purescript
erase ∷ EffectPackage → Substitution          -- Strategy.Candidate's
eraseTy ∷ PTy → RTExpr
settle ∷ EffectPackage → EffectPackage
settleTy ∷ PTy → PTy
under ∷ EffectPackage → MTy → Maybe PTy        -- Nothing: unbound key
underRow ∷ EffectPackage → MRow → Maybe PRow
key ∷ PLabel → Maybe LabelKey                  -- typeHead for Fail
```
`eraseTy` mirrors Generate/Elab/Recorded.purs:25-42 case for case
(spec §2.5): `PData t [] [] ↦ Base (DataBase t)`, other data `App
(DataHead t)`, `PHandler l _ ↦ App (HandlerHead l.effect) (args)`,
records sorted as `recordedWith` sorts them. `settleTy`: type hole
`PBase IntBase`, record tail holes dropped, `PTailHole` dropped
(ReadBack/Type.purs:88-102). `under` reads marks through spec §2.2's
`MarkRef` rule; `key` follows Domain/Type/Parts.purs:130-138.

- [ ] **Step 1: failing tests:** "nullary data erases to DataBase"
  (C8: `eraseTy (PData E [] [])` equals `Base (DataBase E)`;
  `PData E [] [row]` equals `App (DataHead E) []`); "erase matches
  recordedWith" (for every recorded `MTy` of the pinned corpus whose
  marks are all `Written`, lifted to `PTy` in JS, `eraseTy` equals the
  atom's `RTExpr` at the same node); "settle commutes with erase"
  (seeded random well-sorted `PTy`s, 2,000 cases: `eraseTy (settleTy t)`
  equals `settled (eraseTy t)`); "key of Fail" (payload `Int` →
  `FailKey HeadInt`; a closed record `{a, b}` → `FailKey (HeadRecord
  ["a","b"])`; a rigid variable, an arrow, a handler, a record with a
  rigid tail → `Nothing`); "under reads written marks"
  (`Written (FixedRigid "k")` → `TermJ {"k"}`; `At pos` → the term in
  `marks`; an unbound `EffFresh` → `Nothing`).
- [ ] **Step 2:** build; run; FAIL.
- [ ] **Step 3:** implement the six functions.
- [ ] **Step 4:** run; PASS. Regression rows: `r0-a2-nullary-erase`
  (restore `App (DataHead t) []` for nullary data; probe fails
  "nullary data erases to DataBase"); `r0-a2-settle-order` (settle
  record tails before fields' holes swapped to leave a hole; probe
  fails the commutation property). Each shown failing.
- [ ] **Step 5: commit** (controller re-pins at merge).

### Task 3 (lane B): record validation

**Files:** create Effects/Record.purs, test/r0-a2-record.test.mjs;
rows `r0-a2-site-flags`, `r0-a2-forced-placement`,
`r0-a2-fail-invariant`.

**Interfaces (produces):**
```purescript
siteFlags ∷ SiteKind → { marks ∷ Boolean, bare ∷ Boolean }
recordDefect ∷ RecordedProblem → Maybe CheckAt
```
Site table exactly spec §9: `AtCall`, `AtPerform`, `AtApply`,
`AtPipe`, `AtStage _`, `AtCallback`, `AtFail`, `AtDefer`,
`AtDeferredRow` → marks true, bare false; `ClauseIntoR _`, `InstallR`
→ false, false; `ClauseIntoC _`, `AtInstalledC` → true, true. Checks
in spec §4.1's order, record entries in spec §5 item 1's order; `check`
is the index of the violated check.

- [ ] **Step 1: failing tests:** "every SiteKind has a row" (all 13
  constructors); "the corpus records no defect" (every pinned-corpus
  declaration: `recordDefect` is `Nothing`; 3071 declarations);
  "C4 mutant is a defect" (C4's famw problem with its `AtInstalledC`
  obligation's `bare` set to false in JS: `Just` with that obligation's
  provenance); "forced placement" (C1's problem with
  `⟨p, result clauses⟩` copied into an `Entry` row: defect); "Fail
  invariant" (fail-needs-concrete-check's `k` with its `FailConcrete`
  removed: defect; unchanged: none); "AtDeferredRow is no defect" (a
  problem with a recorded `AtDeferredRow` consume, flags true/false:
  `Nothing`).
- [ ] **Step 2:** build; run; FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** PASS; rows shown failing: flags table entry flipped;
  placement check dropped; Fail invariant dropped.
- [ ] **Step 5: commit.**

### Task 4 (lane A): completion, forcing, witness

**Files:** create Effects/Complete.purs, test/r0-a2-complete.test.mjs;
rows `r0-a2-complete-then-settle`, `r0-a2-forced-copy`,
`r0-a2-hole-numbering`.

**Interfaces:**
- Consumes: `forcedTails`, `settle`, Witness.purs `binding` rule.
- Produces:
```purescript
complete ∷ RecordedProblem → EffectPackage → Completed
settledOf ∷ Completed → EffectPackage            -- P_c = settle P_cu
witnessOf ∷ RecordedProblem → Completed → Witness
```
Fresh holes from h+1, h the largest hole number in `types`, `rows`,
`effects`, assigned in `Ord Var` order (spec §2.4); each forced v ↦
the input image of its source, an exact copy.

- [ ] **Step 1: failing tests:** "C6 order separates" (`k`, field
  variable absent: `FailConcrete`'s payload under `settledOf (complete
  …)` is `PBase IntBase`; under `complete` of `settle P_in` it is a
  `PVar` hole); "C14 hole source" (t ↦ `{[], PTailHole 5}`: forced
  binding `{[], PTailHole 5}`, the same number); "C14 rigid source"
  (t ↦ `{[], PTailRigid e}`: forced `PTailRigid e`); "C7(a) holes
  settle" (lambda row hole 3, Apply row hole 4: both closed in
  `settledOf`); "numbering injective" (existing holes keep their
  numbers; fresh ones exceed h and are distinct); "witness shares
  holes" (an absent type variable completed to hole n gives `Free n`
  in `witnessOf`); "closed ResultC forces nothing" (Review Focus 5).
- [ ] **Step 2:** build; run; FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** PASS; rows: settle-then-complete (probe fails "C6
  order separates"); forced binding as a fresh hole (fails "C14 hole
  source"); fresh numbering from type images only (fails "numbering
  injective" on a package with an effect hole above every type hole).
- [ ] **Step 5: commit.**

### Task 5 (lane B): I3 and the shared solved form

**Files:** create Effects/Malformed.purs, MalformedTerms.purs;
modify Strategy/Witness.purs (`outside` shared, `unsolvedKey`);
test/r0-a2-malformed.test.mjs; rows `r0-a2-bindsforced-first`,
`r0-a2-solved-all-sorts`, `r0-a2-termj-empty`,
`r0-a2-keyless-image`.

**Interfaces (produces):**
```purescript
malformed ∷ RecordedProblem → EffectPackage → Maybe MalformedReason
unsolvedKey ∷ RecordedProblem → EffectPackage → Maybe PackageKey
```
Checks (a)-(j) in spec §5 item 3's order, maps in the order effects,
marks, types, rows, keys in `Ord` order; terms compared on normal
forms (`TermJ ∅` is N). `solvedForm` (Witness.purs:86-98) keeps its
signature and result for witnesses; both call the one `outside`
predicate (D9).

- [ ] **Step 1: failing tests:** "C9 BindsForced first" (C1's B:
  `Just (BindsForced ⟨p, result clauses⟩)`, not `ExtraKey`); "C9 extra
  key" (a binding for an `EffFresh` outside `flexEff`: `ExtraKey`);
  "C11 unsolved type image" (x ↦ `PVar y`, y flexible and absent:
  `UnsolvedImage (KeyType x)`); "C12 TermJ empty is N" (Console label
  `TermJ ∅`: `Nothing`; `TermJ {"k"}`: `NotN`); "C8 non-canonical"
  (`PBase (DataBase E)`: `NonCanonical`); "C5 unread frame term" (the
  problem of `fn main(): Unit with Console = { let h = 1; with h { () }
  }` directly: no term for `Frame p` → `MissingKey (KeyMark (Frame
  p))`; N or M → `Nothing`); "unknown mark" (`TermJ {"z"}` with z not
  in `rigidMarks`: `UnknownMark`); "HoleTwoSorts" (hole 3 as a type
  and as an effect tail); "keyless Fail in an image" (`Fail(PArrow …)`
  in an effect binding: `KeylessFail`); "U8 unchanged" (every case of
  test/r0-u8-solved-form.test.mjs gives the same `solvedForm`
  result).
- [ ] **Step 2:** build; run; FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** PASS; test/r0-u8-solved-form.test.mjs passes
  unchanged; rows: ExtraKey checked before BindsForced; solved form for
  effect maps only; syntactic term comparison; keyless check dropped.
  Re-pin request for Witness.purs.
- [ ] **Step 5: commit.**

### Task 6 (lane C): terms and rows

**Files:** create Effects/Term.purs, Effects/Rows.purs,
test/r0-a2-terms.test.mjs; rows `r0-a2-norm`, `r0-a2-holds-subset`,
`r0-a2-row-order`.

**Interfaces (produces):**
```purescript
norm ∷ Term → Term
holds ∷ Term → Term → Boolean
sameTerm ∷ Term → Term → Boolean
type Grouped = { keyed ∷ Array (Tuple LabelKey (Array PLabel))
               , tail ∷ Maybe PTail }
grouped ∷ PRow → Maybe Grouped              -- Nothing: a keyless label
```

- [ ] **Step 1: failing tests:** "holds over every valuation" (all
  term pairs over rigid marks {k, l}, against brute force over the
  four valuations: agree; this is pairs36's check, now on the
  PureScript code); "norm equality exact" (every pair over up to four
  marks, all 16 valuations: `sameTerm` iff equal at every valuation);
  "join subset" (`holds (TermJ {k,l}) (TermJ {k})` false; reverse
  true); "grouped matches eq-swap" (every row of up to four labels over
  keys A, B and two argument values: two rows have equal `grouped`
  iff the closure of adjacent swaps of distinct keys relates them,
  computed by BFS in JS); "E1 order" (statements §12.2:
  `State(Int) + State(Bool)` and `State(Bool) + State(Int)` group
  differently).
- [ ] **Step 2:** build; run; FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** PASS (bounded); rows: no normalization
  (`J ∅ ⊑ N` fails); one ground valuation (`J {k} ⊑ N` holds); multiset
  grouping.
- [ ] **Step 5: commit.**

### Task 7 (lane C): E1 and Definition 4.1

**Files:** create Effects/Handler.purs, Effects/Equal.purs,
test/r0-a2-equal.test.mjs; rows `r0-a2-equal-marks`,
`r0-a2-def41-c`, `r0-a2-def41-d-tail`.

**Interfaces (produces):**
```purescript
-- Handler.purs: the argument comparator is passed in, so Equal.purs
-- imports Handler.purs and not the reverse (no module cycle).
handlerEqual ∷ Context → (PTy → PTy → Judged) → { left ∷ PTy, right ∷ PTy }
  → Judged
-- Equal.purs
samePTy ∷ Context → PTy → PTy → Judged
equalCheck ∷ Context → MTy → MTy → Judged       -- reads both through under
```
`equalCheck`'s order j as spec §9's `Equal` row. `handlerEqual`: (a)
heads and arguments; (b) handled marks; (c) neither owns a C: R ≡ R′
with marks; (d) either owns a C: R ≡ R′ ignoring top-level marks,
clauseRow ≡ clauseRow′ keys only with marks and tails, a side without
C using R itself (rule J). An image C (`clauses: Just`) is compared as
any C.

- [ ] **Step 1: failing tests:** "E1 marks" (an image's nested `TermN`
  against a written plain `Log`: `Left` at the mark's j); "closed-record
  Fail payload has a key" (Review Focus 2); "pre-order j" (two
  mismatches: the outer constructor's j reported); "E1 order"
  (statements §12.2's `f`: `Left`); "attempt A refused" (derived.mjs's
  attempt A as packages: `Left`); "attempt B refused" (ResultC tail
  bound ∅ against g's alias tail r: `Left`); "C13 image C through
  Equal" (an isolated `Equal` of a ResultC owning `[Log]` against
  `MVar x`: x ↦ `PHandler … Just C′` with C′ equal → `Right`; C′ = ∅ →
  `Left`; `Nothing` → compared with x's R itself).
- [ ] **Step 2:** build; run; FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** PASS; rows: marks skipped; (c) ignoring R's marks;
  (d) without tails.
- [ ] **Step 5: commit.**

### Task 8 (lane C): E2 and Definition 4.2

**Files:** create Effects/Consume.purs, test/r0-a2-consume.test.mjs;
rows `r0-a2-def42-last`, `r0-a2-installed-c-only`,
`r0-a2-labels-only`.

**Interfaces (produces):**
```purescript
type ConsumeRecord = { site ∷ SiteKind, source ∷ MRow, target ∷ MRow
                     , marks ∷ Boolean, bare ∷ Boolean }
consumeCheck ∷ Context → ConsumeRecord → Judged
```
Per spec §9: per source label in source order (partner of key and
rank, arguments unless bare, edge if marks), then the tail, then
Definition 4.2's exact counts with `limit: true`; `AtInstalledC` only
pairing and its edge (R-a); `AtDefer`, `AtDeferredRow` labels only.

- [ ] **Step 1: failing tests:** "C10(a) payload before count" (`w`
  with `Log + State(Bool)`: `Left {limit: false}`); "C10(b) exact
  count is a limitation" (`Log + State(Int)`: `Left {limit: true}`);
  "N4 p1 refused" (`st`); "closed-R inclusion accepted, near miss
  refused" (§12.1); "famw bare" (`Fail(Job)` against `Fail(Job(Int))`
  at `AtInstalledC`: `Right`); "E2 payloads" (§12.2: `Left`); "closed
  source F7" (`Right`, no edge for `Ask`).
- [ ] **Step 2-4:** build, FAIL, implement, PASS; rows: Definition 4.2
  checked first (C10(a) becomes a limitation); argument equality at
  `AtInstalledC`; a tail condition at `AtDefer`.
- [ ] **Step 5: commit.**

### Task 9 (lane C): E4, E5, E6, E8, E9

**Files:** create Effects/Sites.purs, test/r0-a2-sites.test.mjs; rows
`r0-a2-console-frame`, `r0-a2-own-abort`, `r0-a2-e9-key`.

**Interfaces (produces):**
```purescript
handlerLitCheck ∷ Context → HandlerLitRecord → Judged
installCheck ∷ Context → InstallRecord → Judged     -- MHandler only
deferCheck ∷ Context → { row ∷ EVar, enclosing ∷ MRow } → Judged
entryCheck ∷ Context → MRow → Judged
failConcreteCheck ∷ Context → MTy → Judged
```
`HandlerLitRecord` and `InstallRecord`, defined in Sites.purs, equal the field
records of Domain.Recorded.Effect's constructors: `{ m ∷ Position, inference ∷
EVar, clauses ∷ EVar, clauseRows ∷ Array EVar }` and `{ frame ∷ Position,
handler ∷ MTy, ambient ∷ MRow }`. Edges per spec §9, Console frames included
(§18.86).

- [ ] **Step 1: failing tests:** "§7a forged refused" (`work`, d's term
  N: the consumption edge, tested in Task 11; here the honest M fails
  `deferCheck`); "own abort" (a clause row with `Fail(E)`: `M ⊑ m`
  required); "rigid C tail" (`M ⊑ f` and ρ ends in it); "Console frame
  counted" (a Console frame with a failing partner: `Left`); "entry"
  (`main` row `Log`: `Left`); "E9 after settling" (payload hole →
  `Right`; rigid → `Left`; C6's arrow → `Left`).
- [ ] **Step 2-4:** build, FAIL, implement, PASS; rows: Console guard
  restored; own-abort edge dropped; E9 judged before settling (C6's
  hole case fails).
- [ ] **Step 5: commit.**

### Task 10 (lane D): Dep and classification

**Files:** create Effects/Dependency.purs,
test/r0-a2-dependency.test.mjs; rows `r0-a2-dep-frame`,
`r0-a2-dep-forcing-edge`.

**Interfaces (produces):**
```purescript
data Node = NodeVar Var | NodeEff EVar | NodePos Position
mentions ∷ Obligation → Set Node
dependencySet ∷ RecordedProblem → Set Node
classify ∷ Set Node → Placed Obligation → Failure → CheckRefusal
```
Edges exactly spec §5.1's table, the forcing edge v → t included;
`classify` gives `NotCertifiable RigidExact` when `limit`, else
`NotCertifiable ForcedTail` when the obligation mentions a Dep member,
else `ObligationFailed`.

- [ ] **Step 1: failing tests** (each on the recorded problem, failures
  injected as `Failure`): "C1 A through the frame" (`use`'s `Defer`,
  obligation 7, depends: `ForcedTail`); "C1 A′ direct" (`Install`,
  obligation 0: `ForcedTail`); "C15 rigid tail" (`use2`'s `Defer`:
  `ForcedTail`); "C16 unrelated" (`use3`'s first `Defer`:
  `ObligationFailed`); "limit wins" (`limit: true` → `RigidExact`).
- [ ] **Step 2-4:** build, FAIL, implement, PASS; rows: Dep over
  `Equal` and variables only (C1 A becomes `ObligationFailed`); the
  forcing edge dropped.
- [ ] **Step 5: commit.**

### Task 11: the validator (integration)

**Files:** create Effects/Validate.purs, test/r0-a2-validate.test.mjs,
test/r0-a2-cases.test.mjs; rows `r0-a2-unsupported-before-i3`,
`r0-a2-recorded-order`, `r0-a2-edge-provenance`,
`r0-a2-runner-sequence`.

**Interfaces (produces):**
```purescript
prerequisites ∷ RecordedProblem → EffectPackage → Either CheckRefusal Unit
judgeObligations ∷ RecordedProblem → Completed → Either CheckRefusal Unit
-- §18.145 (b): the non-minting runner, the whole sequence Task 16
-- will later wrap: record validation, Unsupported, I3, G0 on
-- erase (settle P_in), complete once, settle, the obligations, then
-- the witness and coverage. Its success is a validation result,
-- never a Certified value.
type ValidationResult =
  { validity ∷ Valid, completed ∷ Completed, compilation ∷ Compilation }
validate
  ∷ RecordedProblem → EffectPackage → Either CheckRefusal ValidationResult
```
`validate` lives in Features.Check.Strategy.Substitution, beside
`certify` (pre-flight ruling, 2026-11-01): that module is the only one
that mints `Valid` (its header; scripts/structure.mjs), and G0's check
`checkSubstitution` is not exported. Effects/Validate.purs exports
`prerequisites` and `judgeObligations`; Substitution composes them with
`checkSubstitution`, `complete`, `settledOf`, `witnessOf` and
`coverage` (Strategy/Witness.purs), and exports `validate` and
`ValidationResult`; it constructs no `Certified`. Files: Task 11 also
modifies Strategy/Substitution.purs (trusted; re-pin named).
`prerequisites`: `recordDefect`, then the first `Unsupported`
(`NotCertifiable (UnsupportedRecorded k) {provenance, check: 0}`), then
`malformed`. `judgeObligations`: per obligation in recorded order, one
check function from Tasks 7, 8, 9, the first failure classified by Task
10.

- [ ] **Step 1: failing tests:** "C2(a)" (`work`, `TermJ {z}`:
  `Malformed`); "C2(b)" (term M: `ObligationFailed`
  `DeferRegistration`; term N: `DeferInto`); "C2(c)" (`Defer` 2
  reported, not the `AtCallback` 7); "C3" (FX032's `g`, any package:
  `NotCertifiable (UnsupportedRecorded (OperationWithRow …))`); "C5"
  (any package: the same at step 1, before I3); "C13 blocked" (`use`
  with `if`: `UnframedInstall`); "C1 A, A′, B" (end to end through
  `prerequisites` and `judgeObligations`: `ForcedTail
  DeferRegistration`, `ForcedTail Install`, `BindsForced`); "C15",
  "C16" (end to end); "empty effect package validates a pure
  declaration" (Review Focus 1: `fn id(x: Int): Int = x`, empty maps:
  both `Right`, and `validate` gives a `ValidationResult`); "runner
  sequence" (§18.145 (b): through `validate`, a record defect wins over
  `Unsupported`, which wins over a malformed package, which wins over
  a G0 refusal, which wins over an obligation failure; a package
  passing every step yields `Witnessed` or `NoWitness` exactly as
  `coverage` says on the completed package); "no Certified" (a source
  scan finds no `Certified` construction in Effects/*.purs).
- [ ] **Step 2-4:** build, FAIL, implement, PASS; rows: I3 before
  `Unsupported`; conditions everywhere before edges (C2(c) reports 7);
  edges without provenance.
- [ ] **Step 5: commit.** Then the controller runs one routine verify
  (lanes integrated).

### Task 12 (lane B): Decide readings and the record-defect block

Blocked on open question 3.

Authorized before Task 16 (§18.145 (3)). The block is tested
independently of whether any strategy offers a candidate.

**Files:** modify Decide/Reason.purs, Decide/Reading.purs,
test/r0-decide.test.mjs (or the existing Decide test named by the
controller), test/r0-a2-decide.test.mjs; row
`r0-a2-defect-block`.

**Interfaces:**
```purescript
defective ∷ RecordedProblem → Array Unsupport       -- Reason
-- blocks open problem = defective problem <> ordinary open problem
--   <> unchecked problem
```
`refusedWith` arms (spec §6): `RecordDefect a → Declines
(RecordDefective a.provenance)`; `NotCertifiable (UnsupportedRecorded
k) _ → Declines (EffectsUnchecked [k])`; `NotCertifiable l _ → Declines
(EffectLimit l)`; `Malformed _`, `ObligationFailed _` → `claimed claim`.

- [ ] **Step 1: failing tests:** "C3 no CandidateRefused" (a
  `ClaimsComplete` attempt refused `NotCertifiable (UnsupportedRecorded
  …)`: no search fault; reason `Unsupported` naming `EffectsUnchecked`);
  "C4(a)" (a problem with a mutated flag: `RecordDefective` in blocks;
  verdict Unresolved); "C4(b) NoCandidate" (every strategy returns
  `NoCandidate`: still `RecordDefective`); "limitations decline" (every
  strategy refused `RigidExact`: reason `Unsupported` with
  `EffectLimit RigidExact`); "Contradiction stands" (a refuter's
  evidence with a defect block: `Contradiction`).
- [ ] **Step 2-4:** build, FAIL, implement, PASS; census, window, RT8
  and shadow tests pass with **no row moved** (r0-results-diff on the
  dumps: exit 0, empty); row: `defective` dropped from `blocks`.
- [ ] **Step 5: commit**, the trust-boundary change named.

### Task 13: M-B differential (test only)

**Files:** create test/r0-a2-mb-collector.mjs (edges from statements
§4, written without reading Effects/*.purs), test/r0-a2-mb-graph.mjs
(union-find, reachability, FX008 step 5's criterion, least terms per
class), test/r0-a2-mb.test.mjs; row `r0-a2-mb-detects` (test tree).

Graph satisfiability alone does not show that a particular package's
terms satisfy the graph (§18.145 (c)). The independent check therefore
evaluates the supplied package: each candidate term is pinned into the
graph as the value of its position, and the pinned graph is judged
under every valuation of the declaration's rigid marks (2^n
valuations for n names in `rigidMarks`; the test reports n and the
count it ran; every case runs all its valuations, nothing is
skipped). Least-term construction is a separate
property.

- [ ] **Step 1: tests:** "accepted packages pass the pinned graph on
  exercised inputs" (for every case package of Tasks 7, 8-11 and every
  single-term forgery of it, 1 per position: if `judgeObligations`
  accepts, the pinned M-B graph holds under every rigid valuation);
  "refused mark packages fail the pinned graph on exercised inputs"
  (the converse for mark refusals); "a satisfiable graph with a wrong
  assignment is refused" (separating case: a graph whose only
  constraint is `p ⊑ N`, package term `p = M`: the graph is
  satisfiable, the pinned graph fails, and `judgeObligations` refuses);
  "least terms pass on exercised inputs" (for each case problem whose
  unpinned graph is satisfiable, the least-term package passes
  `judgeObligations`'s mark part); "agreement scope" (the test's header
  and output say "bounded agreement on exercised inputs only; not E12
  exhaustiveness, not soundness").
- [ ] **Step 2:** run against a validator with one edge kind dropped
  (the row): the first test fails. A disagreement in either direction
  is a stop for the author; neither implementation is presumed
  correct.
- [ ] **Step 3: commit.** Corpus runs wait for tranche 2.

### Task 14: differential reporter and C6

A new test-side reporter (§18.145 (4)); scripts/r0-results-diff.mjs
keeps its existing results. The reporter separates fixture evidence
from corpus observations, and classifies a case as
`C6-expected-divergence` only when today's refusal is FailNeedsConcrete
at a recorded `FailConcrete` whose payload's head was a hole settled to
the default and every other check agrees; any other widening is
`ValidatorWider`, never C6.

**Files:** create test/r0-a2-differential.mjs,
test/r0-a2-differential.test.mjs.

- [ ] **Step 1: tests:** "an unrelated widening is not C6" (a fixture
  where the validator accepts a program today refuses for another
  reason: `ValidatorWider`); "fixture and corpus kept apart" (every
  row carries `evidence: fixture | corpus`); "categories" (Agree;
  ValidatorStricter with
  `Malformed`, `ObligationFailed`, `NotCertifiable` kind; ValidatorWider;
  `C6-expected-divergence` when today's verdict is FailNeedsConcrete
  and the validator accepts with a `FailConcrete` whose payload settled
  from a hole); "C6 fixture" (`k` with the field variable absent: the
  validator's prerequisites and obligations accept the fixture-level
  package that judges only `k`'s recorded obligations, labeled
  predicted, reported `C6-expected-divergence`, never Agree).
- [ ] **Step 2-3:** run; PASS; commit. Corpus reporting waits for
  Task 16 and tranche 2.

### Task 15: owed property checks

**Files:** create test/r0-a2-properties.test.mjs,
test/r0-a2-properties.serial.test.mjs.

- [ ] **Step 1: tests:** "complete/settle order" (C6: equal on F,
  differ on the absent variable); "G0 monotonicity on fixtures" (for
  each case package, today's G0 (`certify` on a `Substitution`) accepts
  `erase (settledOf P)` whenever it accepts `erase (settle P_in)`);
  "C7(b)" (`id2`, y ↦ hole 0: G0 accepts the settled erasure; the
  witness from `witnessOf` gives `NoWitness (HoleContract …)` through
  `coverage`); "Dep completeness" (for each case problem and each
  obligation i, perturbing the package at a node outside `mentions`
  of i and outside Dep leaves i's `Judged` unchanged); serial: "hole
  numerals" (every pinned witness and test fixture: list `Free n`
  numerals; on today's corpus candidates, completion's numbering equals
  `bindingsOf`'s when no effect hole exists); "A3 impact, type part"
  (today's Solved corpus candidates: count those `unsolvedKey` refuses;
  expected 0 as U8 observed; the effect part waits for tranche 2).
- [ ] **Step 2-3:** run; PASS or record the counts; commit. Each
  result is labeled bounded or corpus-observed.

### Task 16: switch the minting path (HELD, §18.145; not in this stage)

Held until tranche 2's read-back supplies effect packages. When it
runs, it wraps Task 11's tested `validate` rather than introducing new
orchestration.

**Files:** Domain/Verdict/Certified.purs, Certified/Internal.purs,
Strategy/Substitution.purs, Strategy/Online.purs (certificate
`EffectPackage`, Online.purs:72, :156-157), the old-`certify` callers:
test/r0-g0-support.mjs:68, :71, test/r0-online-support.mjs:70,
test/r0-g0-atoms.test.mjs:13, test/r0-u8-solved-form.test.mjs:16, :29
(their `Certified Valid` + `NoWitness` expectations become `Malformed`
under A3), Task 15's G0 oracle; row `r0-a2-old-minter`.

**Interfaces:**
```purescript
data Certified = Certified Valid Completed Compilation
certify ∷ RecordedProblem → EffectPackage → Either CheckRefusal Certified
certifiedPackage ∷ Certified → Completed
```
`certify`: `prerequisites`, G0 on `erase (settle P_in)`, `complete`
once, `judgeObligations`, the compilation computed once from
`witnessOf` with `coverage (flexDomain problem) problem` and stored.

- [ ] **Step 1: tests:** "no G0-only minter" (Substitution exports only
  the new `certify`; a source scan finds no other `Certified`
  construction); "compilation stored" (accessors return the fields
  passed at mint); then the census, window, RT8 and shadow dumps
  compared (r0-results-diff), every moved row listed for the author.
- [ ] **Step 2-4:** build, FAIL, implement, PASS; row: a second minter
  restored. Re-pin; AGENTS.md lists.
- [ ] **Step 5: commit**, every moved row named; a blocked/Solved
  movement stops for the author.

### Task 17: records and acceptance

**Files:** docs/progress.md, statements status line, closure checklist
A2 row, specification and packet status lines.

- [ ] **Step 1:** records name what ran, what is fixture-level, what
  waits for tranche 2, every owed check still owed, the open
  obligations (O-SUB, A1, P4, [FX008-5], Definition 4.2's
  sufficiency, U2-U8, U4) and the C6 decision.
- [ ] **Step 2:** the whole-branch review first (obligation
  semantics; gates, pins, live), its fixes, then one routine acceptance
  verify (lock, alone) on the reviewed tree; a tree changed after the
  verify is verified again (§18.145).
- [ ] **Step 3: commit.** Records state that Task 16 is held and that
  the existing minter remains joint-checker assurance under F14.

## Estimate

From this tranche's history: an implementer 0.25-0.29M (tranche 1's Tasks 7 and
9), a task review 0.10-0.20M, a fix round 0.08-0.21M, a whole-branch reviewer
0.16-0.28M, a routine verify about 30 minutes alone.

| Lane | Tasks | Dispatches (subagent) | Tokens (subagent) | Wall clock |
|---|---|---|---|---|
| Foundation | T0, T1, T2 | 7 | 0.8M | 4 h (serial) |
| A | T4 | 3 | 0.45M | 1.5 h |
| B | T3, T5, T12 | 9 | 1.3M | 5 h |
| C | T6, T7, T8, T9 | 12 | 1.8M | 6 h |
| D | T10 | 3 | 0.45M | 1.5 h |
| Integration | T11, verify | 3 | 0.5M + verify | 2.5 h |
| Tests | T13, T14, T15 | 9 | 1.2M | 2.5 h (parallel) |
| Gated | T16 | 3 | 0.6M | 3 h + census review |
| Close | T17, verify, 2 reviewers | 3 | 0.6M | 2.5 h |
| Controller | integration, re-pins, merges | — | 1.0M | — |
| **All-in, subagent** | 18 tasks | **52** | **8.0-10M** (without T16: 7.4-9M) | **20-26 h**, lanes A-D in parallel |
| **All-in, inline** | 18 tasks | **2** (the reviewers) | **4-5.5M** (session context resets likely) | **24-30 h** serial |

Routine verifies: three (after Task 11; after Task 16 if authorized;
Task 17), about 30 minutes each alone, more with a failure.

Assumptions: the §2.2 representation is approved unchanged (Q1);
tranche 2's read-back is not in this plan; T16 is either held or runs
once; lane C's five tasks stay under 250 lines per module. Runs over
if: the representation changes after Task 1 (every lane reworks);
Task 16 moves census rows the author must review; a verify fails (each
failure about 1 h and 0.1-0.2M); the bounded tests of Task 6 grow
slow; the M-B collector disagrees and needs investigation (a stop for
the author, not an in-scope fix).

Recommended execution: subagent (subagent-plan-execution), because
the lanes split cleanly after Tasks 1-2's frozen interfaces, the
trusted-surface changes need independent task review, and a shipped
mistake in trusted code can certify a wrong program. The spend is
substantial (about 8-10M tokens, about 52 dispatches): it needs the
author's yes.

## Self-review (run; fixes applied inline)

1. Spec coverage: §2 (T1, T2, T4), §3 (T4, T5), §4 (T11, T16), §4.1
   (T3), §4.2 (T2, T9), §5 (T5, T11), §5.1 (T10), §6 (T12), §7 (T16),
   §8 (T1, T16), §9 (T7, T8, T9), §10 (constraints, T5), §11 (T6, T15,
   T13), §12 C1-C16 (Review Focus). Gap found and fixed: the
   hole-numbering pin check had no task; added to T15.
2. Step scan: bodies omitted where signatures and tests determine them;
   Definition 4.2's position (last, `limit: true`) and Dep's edges are
   fixed by the spec and cited, not re-derived.
3. Type consistency: `CheckAt`, `Failure`, `Judged`, `Completed`,
   `settledOf` used with one spelling throughout; `KeyEffect` avoids
   Domain.Row's `EffectKey`; `CheckAt` avoids `MarkRef`'s `At`.
4. Review Focus: five uncovered input classes pinned to T11, T7, T5,
   T6, T4.
5. Proportion: about half the specification's length; no function
   bodies.
6. Provenance: every component has a line; every adapted or invented
   line names an approval that exists (§18.85, §18.139, §18.141,
   §18.143, statements §11) and its evidence.
7. Verified premise: not a bug fix; none.
