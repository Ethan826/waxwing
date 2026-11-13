# Census analysis for a first lift (2026-11-12)

Evidence only, authorized by dossier §18.188. No src change and no lift
implemented. Source at 59e70fdb, the loss file as verified at 0e8f7adf
(§18.187).

## Inputs and method

- Existing measurements, not rerun: the whole-program loss file
  (test/fixtures/r0/t2-replacement-losses.json, kept current by its
  serial test), the census (test/fixtures/r0/census.json), the FX008
  probe tables and the R0 fixtures' recorded phase.
  research/r0-census-analysis/analyze.mjs reads them and splits each
  blocker's `decide` reason into causes. A reason it does not recognize
  throws, so no cause is dropped. The per-program result, with each
  blocking declaration's causes, is committed as
  research/r0-census-analysis/lost-programs.json.
- A rescue counts only when every cause of every blocking declaration is
  lifted.
- One new measurement, where evidence was missing: whether lifting a
  marker would expose a hidden later blocker (an inference failure, a
  read fault, a validator refusal) that the marker hides today. In an
  isolated copy of the repository, the compiled rule 1
  (Decide/Reason.purs `ordinary`) was patched to drop chosen marker
  kinds, and the whole-program runner was run over every source. Output:
  .build/evidence/2026-11-12-census-analysis/ (suppress-*.json,
  suppression-summary.json). The unpatched baseline in the copy
  reproduces the pinned losses exactly (252 lost, plus FX032). This
  measures what remains in the way. It is not a soundness claim: with a
  marker gone, `decide` may accept for reasons the marker exists to
  question.

## Blocker sets

Every lost program's causes are among nine. The program counts per
cause equal the census categories exactly (checked): DataApplication
143, HandlerType 102, FailFamily 41, Deferred 41, EffectArgument 31.
The other four come from the effect read-back and checker:
UnframedInstall 8, ForcedTail 4, UnreadImage 2, RequirementAtoms 1.

Exact cause sets, by program:

| Programs | Cause set |
|---|---|
| 121 | DataApplication |
| 32 | HandlerType |
| 16 | Deferred + FailFamily + HandlerType |
| 14 | DataApplication + EffectArgument + HandlerType |
| 13 | FailFamily |
| 12 | Deferred + HandlerType |
| 8 | Deferred |
| 6 | EffectArgument + HandlerType |
| 4 | EffectArgument + HandlerType + UnframedInstall |
| 3 | HandlerType + UnframedInstall |
| 2 each | UnreadImage; Deferred + ForcedTail + HandlerType; FailFamily + HandlerType; EffectArgument; DataApplication + HandlerType; DataApplication + FailFamily; Deferred + EffectArgument + FailFamily + HandlerType; DataApplication + FailFamily + HandlerType |
| 1 each | ForcedTail + HandlerType; RequirementAtoms; Deferred + FailFamily + ForcedTail + HandlerType; FailFamily + HandlerType + UnframedInstall; DataApplication + EffectArgument; EffectArgument + FailFamily + HandlerType; DataApplication + EffectArgument + FailFamily + HandlerType |

DataApplication's 143 programs split cleanly: 121 have no other cause.
The other 22 also carry effect causes (HandlerType in 19 of them).

## Rescues

Each lift alone: DataApplication 121, HandlerType 32, FailFamily 13,
Deferred 8, EffectArgument 2, UnreadImage 2, RequirementAtoms 1,
UnframedInstall 0, ForcedTail 0.

The best combination of each size (out of all 511):

| Lifts | Rescued | Combination |
|---|---|---|
| 1 | 121 | DataApplication |
| 2 | 155 | + HandlerType |
| 3 | 178 | + EffectArgument |
| 4 | 210 | DataApplication + HandlerType + Deferred + FailFamily |
| 5 | 237 | + EffectArgument (all five markers) |
| 6 | 245 | + UnframedInstall |
| 7 | 249 | + ForcedTail |
| 8 | 251 | + UnreadImage |
| 9 | 252 | + RequirementAtoms |

