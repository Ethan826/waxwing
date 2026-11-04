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
applied in `withDeclines` (:97-98) and in `unlimited` (:117-118).

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
  `[k2]` → one entry `[k1, k2]`.
- Property (seeded, bounded, with the grammar fixed before running: up
  to 6 entries drawn from every `Unsupport` constructor, with kinds from
  3 values): at most one `EffectsUnchecked`; its kinds are distinct and
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
today too, because its companions are missing. Rejecting by identity
covers both cases and matches the provenance rule Effect.purs:145-148
states (one obligation per declaration, path, rule and role). See open
question 2.

The header comments of RecordCompanions.purs (:20-23) and Record.purs
(:27-30) gain the clause. The A2 specification §4.1 check 4 bullet
needs the same clause; that is the controller's record.

### Tests

test/r0-a2-companions.test.mjs, plus a cases module beside
test/regression-r0-a2-companions.mjs (174 lines) if needed, each shown
failing before the change where marked:

- "an Install recorded twice" (RED today: `Nothing`) → check 4 at its
  provenance. The same for "a HandlerLit recorded twice" and "a Defer
  recorded twice" (RED today).
- "owner and companions all twice": check 4 today and after, by the
  companion count. This is the nearest weaker case and it must stay a
  defect.
- "two Installs at different `with` paths, each with its companions":
  no defect. This guards against a rule that rejects two owners of one
  kind.
- "a HandlerLit at a literal's path and an Install at its `with` path":
  no defect (distinct roles and paths).
- "a second Install at one identity with a different handler": check 4
  (identity, not value).
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
`ImageUnconverted v e`. The other `UnreadImage` causes stay one
constructor, and this is recorded in Fault.purs's comment as a coarsening
with its reason: no `vars` entry, an auxiliary that needs rows, no live
value at the position, or a record-row variable whose image is no
record. Each of them means "no value reaches v", not "a value that
cannot be converted" (open question 5).

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

1. Rows by type, not by a wrapped arrow. `finish` and `mapTraced` take
   an injected `{ ty ∷ Ty Open → Ty Open, row ∷ TyRow Open → TyRow Open
   }`. `onRow` is deleted, and with it the fallback arm. Function.purs
   builds the row resolver with `Subst.resolveRow` (Subst.purs:203)
   between two row renames. A row rename is `substituteRow { types:
   TVar <<< f, rows: openRow <<< f }` (Domain/Type/Core.purs:176; the
   same substitution `rename` uses, :112-114). Nothing can fall back,
   because a row function returns a row.
2. An unnumbered meta is a fault. A new module Domain/Type/Traverse.purs
   (Core.purs is at 240 lines) holds `traverseTy ∷ ∀ f v w. Applicative
   f ⇒ Ord w ⇒ (v → f w) → Ty v → f (Ty w)` and `traverseRow`. Record
   tails are rebuilt with `spliceRecord` (Core.purs:194) so their order
   matches `rename`'s, and spines are walked by a loop through `tailRecM`
   (Either is MonadRec). `finish` renumbers with `traverseTy` in
   `Either TraceFault`: a hole whose meta is not in `numbers` is `Left
   (Unnumbered meta)`. `finish` returns `Either TraceFault Traced`, and
   `Rechecked.trace` takes that type.
3. Routing. `readEffects` and `readEffectsWith` (ReadBack/Package.purs)
   take `Either TraceFault Traced` and turn `Left` into a new
   `ReadFault`, `TraceUnfinished TraceFault`, ahead of every other
   fault. Online.purs:139-141 passes `found.trace` as before, so its
   source does not change.

