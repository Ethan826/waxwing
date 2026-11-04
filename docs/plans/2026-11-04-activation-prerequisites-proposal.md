# Activation prerequisites: implementation proposal (2026-11-04)

Status: proposal only, for the author's approval (dossier §18.159,
criterion 4). Nothing here is implemented, built or run. It covers the
five items §18.159 keeps as activation blockers: BACKLOG R034 (2) and
(10), and R036 (1), (2) and (3). The minting switch (A2 plan Task 16),
F14's retirement, live replacement and any push are out of scope.

Written from code read at 354ce6e on branch ap/proposal. No build, test,
verify, perf or corpus run was made, because a performance run is in
progress. Every prediction that needs a run says so ("to be checked by a
run"); everything else is read from the code and cites file:line.

## Summary

| Item | Change | Frozen validator | Trusted surface | Online decision |
|---|---|---|---|---|
| R034 (2) | merge every `EffectsUnchecked` in one reason into one entry | no | Decide.Reason: token review, pin unchanged | none |
| R034 (10) | check 4 also requires each owner once at its identity | yes: Effects.RecordCompanions (needs a freeze exception) | token review, pin unchanged | none on the corpus (predicted) |
| R036 (3) | a conversion failure gets its own read fault | no | none | none |
| R036 (2) | the trace's row fallback removed by type; an unnumbered meta is a read fault | no | none (Online.purs source unchanged) | none |
| R036 (1) | the read-back's totality argument recorded and checked | no | none (option B touches Online.purs) | none |

Predicted pin movement: none, for every item. The predictions and the
runs that must confirm them are under each item and in "Verification".

## Ground rules applied

- Claims backed by checks: each design claim names its test, must-fail
  case or run. Each fix lands with a restored-defect row.
- Published primitives: each algorithmic component names its source.
  Invented compositions are flagged, with the standard alternative.
- Inject implementations: the trace's resolver is passed in as a value
  (R036 (2)). No flag selects behavior anywhere.
- Records: this proposal names the spec, plan and BACKLOG text each item
  needs. The controller writes those records, not the implementer.
- Activation gate criterion 4
  (docs/plans/2026-11-03-a2-activation-gate.md) counts R034 (2) and (10)
  only through rows whose names carry `r034-2` or `r034-10` as a
  hyphen-separated part (test/r0-t2-activation-gate.mjs:22-23, :40). The
  row names below follow that rule.

## R034 (2): duplicate `EffectsUnchecked` kinds in one reason

### Defect

`reason` joins the pre-search blocks with every strategy's decline and
removes duplicates by structural equality only:

- src/Features/Check/Decide/Reason.purs:97-98: `withDeclines found =
  Unsupported (NonEmptyArray.nubEq (NonEmptyArray.appendArray found
  (declines readings)))`.
- :77-80: `unchecked` puts one `EffectsUnchecked kinds` in the blocks,
  with every recorded unsupported kind.
- src/Features/Check/Decide/Reading.purs:157 and :162-164: a candidate
  refused `NotCertifiable (UnsupportedRecorded kind)` declines with
  `EffectsUnchecked [ kind ]`, one kind each.

So a problem recording kinds k1 and k2 whose candidate is refused for
k1 gets `[EffectsUnchecked [k1, k2], EffectsUnchecked [k1]]`. The two
entries are unequal, so `nubEq` keeps both. Statements §7 ("Routing")
and Reason.purs:73-76 say `EffectsUnchecked` names each kind once. The
same join without the blocks is at Reason.purs:116-118 (`unlimited`).

Unreachable today. The only producer of `UnsupportedRecorded` is
Effects/Validate.purs:72-73. Online's check calls the G0-only `certify`
(Online.purs:180-181), and no decision path calls `validate`. The
defect becomes reachable when Task 16 makes `certify` validate, which
is why the A2 plan's Task 16 guards require this fix first. The A2
ledger recorded it at Task 12's review: "two unsupported kinds can list
EffectsUnchecked [k1,k2] and [k1] in one reason (only after Task 16)".

### Change

A private `merged ∷ Array Unsupport → Array Unsupport` in
Decide/Reason.purs replaces every `EffectsUnchecked` entry with one
entry at the first one's position. That entry's kinds are the
concatenation in first-occurrence order with duplicates removed. Every
other entry keeps its place, and `nubEq` then runs as now. `merged` is
applied in `withDeclines` (:97-98) and in `unlimited` (:117-118). It
matches every `Unsupport` constructor by name, with no wildcard arm, so
a new constructor fails to compile until it is placed (the style of
Effects/Record.purs:104). An `EffectsUnchecked []` contributes no kind
but still counts as an entry to merge.

Source: set union over kinds (the join of the powerset semilattice,
which is idempotent, commutative and associative), kept in first
occurrence order for determinism. No invented machinery. The order is
an implementation identity, as in §18.155 (3).

### Tests

test/r0-a2-decide.test.mjs (or a new test/r0-a2-r034-2.test.mjs if the
file would pass 250 lines), each shown failing before the change:

- "kinds merged": blocks `[EffectsUnchecked [k1, k2]]`, one strategy
  declining `EffectsUnchecked [k1]` → `Unsupported [EffectsUnchecked
  [k1, k2]]`. Built with two distinct `OperationWithRow` kinds or with
  `OperationWithRow` and `UnframedInstall`, using injected strategies as
  Task 12's "C3" test does.
- "new kind appended": blocks `[EffectsUnchecked [k1]]`, decline
  `[k2]` → `[EffectsUnchecked [k1, k2]]`. This separates the fix from a
  rule that keeps only the block's entry.
- "others keep their place": `[RecordDefective p, EffectsUnchecked
  [k1], Outside o]` plus a decline `[k2]` keeps `RecordDefective`
  first and `Outside` after the merged entry.
- "unlimited path": with no blocks, two strategies declining `[k1]` and
  `[k2]` → one entry `[k1, k2]`. Only injected strategies reach this
  path: a real candidate-level `EffectsUnchecked` implies a recorded
  `Unsupported` obligation, so `unchecked` blocks and `withDeclines`
  runs instead. The test guards the path; it does not show it occurs.
- Property (seeded, bounded, with the grammar fixed before running: up
  to 6 entries drawn from every `Unsupport` constructor, with kinds from
  3 values and `EffectsUnchecked []` included): at most one
  `EffectsUnchecked`; its kinds are distinct and
  equal the union of the input's; every other distinct entry appears
  once and in input order; `merged` is idempotent.

Restored-defect rows, in a new scripts/regression-r0-a2-prerequisites.mjs
spread into `a2Rows` (scripts/regression-r0-a2.mjs), with a probe in a
new test/regression-r0-a2-prerequisites.mjs:

- `r0-a2-r034-2-unmerged`: `withDeclines` without `merged`. The probe
  expects two `EffectsUnchecked` entries.
- `r0-a2-r034-2-unlimited-unmerged`: the same for `unlimited`.

The gate status file names the first row for "R034 (2)".

### Pins

All unchanged: problem, first diagnostics, census, window, RT8, shadow,
the effect pin, trace inertness and t2-honest.json. The reason is that
no corpus reason can contain a candidate-level `EffectsUnchecked`
today, as shown above. That is argued from the code; the census, window,
RT8 and shadow dumps must show no moved row (r0-results-diff, as A2
Task 12 did), **to be checked by a run**. The honest pin is untouched
because the honest report runs `validate` directly and reads no Decide
reason.

Effect on the criterion 5 comparison. That comparison has now run
(.build/evidence/2026-11-04-comparison/summary.md in the r0-t2-d1
worktree, git-ignored): 16 movements, all on t2-honest.json's gap
lists, fx032#g's a reason-only window movement. Under minting, this
fix changes a reason only for a problem recording two or more distinct
unsupported kinds. How many corpus problems do is not known: it is
**to be counted by a run** (a scan of the recorded problems), and the
comparison should be rerun or its reason rows re-read after this lands.

### Surfaces and decisions

Decide.Reason is pinned (scripts/trusted-surface.json) and
review-required. Its export list does not change, so the pin does not
move, but the diff needs token review (docs/engineering.md:203-206).
This is not the frozen validator. Only the content of an Unresolved
reason changes, and only when blocks or declines contain more than one
`EffectsUnchecked`. Verdicts do not change, so no Online acceptance
decision changes.

## R034 (10): a duplicated owner

### Defect

Record check 4 requires each companion an owner needs to occur exactly
once (src/Features/Check/Strategy/Effects/RecordCompanions.purs:98-107,
`once`). Nothing counts the owners themselves. When an `Install`,
`HandlerLit` or `Defer` is recorded twice at one identity with its
companions recorded once, each copy finds every companion once and
passes. `companionsOf` (:87-95) only collects requirements, and the
`unowned` arm (:108-109) only asks whether some owner requires a
companion. Effects/Record.purs:149 applies check 4 per entry, and no
other check sees a repeated obligation: check 6
(RecordDuplicates.purs:21-36) reads `flexEff` and `positions` only.

Generation is checked separately. test/r0-obligations-unique.mjs
(through test/r0-obligations-equal.test.mjs) rejects a repeated
provenance over the corpus, as Domain/Recorded/Effect.purs:145-148
states. That is a JS test of generation's output. It does not make the
trusted validator reject a forged or defective record, which is what
§18.150 asks for: a duplicated owner "is not thereby valid".

### Change

Extend check 4. An owner violates it if another owner obligation has
the same provenance. Owners are the obligations `ownerOf` maps to
`Just`, and the provenance is `AtSite { decl, path, rule, role }`. The
change is in RecordCompanions.purs:

- `Companions` gains `owners ∷ Array Provenance`, built in
  `companionsOf` from the obligations `ownerOf` accepts. The newtype
  stays opaque and the export list is unchanged.
- In `companionWrong`'s `owned` arm, the owner is wrong if its
  companions are not each present once, or if its provenance occurs
  more than once in `owners`.

The comparison uses `Eq Provenance`. Domain.Recorded.Effect derives no
`Ord` for it (Effect.purs:249), and that file is at 250 lines
(R034 (7)), so a Map count would need a split first. The scan is
quadratic per declaration, like check 4's companion scan (R034 (11)).
No performance claim is made. The defect is reported at check 4, at the
provenance of the first copy in recorded order (Record.purs:125,
`findMap`).

Source: a multiplicity check, "each key occurs exactly once" (a bag's
count). It is the same primitive check 4 already applies to companions
(`once`). No invented machinery.

Identity, not value: two owners with one provenance are rejected even
when their values differ. A copy whose value differs usually fails
today too, because its companions are missing, but not always (case (b)
below). See open question 2.

Owners only, per R034 (10). The provenance rule Effect.purs:145-148
states covers every obligation kind, and this change does not enforce
it: a duplicated `Equal` (at `BesideAtom` or `AtSite`) or a duplicated
`Consume` at `AtCall` or `AtPerform` passes today and still passes
after (the reviewer probed both). The stronger rule, "no two
obligations share a provenance" in record validation, is put to the
author as a named alternative (open question 1).

Coarsening, recorded: "owner repeated" is folded into check 4's index
and provenance, so the report does not say whether a companion or the
owner was miscounted. The Record.purs header and spec §4.1 say so.

The header comments of RecordCompanions.purs (:20-23) and Record.purs
(:27-30) gain the clause. The A2 specification §4.1 check 4 bullet
needs the same clause; that is the controller's record.

### Tests

test/r0-a2-companions.test.mjs, plus a cases module beside
test/regression-r0-a2-companions.mjs (174 lines) if needed. Each case
marked RED is shown failing before the change. The distinguishing
examples name what today, this proposal, a value-based rule and the
stronger every-obligation rule do:

| Case | Today | Proposal | Value rule | Every-obligation rule |
|---|---|---|---|---|
| (a) an `MHandler` Install ×2, companions once | accepts (RED) | check 4 | check 4 | rejects |
| (b) an `MHandler` Install, plus a non-handler Install at the same identity with its `UnframedWith` companion | accepts (RED) | check 4 | accepts | rejects |
| (c) `Equal` ×2, or `Consume` at `AtCall` ×2 | accepts | accepts | accepts | rejects |
| (d) a `HandlerLit` with zero clause rows ×2 (no companions at all) | accepts (RED) | check 4 | check 4 | rejects |
| (e) a `HandlerLit` ×2 and a `Defer` ×2, companions once | accepts (RED) | check 4 | check 4 | rejects |
| (f) owner and companions all twice | check 4 (companion count) | check 4 | check 4 | rejects |
| (g) two Installs at different `with` paths, each with companions | accepts | accepts | accepts | accepts |
| (h) a HandlerLit at a literal's path and an Install at its `with` path | accepts | accepts | accepts | accepts |

(b) separates identity from value: the second Install is non-handler,
so its only companion is `UnframedWith` (RecordCompanions.purs:144),
which is present, and today's check 4 passes it. Without that
companion it would already fail check 4 today, so the fixture must
include it. (c) is kept as a test that the proposal accepts it, so a
later widening is a visible change. (d) shows the count does not rest
on companions. (f) is the nearest weaker case and must stay a defect.
- The serial corpus test (test/r0-a2-record-corpus.serial.test.mjs)
  keeps "the corpus records no defect" (**to be checked by a run**).

Restored-defect row in scripts/regression-r0-a2-prerequisites.mjs:
`r0-a2-r034-10-owner-twice`, `companionWrong` without the owner count.
The probe expects `Nothing` for the twice-recorded `Install`. The gate
status file names it for "R034 (10)".

### Pins

All unchanged, predicted. Generation and the records are untouched, so
the problem pin, effect pin, first diagnostics and trace inertness
cannot move. `recordDefect` feeds Decide's `blocks`
(Reason.purs:53-54), so census, window, RT8 and shadow would move only
for a corpus problem with a repeated owner provenance. The provenance
uniqueness test passed in the verify at 7e0492b, so none is predicted.
The honest pin's floors (2805, 2813) are predicted unchanged for the
same reason. All of this is **to be checked by a run**: the record-corpus
serial test, the dump comparison and test/r0-t2-honest.serial.test.mjs.

### Surfaces and decisions

This touches the frozen validator. Features.Check.Strategy.Effects.
RecordCompanions is A2 lane code, pinned and review-required. Its export
list is unchanged, so the pin does not move, but the diff needs token
review. §18.155 (2) made check 6 "one explicit exception to the
validator freeze", so this needs a second exception (open question 1).
No Online acceptance decision changes on the corpus (predicted, above).
In principle, a problem with a duplicated owner that a strategy solves
would go from Solved to Unresolved. That is the intended fail-closed
backstop. Any such problem on the corpus is a stop.

## R036 (3): a conversion failure collapsed into `Unread`

Correction (adversarial review): the first version said every
remaining `UnreadImage` cause means "no value reaches v". That was
false and is withdrawn; the causes are stated accurately below.

### Defect

- src/Features/Check/Strategy/ReadBack/EffectRows.purs:69-73: `readOne`
  maps a conversion failure (`Left (UnmarkedLabel effect)` from
  Convert.purs:84-85) to `Unread variable`. That is the same fault as
  "no source reads v", so the two causes cannot be told apart.
- ReadBack/Images.purs:94-97: `live name = hush (liveAt …) >>=
  converted`, with `converted = hush <<< convertTy terms <<< liveType`.
  Both the position failure and the conversion failure become `Nothing`,
  then `UnreadImage v` (:104, :122). The comment at :95-96 records the
  conversion half as a coarsening forced by ReadFault's constructors.

### Change

ReadBack/Fault.purs gains two constructors. The names are not prefixed
`Unread` or `UnreadImage`, because the gate admits read faults by the
prefix `UnreadImage ` (test/r0-t2-activation-pin.mjs:119). A new cause
must not pass as one of the two ruled `UnreadImage` declarations.

- `RowUnconverted EVar EffectRef`: a value read for v that has a user
  label with no term.
- `ImageUnconverted Var EffectRef`: the same for a type image.

EffectRows.readOne maps `UnmarkedLabel e` to `RowUnconverted variable
e`. Images makes `live` return `Either ReadFault PTy`: a `liveAt`
failure stays `UnreadImage v`, and a conversion failure is
`ImageUnconverted v e`. Both arms of `UnmarkedLabel` are covered: a
user label that is `Unmarked` (Convert.purs:84) and one whose mark the
injected terms do not read (:85).

The other `UnreadImage` causes stay one constructor, as a recorded
coarsening in Fault.purs's comment. They are of two kinds:

- No value reaches v: no `vars` entry (Images.purs:102), or no live
  value at v's position (`liveAt` failing, :94, raised at :122).
- A value reaches v but the package cannot hold it: an auxiliary
  needing rows, with no row-free image (Images.purs:121, `rowFree`;
  this is the statsEvidence cause); a record-row variable whose image
  is no record (:109); and, in ReadBack/Bound.purs, a θ-bound hole as a
  row tail (:80), a merged record with repeated labels (:107), a bound
  tail that is not a record (:119) and a bound value with no row-free
  image (:145).

Fault.purs:16-17 already says the second kind ("a hole θ binds to a
value the package cannot hold"); that clause stays. Splitting Bound's
four causes into their own constructors is an option (open question
5); it would leave the statsEvidence faults alone only if their
`rowFree` cause kept the name `UnreadImage`.

No algorithm. One fault per cause, as R036 (3) asks.

### Tests

- test/r0-t2-rows.test.mjs: "an unmarked user label is RowUnconverted"
  (a planted live row with an `Unmarked` user label; RED today:
  `Unread`), and "no source is still Unread"
  (test/r0-t2-rows-checks.mjs:80's case is unchanged).
- test/r0-t2-images.test.mjs: "an unmarked label at a position is
  ImageUnconverted" (RED today: `UnreadImage`). The existing planted
  auxiliary cases (:124-132) stay `UnreadImage`. Any of them that is
  in fact a conversion failure would change name; the implementer lists
  each one that does and why.
- test/r0-t2-online.test.mjs:18 and test/r0-t2-online-checks.mjs:43-46
  keep `UnreadImage` for the two statsEvidence declarations (an
  auxiliary cause, below).

Restored-defect rows in scripts/regression-r0-t2-prerequisites.mjs (new,
spread into `t2Rows`):

- `r0-t2-r036-3-row-coarse`: readOne maps the conversion failure back to
  `Unread`.
- `r0-t2-r036-3-image-coarse`: Images hushes the conversion again.

Existing rows affected: `r0-t2-package-mark-clash`
(scripts/regression-r0-t2-package.mjs:23-26) expects the probe message
`["Unread"]` once the clash guard is inverted. If the unguarded clash
now reaches a conversion failure, the message becomes
`["RowUnconverted"]`. The implementer runs the probe, updates the
regex to the observed fault and records why; detection is kept because
the row still fails with the defect restored (the guard inverted).

### Pins

All unchanged, predicted. The read-back is reached only through the
certificate's `effects`, which no verdict reads (Online.purs:80-87), so
problem, first diagnostics, census, window, RT8, shadow, the effect pin
and trace inertness cannot move. t2-honest.json lists no `Unread`. Its
two `UnreadImage` entries are the statsEvidence auxiliaries, which
test/r0-t2-images-corpus.serial.test.mjs:128-130 classifies as
"UnreadImage auxiliary SortRow", not as conversions. So the pin is
predicted unchanged. **To be checked by a run**:
test/r0-t2-honest.serial.test.mjs and the images corpus test. A new
fault on the corpus is a stop under §18.155 (7).

### Surfaces and decisions

None. ReadBack.Fault, EffectRows and Images are untrusted search, not
pinned and not review-required. Online's decision is G0's alone, so no
acceptance changes. After activation the finer fault is what
§18.159 criterion 7 preserves when a package is missing.

## R036 (2): two fallbacks that are not fail-closed

### Defect

- src/Features/Check/Trace/Types.purs:172-175: `onRow` changes a row by
  wrapping it in `TFun TUnit row TUnit`, applying a type function and
  unwrapping. If the result is not an arrow, it returns the input row,
  unresolved and not renumbered. The comment (:169-171) argues that the
  arm is never taken: `substitute` keeps an arrow an arrow
  (Domain/Type/Core.purs:152-170).
- src/Features/Check/Trace.purs:105-106: `finish` renumbers with
  `Hole (maybe meta identity (Map.lookup meta numbers))`. A meta that is
  not in `numbers` stays raw. A raw meta is an `Int` in the same space
  as hole numbers, so it can collide with one. `numbers` comes from
  `extended` (Trace/Types.purs:151-162), which walks with `foldHoles`,
  while the renaming walks with `substitute`. The two walks are
  different code, and nothing checks that they visit the same metas.
- `finish` runs on every `checkFunction`, compile included
  (Features/Check/Function.purs:117-118, a strict record field).

### Change

1. Rows by type, not by a wrapped arrow. `finish` takes an injected
   `{ ty ∷ Ty Open → Ty Open, row ∷ TyRow Open → TyRow Open }` for the
   resolve pass. `onRow` is deleted, and with it the fallback arm.
   Function.purs builds the row resolver with `Subst.resolveRow`
   (Subst.purs:203) between two row renames, each `substituteRow
   { types: TVar <<< f, rows: openRow <<< f }` (Domain/Type/Core.purs:176;
   the same substitution `rename` uses, :112-114). It does not reuse
   Scheme.flexibleRow (Scheme.purs:141-144), which has its own
   arrow-wrapping fallback. Nothing can fall back, because a row
   function returns a row.
2. An unnumbered meta is a fault. A new module Domain/Type/Traverse.purs
   (Core.purs is at 240 lines) holds `traverseTy ∷ ∀ f v w. Applicative
   f ⇒ Ord w ⇒ (v → f w) → Ty v → f (Ty w)` and `traverseRow`.
   - Spines: an `Applicative` cannot drive `tailRecM`, which needs
     `MonadRec`. So the spine is taken by the existing pure loop
     (`stagesThrough identity`, Core.purs:123-131), its stages array is
     traversed (`traverse`, a loop over the array), and the arrow is
     rebuilt with `foldStages` (Core.purs:135-140), as `substitute` does
     (:164-169). No recursion per arrow. (The alternative, `MonadRec f`
     with `tailRecM`, Freeman's "Stack safety for free", 2015, is not
     needed for `Either` and would narrow the type.)
   - Record tails are rebuilt with `spliceRecord` (Core.purs:194) so
     their order matches `rename`'s.
   - `finish` renumbers with `traverseTy` in `Either TraceFault`: a
     hole whose meta is not in `numbers` is `Left (Unnumbered meta)`.
     The rigid arm becomes explicit (`Rigid r → Right (Rigid r)`), with
     no `rigid → rigid` catch-all.
   - `mapTraced` becomes a traversal, `traverseTraced ∷ Applicative f ⇒
     { ty ∷ Ty Open → f (Ty Open), row ∷ TyRow Open → f (TyRow Open) }
     → Traced → f Traced`, through Map's and Array's `Traversable`
     instances. The resolve pass uses it with plain functions wrapped in
     `Right` (or a separate pure map of the same shape; the implementer
     chooses one and names it).
   - `finish` returns `Either TraceFault Traced`, and `Rechecked.trace`
     takes that type.
   - `TraceFault` lives in Features/Check/Trace/Types.purs. Trace.purs
     re-exports that module whole (`module Features.Check.Trace.Types`,
     Trace.purs:16), so scripts/structure-trace.mjs's `traceExports`
     (:49-51) does not change; its reviewer confirms that. That gate's
     rule (6) lets only Features.Check.Trace import Trace.Types, so
     Fault.purs, Package.purs and Function.purs reach `TraceFault` and
     `traverseTraced` through Features.Check.Trace's re-export.
3. Routing. `readEffects` and `readEffectsWith` (ReadBack/Package.purs)
   take `Either TraceFault Traced` and turn `Left` into a new
   `ReadFault`, `TraceUnfinished TraceFault`. It is ordered **after**
   `Declined` and before `MarkClash`: `Declined` is a fact of the
   problem alone (tranche 2 design §C.6; Package.purs:17-23), and on the
   `Declined` declarations (9 on the corpus loader, 10 on the effect
   pin's sources: 9 `UnframedInstall` and 1 `OperationWithRow`) a trace
   fault first would change the gate's fault name. Online.purs:139-141
   passes `found.trace` as before, so its source does not change.

Sources: the applicative traversal (McBride and Paterson, "Applicative
programming with effects", JFP 18(1), 2008), used as a renaming that can
fail. What its type gives, and no more: because `traverseTy` is
polymorphic in `v` and `w`, a `Ty w` in the output cannot hold a
variable of `Ty v` that did not pass through the function, so no unseen
raw meta can appear in the output (parametricity: Wadler, "Theorems for
free!", FPCA 1989). Parametricity does not show that every variable is
visited; an implementation could drop a subterm. That every variable is
visited is checked by the rename-agreement test below. Related
evidence, from the reviewer's bounded oracle (walks-oracle.mjs, in the
review's scratchpad, not in the repository): over 3 seeds × 20,000
samples of the fixed grammar, `foldHoles` and `rename` visited the same
metas with 0 disagreements, and a planted variant gave 3,399. That is
evidence that today's fallback is not reached on that grammar, not a
proof. No invented machinery. The alternatives are in open question 4.

### Tests

- test/r0-t2-trace.test.mjs: "an unnumbered meta is a fault" (a planted
  numbering missing one meta: `Left (Unnumbered m)`; RED today: the raw
  meta is kept); "a row is resolved as a row" (a trace row whose tail
  is bound in the final substitution comes back resolved); "a rigid is
  kept" (explicit arm).
- A new test/r0-type-traverse.test.mjs:
  - "traverseTy agrees with rename": for a total map, `traverseTy
    (Right <<< f) t == Right (rename f t)`, over every traced type in
    the trace test's fixtures and over a seeded generator of `Ty Open`.
    The grammar is fixed before running: arrows to depth 6, records with
    up to 3 tails, handlers with label arguments and with and without a
    clause row, data with type and row arguments, rows with label
    arguments and open or closed tails. This is the check that every
    variable is visited.
  - "a planted dropping traversal disagrees": a test copy that skips
    label arguments must fail the agreement test (the test's own
    must-fail case).
  - "a 1,000-deep spine does not overflow" (the shape used in
    test/poly-depth-timing.serial.test.mjs).
- test/r0-t2-package.test.mjs: "Declined before TraceUnfinished" (a
  `Left` trace plus an `Unsupported` obligation gives `Declined`) and
  "TraceUnfinished before MarkClash".
- Readers of the trace: 19 test files read `.trace` (some scripts
  mention it only as needle text), and `readEffects` or
  `readEffectsWith` has 17 call sites outside Package.purs (counts from
  the review's scan). The test readers move
  to one shared helper that unwraps `Right` and fails on `Left`; the
  call sites pass the `Either` or unwrap through it.
- scripts/r0-t2-trace-removal.mjs:57-62 matches the `finish` call
  text exactly and replaces it with an empty `Traced`. Its replacement
  becomes `Right { … }`. It is a reviewed artifact, and its
  edit-must-match check fails the build if it is missed.

Existing restored-defect rows whose needles T4 removes, and how each
keeps its detection:

- `r0-t2-trace-renumber` (scripts/regression-r0-t2-trace.mjs:10-15) and
  `r0-t2-package-shared` (scripts/regression-r0-t2-package.mjs:48-53)
  both edit Trace.purs:106's `maybe meta identity` line, which T4
  replaces. Each gets a new needle on the new renumber arm, restoring
  the same defect it restored before (a meta shared with the body no
  longer reads the body's hole), with its probe message unchanged
  (`["Apart"]` for package-shared).
- `r0-t2-rows-entry-finish` (scripts/regression-r0-t2-rows.mjs:58-64)
  edits Trace.purs:103's `mapTraced resolve raw { row = row }`. Its
  needle moves to the new resolve call, restoring "finish drops the
  declaration's row".
- New rows must not share a needle with these. The new meta row
  therefore restores a different defect from `r0-t2-trace-renumber`'s.

New restored-defect rows in scripts/regression-r0-t2-prerequisites.mjs:

- `r0-t2-r036-2-meta-raw`: the `Nothing` arm of the renumber lookup
  returns `Right (Hole meta)` instead of `Left (Unnumbered meta)`. The
  probe expects `Unnumbered` on the planted numbering. Its needle is the
  `Left (Unnumbered …)` line, which no existing row edits.
- `r0-t2-r036-2-row-unresolved`: Function.purs passes `identity` as the
  row resolver. The probe expects the resolved row test to fail.
- `r0-t2-r036-2-trace-first`: `TraceUnfinished` moved ahead of
  `Declined`. The probe expects the ordering test to fail.

### Pins

- Problem pin, census, window, RT8, shadow, effect pin: unchanged.
  Generation and Decide are untouched, and no verdict reads the trace.
- First diagnostics: unchanged. `finish` runs after every check in
  `checkFunction` and returns no diagnostic. A `Left` stays inside the
  `trace` field, so compile results do not depend on it.
- Trace inertness (test/fixtures/r0/t2-trace-inert.json): the digests
  hash `recheck`'s outcome without the `trace` field, so they are
  unchanged. The per-kind counts are unchanged if every corpus trace
  finishes `Right`. Today that is argued, not observed: the counts were
  taken through the fallbacks. **To be checked by a run**:
  test/r0-t2-trace-inert.serial.test.mjs. A `Left` on the corpus would
  mean `foldHoles` and `substitute` disagree, which is the defect this
  item exists to catch. It is a stop, and it is reported, not re-pinned.
- t2-honest.json: unchanged if no trace faults (same run).
- Compile cost: `finish` stays on the compile path with the same number
  of walks (`traverseTy` replaces `rename`). The constant factor of the
  `Either` traversal is not known. The in-progress `npm run perf` and
  any paired measurement taken before this lands describe a different
  tree (open question 7).

### Surfaces and decisions

Trace, Trace.Types, Function.purs, ReadBack.Package and the new
Domain.Type.Traverse are not pinned and not review-required. Function.purs
is the live checker, so the review checks that the change touches only
the `trace` field and the resolver passed to `finish`. Online.purs's
source is unchanged, so it needs no token review. No acceptance
decision changes.

## R036 (1): the eager read-back in Online

### Defect

src/Features/Check/Strategy/Online.purs:120-129: an accepted body
becomes `Candidate { unsettled, checked, holes, effects: packaged
problem found made }`. PureScript records are strict, so `packaged`
(:137-143, the whole effect read-back) runs inside the search, before
G0's check sees the candidate, although no verdict reads `effects`
today (:22-26, :80-87). A JS exception or a non-terminating loop in the
read-back would stop the run rather than lose a package. Statements §7
(T5-b) says a read-back that cannot build a package returns
`NoCandidate`, never something that stops the run. After activation
(Task 16), `certify` must read the package, so a thunk would only move
where a throw happens.

### Change (recommended: option A)

A. Record and check the totality argument for everything `packaged`
reaches. The first version listed only ReadBack's own modules; that
inventory was incomplete. The reviewer's source scan of ReadBack.Package's
import closure finds 71 src modules. Besides ReadBack's, it includes
Strategy.ReadBack (with Entailed, Entailed.Mgu, Entailed.Triangular,
Entailed.Merge, Mentions and Candidate), ReadBack.Type,
Effects.Package (`eraseTy`), Effects.Forced, MarkStore,
Features.Check.Search, Spine, Holes, Trace, Walk and Domain.* modules.
15 of them use `tailRec`. This proposal argues 6 (Least, Convert,
Bound, EffectMatch, EffectPlaces, Instances); about 9 have no argument
yet (Domain.Syntax, Domain.Type.Compare, Domain.Type.Core, Entailed.Mgu,
Entailed.Triangular, MarkStore, Search, Spine, Effects.Package). So the
closure and the loop list are not written into this proposal by hand:
the scan test derives both, and each listed loop gets its argument. The
table covers the module closure, so Mgu and Triangular get rows even
though `packaged` does not reach them at run time.

In pure PureScript running on Node, an exception can come from
partiality, from FFI (src's or a library's), from coercion that breaks
an invariant, or from the runtime itself (stack overflow as a
`RangeError`, memory exhaustion). A loop that does not end can come
only from recursion that is not well-founded.

- Closure, partiality and FFI: a scan test,
  test/structure-readback-total.test.mjs. It reads the compiled module
  graph, as scripts/forgery.mjs does, and takes the closure of
  ReadBack.Package. Over the src modules in it (`inSrc`, as
  forgery.mjs:40 does) it fails on an import of `Partial.Unsafe`,
  `Partial`, `Effect.Unsafe`, `Effect.Exception.Unsafe` or
  `Data.Array.Partial`, on a `Partial ⇒` constraint, on a src module
  that directly imports a member of forgery.mjs's `forgingModules`
  (`Unsafe.Coerce`, `Record.Unsafe` and the invariant-breaking Internal
  modules, :28-34), as forgery.mjs does, not on transitive membership
  (Data.Map itself depends on Data.Map.Internal; that scan already
  forbids such imports in src, so this is a cross-check), and on a src
  module
  with FFI. Today grep finds no partiality in the read-back or the trace,
  and the only src FFI module is Runtime.Node
  (scripts/foreign-surface.json), which is outside the closure. Library
  FFI (for example Data.Map's or Array's foreign code) is outside the
  scan; it is trusted as the package set is. Must fail: a planted
  fixture graph with each forbidden import, and one with a planted src
  FFI module.
- Loops: the same test lists every `tailRec`, `tailRecM` and
  `Rec.tailRec` use in the closure, by module and declaration, and
  compares the list with a reviewed table in the test, each row naming
  its termination argument. A new loop in the closure fails the test
  until its argument is added. The arguments already known:
  - Least.purs:152-155 `find`: parent links form a forest, because
    `union` (:140-150) links one root to a different root only
    (union-find, Galler and Fischer 1964). The chain to a root is finite.
  - Least.purs:158-166 `reaching`: Kleene iteration of a monotone map
    (`insertWith Set.union` only grows) on a finite lattice (sets of the
    finitely many constants per root). It reaches a fixpoint within
    roots × constants + 1 passes (Kleene; Davey and Priestley,
    "Introduction to Lattices and Order", ch. 8).
  - The spine loops (Convert.purs:105-111, Bound.purs:132,
    EffectMatch.purs:96, EffectPlaces.purs:136, Instances.purs:55, and
    the Domain.Type.Core ones): each step goes from a `TFun` (or
    `MArrow`) to its result, a strict subterm of a finite term.
  - The rest of the 15 (MarkStore, Search, Spine, Effects.Package,
    Compare and others the scan lists) get their arguments in T5; any
    that has none is a finding for the author.
  - Structural recursion over finite `Ty`, rows, arrays and maps needs
    no table row.
- Property checks for the two invariant-based loops, with fuel so a
  failure is a test failure, not a hang: the test uses copies of `find`
  and `reaching` with a step budget (nodes for `find`, roots ×
  constants + 1 passes for `reaching`) over the marks oracle's families
  (research/t2-read-back-design/marks-oracle.mjs). Running out of fuel
  fails the test. The production loops stay unchanged.
- Stack depth: the non-tail recursion in Convert, EffectMatch and
  Images goes as deep as a type's nesting outside arrow spines. A
  read-back fixture with a 1,000-deep data nesting, and the 1,000-deep
  spine of test/poly-depth-timing.serial.test.mjs, run through
  `readEffects`. **To be checked by a run**; if either overflows, that
  is a finding for the author, not a reason to raise a limit.
- Not covered: memory exhaustion and a library's own throw. These are
  stated in Online.purs's comment as outside the argument.

B. Option, not recommended as the fix: carry `effects` as a thunk,
`Lazy (Either ReadFault EffectPackage)` (purescript-lazy, call by need;
`lazy` 6.0.0 is already in spago.lock as a transitive dependency, but
`pedanticPackages` requires it in spago.yaml, which is a dependency
intake). This would make G0's decision independent of the read-back's
evaluation before activation, and the compile-free Online path would
pay for the read-back only when a reader forces it (relevant to R035).
It changes Online.purs's `Certificate` (token review) and every test
reader. Task 16 forces the thunk in `certify`, so after activation it
gives nothing that A does not.

### Tests and rows

Restored-defect row in scripts/regression-r0-t2-prerequisites.mjs:
`r0-t2-r036-1-scan-blind`, the scan's forbidden list without
`Partial.Unsafe`. The probe expects the planted import to pass. And
`r0-t2-r036-1-loop-unlisted`: the loop list's comparison ignores
modules outside ReadBack. The probe expects a planted loop in
MarkStore's position to pass.

### Pins

A changes comments and tests only, so no pin can move. B would leave
every pin unchanged (predicted: `effects` is read only by the honest
report and tests, which would force it). **To be checked by a run** if
B is chosen.

### Surfaces and decisions

A: Online.purs gains a comment only; that is still a diff to a
review-required module, so it needs token review. B: an Online.purs type
change, with token review. Neither changes a decision.

## Task order and dependencies

| Task | Item | Files (main) | Depends on |
|---|---|---|---|
| T1 | R034 (2) | Decide/Reason.purs, a2 decide test, a2 prerequisite rows | none |
| T2 | R034 (10) | Effects/RecordCompanions.purs, Effects/Record.purs (comment), companion tests, a2 prerequisite rows | author's freeze exception (Q1) |
| T3 | R036 (3) | ReadBack/Fault.purs, EffectRows.purs, Images.purs, rows and images tests, t2 prerequisite rows | none |
| T4 | R036 (2) | Domain/Type/Traverse.purs (new), Trace.purs, Trace/Types.purs, Function.purs, ReadBack/Package.purs, Fault.purs, trace helpers, the removal script | T3 (both add to Fault.purs) |
| T5 | R036 (1) | scan test, module comments, deep fixture | T4 (the closure includes Traverse) |

T1 and T2 can run in one worktree while T3 to T5 run in another; they
share no source file. T1 and T2 share the new a2 prerequisite row file,
and T3 to T5 share the t2 one. Integration is by rebase, with no merge
commits. After integration the controller updates the gate status file
(`landed`: `r0-a2-r034-2-unmerged`, `r0-a2-r034-10-owner-twice`), the
BACKLOG rows, the A2 spec §4.1 check 4 bullet, the tranche 2 design's
fault list (§C.6) and the dossier.

## Related: harness gaps the minting comparison found

Not one of the five items, but found by the criterion 5 comparison
(.build/evidence/2026-11-04-comparison/summary.md in r0-t2-d1,
git-ignored) and relevant to activation:

- RT8's accounting labels every `CheckFailed` attempt other than
  `RequirementOpen` and a heuristic refusal as DEFECT. Under minting, a
  validator decline (`RecordDefect`, `NotCertifiable …`) is a
  `CheckFailed` that Decide reads as a decline, so RT8 reports declines
  as DEFECT.
- A Heuristic candidate refused by the validator (`RecordDefect` or
  `NotCertifiable`) is labelled "ambiguous several-tail read-back
  (Heuristic)" by test/r0-rt8-account.mjs:60-69 rather than a decline.
- The window classifier throws on the first RT8 DEFECT, which aborts
  test/r0-shadow.serial at load instead of reporting.

Neither is changed by this proposal, and neither touches the validator.
Both would have to be fixed for the minting switch's pins to be read at
all. Whether they are activation prerequisites, and whether they join
this branch (as T6) or the Task 16 work, is open question 9. If they
join, T6 would be: RT8 reads decline readings as declines (each
`CheckRefusal` constructor named, no wildcard), the window classifier
reports an RT8 DEFECT as a row instead of throwing, each with a test and
a restored-defect row. No pin moves on today's committed path, where no
validator refusal reaches Decide (predicted; to be checked by a run).

## Review plan

- Per task: one fresh-context review (Opus) of spec compliance and code
  quality, given the diff and this proposal's section, not the
  implementer's report. T1 and T2 get token review as trusted-surface
  diffs (a repurposed body behind a pinned name is the risk the pin
  cannot see). T2's review also confirms that the freeze exception is
  used only for the owner count. T4's review confirms that Function.purs
  changes only the `trace` field and the injected resolver.
- Distinguishing-case review for T1, T2 and T4: the reviewer tries to
  break the claim with the cases listed (T2's table (a)-(h); T4's
  rename-agreement grammar, the planted dropping traversal and the
  fault order), as an adversarial review of a changed checker rule.
  Each restored-defect row, old rows with moved needles included, is
  shown failing in an isolated copy.
- Whole branch: one Opus review after integration, of the semantics (no
  acceptance change, fail-closed routing, freeze use) and of the gates
  (row needles unique across old and new rows, tags correct, probes
  detect).
- Fixes from either review go through one bounded fix round. A fix that
  touches T1 or T2 gets token review again.

## Verification plan

After the perf run in progress and the queued criterion 2 and 6 runs
have finished, with nothing else running:

- Per task, targeted only: build, purs-tidy, the task's tests, and its
  regression rows.
- Once on the integrated, reviewed tree: the census, window, RT8 and
  shadow dumps compared with 354ce6e's by r0-results-diff (expected
  exit 0, no moved row), and the count of problems recording two or
  more distinct unsupported kinds (R034 (2)).
- One routine `npm run verify`, alone under the mkdir lock. It covers
  the serial pins (problem, first diagnostics, census, effect pin, trace
  inertness, honest, record corpus) and the regression proofs. Any pin
  movement is a stop and is reported with its rows; nothing is re-pinned.
  A tree changed after the verify is verified again.
- `npm run perf` is not part of this branch. Performance stays R035 and
  gate criterion 6, reported apart from functional acceptance.

## Cost estimate

An estimate, not a cap, in tokens (Opus implementers and reviewers),
revised up after the review's count of trace readers and the closure's
size:

| Part | Tokens | Dispatches |
|---|---|---|
| T1 implement + review | 0.15-0.25M | 2 |
| T2 implement + review | 0.2-0.35M | 2 |
| T3 implement + review | 0.15-0.25M | 2 |
| T4 implement + review | 0.5-0.8M | 2 |
| T5 implement + review | 0.2-0.35M | 2 |
| Fix rounds | 0.15-0.3M | 1-2 |
| Whole-branch review | 0.2-0.3M | 1 |
| Controller (integration, dumps, verify, records) | 0.25-0.4M | 0 |
| **Total** | **1.8-3.0M** | **12-13** |

T4 is the largest: the new traversal, 22 test files and 5 scripts that
read the trace, 17 `readEffects` call sites, and three old rows to
re-needle. T5 grows with the 71-module closure and its loop table. Add
0.1-0.15M for option B of R036 (1), and 0.2-0.35M with 2 dispatches if
the harness fixes join as T6.

## Open questions for the author

1. **A second exception to the validator freeze for R034 (10), and its
   scope.** Recommended: yes, narrow, in check 4 only (RecordCompanions),
   for owners only as R034 (10) states, with no new check index. It is
   the owner-side twin of the companion count check 4 already makes.
   Named alternative: the stronger rule that no two obligations of any
   kind share a provenance (Effect.purs:145-148's rule, which generation
   is tested for). It would also reject a duplicated `Equal` or
   `Consume` (case (c)), which pass today and under this proposal. It is
   a wider exception to the freeze and a new check, and it would need
   its own corpus run.
2. **A duplicated owner by identity or by value.** Recommended:
   identity (provenance). Case (b) is the difference: today and under a
   value rule it is accepted, under identity rejected. A differing copy
   at one site is no more valid than an identical one.
3. **R036 (1): totality argument (A) or thunk (B).** Recommended: A
   alone. After Task 16 the package is always forced, so only totality
   removes the risk. B can be added later as an R035 measure if the
   paired measurements call for it.
4. **R036 (2): how to make an unnumbered meta a fault.** Recommended:
   the traversal (published; its type rules out an unseen raw meta in
   the output, and the rename-agreement test checks that every variable
   is visited). Two alternatives:
   - Published, and prevents the case outright: one walk that assigns
     numbers as it renames, by `traverse` in the State applicative
     (Gibbons and Oliveira, "The Essence of the Iterator Pattern", JFP
     19, 2009; applicative functors from McBride and Paterson 2008). `numbers`
     and the renaming then come from one walk, so they cannot disagree.
     Risk: the numbering order would follow that walk rather than
     `foldHoles`'s, so extension hole numbers could change, which moves
     t2-honest.json's packages and any pin that records hole numerals.
     It would need its own ruling and re-pin.
   - Invented: before renaming each traced type, apply `substitute`
     with numbered metas and rigids sent to `TUnit` or the closed row
     and other metas kept, then require `ground`
     (Domain/Type/Parts.purs:67) to succeed. A composition of existing
     functions with the same visitation as `rename`, about 10 lines, but
     two more walks per traced type on the compile path.
5. **R036 (3): how far to split.** Recommended: split only the
   conversion cause (rows and images), and record the remaining
   `UnreadImage` causes as one coarsening of two kinds (no value reaches
   v; a value reaches v that the package cannot hold). Option: split
   Bound's four causes too, keeping `rowFree`'s as `UnreadImage` so the
   two ruled statsEvidence faults and t2-honest.json do not move.
6. **Gate criterion 4 does not count R036.** §18.159 makes R036's
   before-activation items blockers, but criterion 4 reads only R034
   (2) and (10) (test/r0-t2-activation-gate.mjs:22-23). Recommended:
   extend `landedItems` with `R036 (1)`, `(2)` and `(3)` and the tags
   `r036-1`, `r036-2` and `r036-3`, with must-fail cases. That changes
   the gate spec, its test and the status file's `landed` keys, so it
   needs the author's approval before it is made.
7. **Measurement order.** T4 changes code on the compile path that the
   perf run in progress measures. Recommended: keep today's `npm run
   perf` as the baseline as authorized, and take criterion 6's paired
   read-back and validator measurements after this branch lands, so
   that the budget is set against the tree that would be activated.
8. **Holes.purs's raw-meta fallback: a candidate activation blocker.**
   Features/Check/Holes.purs:48-51 (`holes`, on the lowering boundary)
   keeps an unnumbered meta raw in the checked body. The read-back reads
   that body, and Package.purs:10-15 rests on one hole numbering shared
   by the body and the trace. A raw body meta could collide with a hole
   number exactly as R036 (2) describes for the trace, so R036 (2)'s fix
   alone does not secure that numbering. Recommended: treat it as an
   activation blocker, fixed the same way (the traversal, `Left` on an
   unnumbered meta; a new internal-fault path, since no existing
   diagnostic covers it) in a separate task after T4, because it is a
   lowering-boundary change that can move compile output and needs its
   own review and pins. The arrow-wrapping fallbacks in the live checker
   (Scheme.purs:141-144 `flexibleRow`, falling back to `openRow
   (Unify.Meta 0)`; Entry.purs:22-26 `resolvedRow`) do not feed the
   read-back's numbering; recommended as a new BACKLOG item.
9. **The RT8 and window harness gaps.** Recommended: yes, activation
   prerequisites, because without them the minting switch's own pins
   cannot be read. Best placed with the Task 16 work, which owns those
   pins, unless the author wants them in this branch as T6.

## What could not be established without a run

- That no corpus reason, verdict or dump row moves for T1 and T2 (dump
  comparison, verify's serial pins), and how many problems record two
  or more distinct unsupported kinds.
- That no corpus problem has a repeated owner provenance under the
  validator's own check (record-corpus serial test). The JS uniqueness
  test is the evidence today.
- That the statsEvidence faults stay `UnreadImage` and no corpus row
  read hits a conversion failure (honest serial test, images corpus
  test), and what `r0-t2-package-mark-clash`'s probe reports after T3.
- That every corpus trace finishes `Right` after T4, which also tests
  whether `foldHoles` and `substitute` visit the same metas (trace
  inertness serial test).
- Whether `traverseTy` agrees with `rename` on corpus types (T4's
  property test over the corpus), and its compile-time cost.
- The closure's full loop list and whether each loop has an argument
  (T5's scan).
- Whether the read-back survives 1,000-deep nesting (T5's fixture).
- How many existing planted test cases are conversion failures and
  would change fault name under T3.