The four effect markers together (HandlerType, Deferred, FailFamily,
EffectArgument) rescue 94 without DataApplication. Adding
UnframedInstall and ForcedTail brings that to 106.

Marker suppression (measured): with DataApplication's marker dropped,
all 121 programs it alone blocks are solved. With HandlerType's, all 32.
With the four effect markers, all 94. With every marker, all 237. In
every scope no program stays blocked for another reason, and no other
program changes. So nothing beyond the markers stands in the way for
these programs, and each count above is reached exactly once the
markers' meaning is earned. For handler types the caution is sharp:
recording handler rows and marks is specified but unbuilt
(r0-amin-statements.md F3). With the marker dropped, `decide` accepts
handler programs whose effect obligations are not yet recorded. That is
the work the marker stands for, and it is not evidence of safety.

## What the lost programs are

| Tier | Programs | Evidence |
|---|---|---|
| Shipped examples | 5 | examples/functions, lists, records, services, text; pinned by compiler, fx-services and text-literal tests |
| Editor fixture | 1 | editors/vscode/fixtures/effect-namespaces.wxw; runs, output not pinned by a test |
| Tested valid: execution oracle | 90 | test/poly-programs.mjs (60), test/fn-programs.mjs (30): executed and compared with the reference interpreter |
| Tested valid: expected output | 42 | fx-run, fx-block, fx-task7, fx-cleanup, fx-scale, fx-services programs, each with its pinned stdout |
| Tested valid: probe pinned ok | 52 | test/fx008-probes, each pinned `ok` with its output in the probe tables (FX008 outcome) |
| Test programs, accepted by their tests | 19 | fx008-defer (15), fx008-nofail-k (4): run or checked accepted by passing tests; not each traced to an assertion here |
| Fixtures pinned compiling | 23 | test/fixtures/r0 audit and erased fixtures, `phase: compiled` |
| Unclassified | 20 | 15 C001 baseline programs (docs/plans/2026-10-21-c001-explicit), 5 composition-assessment programs (research/): run, but no test pins their intent |
| Known defects | 0 | FX032 is the one known defect, outside the 252 (class `knownDefect`) |

No lost program holds a declaration in the known-defect registry
(test/r0-shadow-known.mjs `defects`). Its other entries are refused
today, so they are not losses.

By scope:
- DataApplication's 121: 90 execution-oracle, 9 expected-output, 7
  fixtures, 13 unclassified, and 2 shipped examples (functions, lists).
- The four effect markers' 94: 29 probes, 28 expected-output, 16 test
  programs, 15 fixtures, 5 unclassified, and 1 shipped example (text).
- UnframedInstall and ForcedTail add 12 more, including examples/
  services.wxw and the editor fixture.

## Reconciliation: the census's 256 and the 252 losses

- The census union holds 256 programs. 250 of them are lost under
  `decide`.
- The other 6 are the ErasedRow-only fixtures
  (test/fixtures/r0/erased/form.annotation-label, form.callee-signature,
  form.constructor-field, form.own-signature,
  obligation-annotation.control, obligation-record.control). The census
  counts erased rows as a blocking category because their narrowing is
  not approved (r0-census.md §2, "counted, not ruled on"), and these 6
  have no other category. `decide` implements no erased-row block, so
  it solves every declaration in them, and they are not lost. Whether
  `decide` should hold them is the open G-erased question. It is not
  settled here.
- The census's ErasedRow category covers 72 programs. The other 66 are
  lost through other causes.
- 2 lost programs are outside the census: c7 and q7
  (`statsEvidence`, UnreadImage, a read-back fault the census does not
  detect).
- 250 + 2 = 252. Every census program is in the loss file.
- For the record: docs/plans/r0-census.md's prose still quotes the
  2026-10-23 figures (251 of 743, 245 without ErasedRow). The pinned
  census.json, checked by the serial test, holds 256 of 751.

## Candidate scopes

No design or cost estimate exists for any lift (the search behind
docs/plans/2026-11-12-replacement-losses.md). Costs below are labeled.
The only recorded costs are adjacent: read-back Stage A design about
1.1M tokens (§18.154), Stage B 4.9-6.8M (§18.155), activation
prerequisites 1.8-3.0M (activation packet).