Sources: the applicative traversal (McBride and Paterson, "Applicative
programming with effects", JFP 18(1), 2008), used here as a renaming
that can fail. Because `traverseTy` is polymorphic in `v` and `w`, it
cannot return a `Ty w` without passing every variable through the
function (parametricity: Wadler, "Theorems for free!", FPCA 1989). So
no variable keeps its raw value without being seen. This is the
argument for choosing it over a check against `foldHoles`. No invented
machinery. An invented alternative is described under open question 4.

### Tests

- test/r0-t2-trace.test.mjs: "an unnumbered meta is a fault" (a planted
  numbering missing one meta: `Left (Unnumbered m)`; RED today: the raw
  meta is kept); "a row is resolved as a row" (a trace row whose tail
  is bound in the final substitution comes back resolved).
- A new test/r0-type-traverse.test.mjs: "traverseTy agrees with
  rename" (for a total map, `traverseTy (Right <<< f) t == Right (rename
  f t)`, over every traced type in the trace test's fixtures and over a
  seeded generator of `Ty Open` with a fixed grammar: arrows to depth
  6, records with up to 3 tails, handlers, data with row arguments); "a
  1,000-deep spine does not overflow" (the shape used in
  test/poly-depth-timing.serial.test.mjs).
- test/r0-t2-package.test.mjs: "an unfinished trace is TraceUnfinished,
  first" (a `Left` trace plus an `Unsupported` obligation still gives
  `TraceUnfinished`).
- About 13 test helpers read `found.value0.trace` (for example
  test/r0-t2-trace-inert.mjs:94, test/r0-t2-package-checks.mjs). They
  move to one shared helper that unwraps `Right` and fails on `Left`.
- scripts/r0-t2-trace-removal.mjs:57-62 matches the `finish` call
  text exactly and replaces it with an empty `Traced`. Its replacement
  becomes `Right { … }`. It is a reviewed artifact, and its
  edit-must-match check fails the build if it is missed.

Restored-defect rows in scripts/regression-r0-t2-prerequisites.mjs:

- `r0-t2-r036-2-meta-raw`: `finish`'s unnumbered arm keeps the raw
  meta (`pure (Hole meta)`). The probe expects `Unnumbered`.
- `r0-t2-r036-2-row-unresolved`: Function.purs passes `identity` as the
  row resolver. The probe expects the resolved row test to fail.

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
reaches: ReadBack.Package and the modules it imports (Bound, Convert,
EffectMatch, EffectPlaces, EffectRows, EffectSites, Fault, Images,
Instances, Least, MarkLabels, MarkMatch, Marks, Position, Walk), and
Trace.Types. In pure PureScript a throw can come only from partiality,
FFI or the stack; a loop only from recursion that is not well-founded.

- Partiality and FFI: a source scan test,
  test/structure-readback-total.test.mjs. It reads the compiled module
  graph, as scripts/forgery.mjs does, takes the closure of
  ReadBack.Package, and fails on an import of `Partial.Unsafe`,
  `Partial`, `Effect.Unsafe`, `Effect.Exception.Unsafe` or
  `Data.Array.Partial`, on a `Partial ⇒` constraint, or on a module
  with FFI. Today grep finds none in the read-back or the trace, and the
  only FFI module is Runtime.Node (scripts/foreign-surface.json). Must
  fail: a planted fixture graph with each forbidden import.
- Termination, one argument per loop, in each module's header and in
  Online.purs's comment at :22-26:
  - Least.purs:152-155 `find`: parent links form a forest, because
    `union` (:140-150) links one root to a different root only
    (union-find, Galler and Fischer 1964). The chain to a root is finite.
    Check: a property test over the marks oracle's families
    (research/t2-read-back-design/marks-oracle.mjs) that every `find`
    ends within the number of nodes.
  - Least.purs:158-166 `reaching`: Kleene iteration of a monotone map
    (`insertWith Set.union` only grows) on a finite lattice (sets of the
    finitely many constants per root). It reaches a fixpoint within
    roots × constants + 1 passes (Kleene; Davey and Priestley,
    "Introduction to Lattices and Order", ch. 8). Check: the same
    property with a pass counter in the test's copy of the loop, or the
    observed passes reported on the oracle families.
  - The `tailRec` spine loops (Convert.purs:105-111, Bound.purs:132,
    EffectMatch.purs:96, EffectPlaces.purs:136, Instances.purs:55): each
    step goes from a `TFun` (or `MArrow`) to its result, a strict
    subterm of a finite term.
  - The rest is structural recursion over finite `Ty`, rows, arrays and
    maps.
- Stack depth: the non-tail recursion in Convert, EffectMatch and
  Images goes as deep as a type's nesting outside arrow spines. A
  read-back fixture with a 1,000-deep data nesting, and the 1,000-deep
  spine of test/poly-depth-timing.serial.test.mjs, run through
  `readEffects`. **To be checked by a run**; if either overflows, that
  is a finding for the author, not a reason to raise a limit.

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
`Partial.Unsafe`. The probe expects the planted import to pass.

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

## Review plan

- Per task: one fresh-context review (Opus) of spec compliance and code
  quality, given the diff and this proposal's section, not the
  implementer's report. T1 and T2 get token review as trusted-surface
  diffs (a repurposed body behind a pinned name is the risk the pin
  cannot see). T2's review also confirms that the freeze exception is
  used only for the owner count. T4's review confirms that Function.purs
  changes only the `trace` field and the injected resolver.
- The reviewer of T1 and T2 tries to break the claim with the
  distinguishing cases listed (adversarial review of a changed checker
  rule). Each restored-defect row is shown failing in an isolated copy.
- Whole branch: one Opus review after integration, of the semantics (no
  acceptance change, fail-closed routing, freeze use) and of the gates
  (row needles unique, tags correct, probes detect).
- Fixes from either review go through one bounded fix round. A fix that
  touches T1 or T2 gets token review again.

## Verification plan

After the perf run in progress and the queued criterion 2, 5 and 6 runs
have finished, with nothing else running:

- Per task, targeted only: build, purs-tidy, the task's tests, and its
  regression rows.
- Once on the integrated, reviewed tree: the census, window, RT8 and
  shadow dumps compared with 354ce6e's by r0-results-diff (expected
  exit 0, no moved row).
- One routine `npm run verify`, alone under the mkdir lock. It covers
  the serial pins (problem, first diagnostics, census, effect pin, trace
  inertness, honest, record corpus) and the regression proofs. Any pin
  movement is a stop and is reported with its rows; nothing is re-pinned.
  A tree changed after the verify is verified again.
- `npm run perf` is not part of this branch. Performance stays R035 and
  gate criterion 6, reported apart from functional acceptance.

## Cost estimate

An estimate, not a cap, in tokens (Opus implementers and reviewers):

| Part | Tokens | Dispatches |
|---|---|---|
| T1 implement + review | 0.15-0.25M | 2 |
| T2 implement + review | 0.2-0.3M | 2 |
| T3 implement + review | 0.15-0.25M | 2 |
| T4 implement + review | 0.35-0.5M | 2 |
| T5 implement + review | 0.15-0.25M | 2 |
| Fix rounds | 0.1-0.25M | 1-2 |
| Whole-branch review | 0.2-0.3M | 1 |
| Controller (integration, dumps, verify, records) | 0.25-0.4M | 0 |
| **Total** | **1.55-2.5M** | **12-13** |

T4 is the largest, because of the new traversal and about 13 test
helpers. If option B of R036 (1) is chosen, add 0.1-0.15M.

## Open questions for the author

1. **A second exception to the validator freeze for R034 (10).**
   Recommended: yes, narrow, in check 4 only (RecordCompanions), with
   no new check index. It is the owner-side twin of the companion count
   check 4 already makes. A new check 7 would touch Record.purs's check
   list and spec §4.1's order for no gain.
2. **A duplicated owner by identity or by value.** Recommended:
   identity (provenance). It is stricter, it matches the uniqueness rule
   generation is tested for, and a differing copy at one site is no more
   valid than an identical one.
3. **R036 (1): totality argument (A) or thunk (B).** Recommended: A
   alone. After Task 16 the package is always forced, so only totality
   removes the risk. B can be added later as an R035 measure if the
   paired measurements call for it.
4. **R036 (2): how to make an unnumbered meta a fault.** Recommended:
   the traversal (published; parametricity ensures every variable is
   visited). Alternative, flagged as invented: before renaming each
   traced type, apply `substitute` with numbered metas and rigids sent
   to `TUnit` or the closed row and other metas kept, then require
   `ground` (Domain/Type/Parts.purs:67) to succeed. It is a composition
   of existing functions with the same visitation as `rename`, about 10
   lines and no new walk code, but it adds two walks per traced type on
   the compile path.
5. **R036 (3): how far to split.** Recommended: split only the
   conversion cause (rows and images), and record the remaining
   `UnreadImage` causes as one coarsening with its reason. Splitting the
   auxiliary cause would rename the two ruled statsEvidence faults and
   move t2-honest.json and the gate's vocabulary.
6. **Gate criterion 4 does not count R036.** §18.159 makes R036's
   before-activation items blockers, but criterion 4 reads only R034
   (2) and (10) (test/r0-t2-activation-gate.mjs:22-23). Recommended:
   extend `landedItems` with `R036 (1)`, `(2)` and `(3)` and the tags
   `r036-1`, `r036-2` and `r036-3`, with must-fail cases. This changes
   the gate spec (a controller record) and its tests, as part of this
   branch.
7. **Measurement order.** T4 changes code on the compile path that the
   perf run in progress measures. Recommended: keep today's `npm run
   perf` as the baseline as authorized, and take criterion 6's paired
   read-back and validator measurements after this branch lands, so
   that the budget is set against the tree that would be activated.
8. **The same raw-meta fallback outside the trace (found while
   reading, out of scope).** Features/Check/Holes.purs:48-51 (`holes`,
   on the lowering boundary) keeps an unnumbered meta raw in the checked
   body, which the read-back also reads. Scheme.purs:141-144
   (`flexibleRow`) falls back to `openRow (Unify.Meta 0)`, and
   Entry.purs:22-26 (`resolvedRow`) to the input row, in the live
   checker. Recommended: file as a new BACKLOG item, decided separately.
   Changing `holes` is a lowering-boundary change that can move compile
   output.

## What could not be established without a run

- That no corpus reason, verdict or dump row moves for T1 and T2 (dump
  comparison, verify's serial pins).
- That no corpus problem has a repeated owner provenance under the
  validator's own check (record-corpus serial test). The JS uniqueness
  test is the evidence today.
- That the statsEvidence faults stay `UnreadImage` and no corpus row
  read hits a conversion failure (honest serial test, images corpus
  test).
- That every corpus trace finishes `Right` after T4, which also tests
  whether `foldHoles` and `substitute` visit the same metas (trace
  inertness serial test).
- Whether `traverseTy` agrees with `rename` on corpus types (T4's
  property test over the corpus), and its compile-time cost.
- Whether the read-back survives 1,000-deep nesting (T5's fixture).
- How many existing planted test cases are conversion failures and
  would change fault name under T3.