### A. Data application: the free-constructor model

- Rescues 121 (measured by suppression): 90 execution-oracle, 9
  expected-output, 7 fixtures, 13 unclassified, and the shipped
  examples functions and lists. That is 48 percent of the losses with
  one marker. Combined with HandlerType it rescues 155, and with all
  five markers 237.
- What the marker stands for: `app t [args]` (any `Option(a)`-like use)
  has no model in `ValidR`. The R0 plan's destination E names "the
  free-constructor model (for DataApplication and DataOverRecords)" and
  per-kind slice arguments (G-exempt) among what the exemptions must
  earn.
- Prerequisites: G-exempt's per-kind argument for this kind; the `GA`
  extension of the ground model with free constructor nodes, with VR-sub
  and VR-CX restated over it (docs/plans/r0-validr-draft.md §5.2-5.3,
  §7). It is a draft, not approved.
- Published parts: free constructor nodes as a term algebra (the
  Herbrand universe), and homomorphisms preserving satisfied equations
  (Birkhoff 1935), as the draft's provenance section cites. Little
  invented machinery is expected. That is a judgement to confirm in
  design, not a measurement.
- Rulings: §18.69 Q3 keeps every outside kind blocking a whole-
  declaration Solved. The plan says the proof and design work for
  destination E "is unauthorized today". Lifting needs the author's
  authorization, which this document does not ask for beyond
  recommending it.
- Design cost: unknown, with no recorded estimate. The obligations
  under the proof-dossier policy are statements first, two-stage
  approval, Lean for the homomorphism lemmas (the draft names two) and
  VR-CX's restatement, and an adversarial procedure review. Judged
  smaller than the read-back design (about 1.1M), since it is pure (no
  effects) and the draft exists. That is an analogy, not an estimate.

### B. Effect markers: handler types with Deferred, FailFamily and EffectArgument

- Rescues 94 (measured by suppression). With UnframedInstall and
  ForcedTail, 106: the services example, the editor fixture and 10 more
  test programs.
- Prerequisites: handler rows and marks recorded in generation (F3:
  specified, unbuilt), the effect read-back and validator for handler
  types, Deferred's row consumption (modeled in the statements, still a
  marker), and the conservative FailFamily and EffectArgument markers
  narrowed. For the 12 extra programs: UnframedInstall (a ruled hard
  blocker, A2 specification D11; lifting not authorized, §18.139) and
  ForcedTail (E4′; reconsidering it is separate work, §18.157).
- Rulings: §18.96 and §18.99 keep `Outside HandlerType`. §18.70 sets
  earned exemptions as the destination.
- Design cost: unknown, with no recorded estimate. By analogy with the
  read-back (Stage A design about 1.1M, Stage B build 4.9-6.8M), the
  design alone is likely in the low millions and the full lift several
  million. That is an analogy, not an estimate.
- Handler types alone (32 programs, the text example among them) need
  most of the same prerequisites, so a narrower B saves little design.

### C. A, then B

237 programs (94 percent of the losses), with the remaining 15 needing
UnframedInstall, ForcedTail, UnreadImage or RequirementAtoms. The
cost is the sum of A and B. Both are unknown.

### Small items, not scopes

UnreadImage rescues 2 unclassified research programs. RequirementAtoms
rescues the records example, after the open generic-`show` policy
ruling (closure checklist A7). Neither is worth a first scope.

## Recommendation

Scope A first. It rescues the most programs for one cause (121; 2
shipped examples, 99 with tested output or oracle checks). Its programs
are pure, so it touches no effect machinery. Suppression shows nothing
else blocks them. Its parts are published, and a draft of the model
already exists. B needs unbuilt recording (F3) and several lifts at
once before it rescues comparable numbers. Before A's design starts,
the author would need to authorize it, since the plan marks destination
E's design unauthorized. The first step would be a statements-first
design under the proof-dossier policy, with its cost estimated and
brought back before any proof work.

Criterion 2 stays unmet. Live replacement, milestone changes, F14's
retirement and pushing stay held.
