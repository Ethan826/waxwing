# R037 (2): the remaining fallback sites (2026-11-10)

Evidence-only inventory authorized by dossier §18.180. No src change.
Source at 98278e0d (Entry's repair, §18.179). The site list is the one
in docs/plans/2026-11-04-holes-numbering-findings.md ("Other
live-checker fallbacks"), and its arguments are reused where they apply.
Line numbers are those at 98278e0d.

## Method

Reachability is argued from the code. Each argument is the same one the
Entry repair used (§18.177): `rename` and `substitute` keep an arrow an
arrow, by `stagesThrough` and `foldStages`.

Consequences are measured where possible. Each fallback is forced in an
isolated copy of the repository and its compiled output
(research/r037-2-sites/plants.mjs; the copy is a throwaway git
repository, because the corpus loader lists files with `git ls-files`).
The plant turns the site's `instanceof TFun` test false inside the named
function only, or as stated below.

For each plant the corpus results dump (scripts/r0-results-dump.mjs,
3,071 declarations) is compared with the unplanted dump. The unplanted
dump is byte-identical to comparison 8's. Four focused suites are also
run. "today" rows are today's checker's own result (acceptance and
diagnostic), so a move there is a move in live acceptance. Evidence:
.build/evidence/2026-11-10-r037-2-sites/ (plants.log, dump-*.json,
moved-*.txt).

A plant shows what happens when the arm runs on every input. A real
break could reach the arm on only some inputs. "No movement" means none
in this corpus, not none at all.

## Inventory

### Walked.purs:36-41 `walkedRow`

- Fallback: `opened (TFun TUnit spine TUnit)`, with a non-arrow giving
  back `row` unwalked (the tail's bindings not spliced).
- Reachability: unreachable. `opened` is `rename toOpen`, which is
  `substitute`, whose arrow arm rebuilds one `TFun`.
- Invariant: renaming preserves the arrow.
- Readers (12): Clauses, Install, Settle, SettleChange, Frames (3), Sync,
  Lend, TailPass, and Walked's own `endOf`. All handler, defer, frame and
  clause bookkeeping.
- Measured if broken: **fails open and closed.** 87 today rows moved.
  - 30 programs refused today compile. 15 are "defer must not fail, but
    it performs Log, whose handler may fail". The others include
    "Unhandled Fail(E) in main" (3), "Unhandled Tick in main" (2) and
    signature refusals ("f performs Tick, which its signature does not
    allow").
  - 39 programs that compile today are refused (28 E_EFFECT, 11 E_TYPE).
  - fx008-defer: 24 of 26 fail.
- User-visible: an unhandled effect in `main` compiles and fails at run
  time (as Entry's plant showed, §18.177). Wrong defer and signature
  verdicts in both directions.

### DeclarationUse.purs:105, 129-131 `arrowRow`

- Fallback: `arrowRow (withMarks (at scheme.value (TFun TUnit row
  TUnit)))`, with a non-arrow giving `closedRow`: a named function's
  instantiated row dropped at its use.
- Reachability: unreachable. `at` is `rename shifted`, which preserves
  the arrow. `withMarks` is `identity` or `mapMarks`, whose `edited`
  rebuilds an arrow through `stagesThrough identity` and `foldStages`.
- Invariant: instantiation and mark mapping preserve the arrow.
- Measured if broken: **fails open, mostly.** 66 today rows moved.
  - 48 programs refused today compile. 22 are "defer must not fail ...",
    3 "This function must be pure, but it performs Log", 2 each
    "Unhandled Users in main", "Unhandled Tick in main", "Unhandled
    Fail(E) in main", and signature refusals.
  - 13 compile today and are refused (E_TYPE).
  - 86 R0 verdicts Solved become read-fault declines.
  - Suites: r0-entry-rows 3/9 fail, fx-diagnostic-origins 11/17,
    fx008-defer 23/26.
- User-visible: effects performed through a call to a named function
  are dropped from the caller's row. Unhandled effects in `main` compile
  and fail at run time, and purity and signature checks pass wrongly.

### Function.purs:175-181 `current`

- Fallback: `rigid (TFun TUnit function.row TUnit)`, with a non-arrow
  giving `Row [] Nothing` as the declared ambient row.
- Reachability: unreachable. `Checked.rigid` is `rename Rigid`.
- Invariant: renaming preserves the arrow.
- Measured if broken: **fails closed.** 985 today rows moved. 925
  programs that compile today are refused (909 E_EFFECT, 16 E_TYPE). No
  refused program compiles, and 709 R0 verdicts leave Solved.
- User-visible: every function that performs an effect is rejected, with
  messages such as "... and pure cannot be made equal". Loud but
  misleading: it reads as a user error.

### Generate/Body.purs:130-135 `rowOf` (R0 generation, D1; trusted surface)

- Fallback: as `current`, with a non-arrow giving `Row [] Nothing` as the
  generated checked declaration's row.
- Reachability: unreachable, by the same argument as `current`.
- Measured if broken: **no movement** (0 rows, suites all pass). Today's
  checked declaration comes from Function.purs (via
  `Entry.resolvedRow`), not from R0's generation, so nothing measured
  reads this row today.
- Reasoned, not measured: if R0's generated declaration replaced
  today's, its `row` would be read by Specialize/Seeds.purs
  `monomorphic` (a type variable inside the row's labels makes a
  function polymorphic), Components and Trace/Types. A dropped row could
  misclassify a function whose only type variable is in its row, such as
  `with State(a)`. This bears on live replacement only.

### RowMerge/Desugar.purs:39-50 `freshRow`

- Fallback: `first = maybe (Meta 0) identity (Array.head metas)`, an
  invented tail with a real meta number.
- Reachability: unreachable. The guard at :43 returns before `first` is
  used whenever there are fewer than two metas.
- Invariant: the guard and the default stay together.
- Plant: the guard removed. With no metas `finished` (Chain.purs:96-100)
  would append `Meta 0` as an open tail and seed lacks constraints on it,
  joining an unrelated meta. Measured: **no movement**. This does not
  establish whether a record with no unknown tail reaches `freshRow` in
  the corpus (`rebuilt` calls it for every record inside a type that has
  a row with several unknown tails).
- Consequence if reached (reasoned): a closed record typed open, with
  constraints on meta 0. That gives wrong typing, in either direction.

### Domain/Type/Core.purs `stagesThrough` and `foldStages` arms

- Fallbacks: `stagesThrough`'s no-arrow arm keeps the type as the result
  and adds no stage. `foldStages`' `_ → rest` skips a non-arrow node.
- Reachability: unreachable, argued in their comments.
  - `stagesThrough` takes exactly `arrowCount` steps through the same
    pure `look`, so `take` meets a `TFun` each time.
  - `foldStages` gets only nodes for which `stagesThrough` built `Just`,
    which happens only for a `TFun`.
  - Only `resolve` (Subst.purs:192) and Type/Parts pass a `look` other
    than `identity`.
- Plant: the second loop takes `rest` without `look`, which reaches the
  arm whenever a spine passes through a bound meta. Measured: **no
  movement**, with all suites passing.
- Why (from the code): `resolve` resolves the leftover result itself,
  which walks the bound meta and resolves the rest of the spine
  recursively. So the value is equal and only the recursion depth
  differs, which matters only for very long chains. The arm is built to
  degrade safely, as its comment says.
- `foldStages`' arm cannot be reached without breaking `stagesThrough`'s
  construction, and would then drop a stage (a wrong type). It is argued,
  not planted.

### Not fallbacks

- Function.purs:131-145 `resolver` repeats Scheme's private `toFlex`
  and `toOpen`. It is already row-level (R036 (2)) and has no fallback
  arm. A regression row's needle (r0-t2-r036-2-row-unresolved) matches
  its text.

## Proposed repair scope

The same pattern as Entry: row-level operations, so no arm exists.

1. **Walked `walkedRow`** (fails open):
   `checkedRow (walkRow subst (flexibleRow row))`.
2. **DeclarationUse `arrowRow`** (fails open): instantiate the row as a
   row. That is an `atRow` beside Scheme's `at` (`renameRow shifted`),
   plus `mapRowMarks` (already in Domain/Type/Marks.purs) in place of
   `mapMarks`. `arrowRow` is removed.
3. **Function `current`** (fails closed): a `rigidRow = renameRow Rigid`
   beside `Checked.rigid` (Domain/Checked/Internal.purs), used in
   `current`.
4. **Body `rowOf`** (no effect today; R0's declaration): the same
   `rigidRow`. Trusted surface, so the diff needs token review
   (docs/engineering.md).
5. **Desugar `freshRow`** (unreachable, no measured effect): take
   `first` from `Array.uncons` under the guard, so no `Meta 0` is
   invented. Optional; a three-line change.

Recommended to leave, with the argument recorded here:
- Core's arms. They degrade safely (measured for `stagesThrough`).
  Changing the hottest spine code would put the performance protocol at
  risk.
- `resolver`'s duplicated renames. These are not a fallback, and
  changing them moves a regression needle.

Expected behavior: no change to acceptance, diagnostics or compilation
on any input, since each replacement computes what the arrow round trip
computes. That is a prediction. As before, any movement is a stop,
reported with the measured differences.

## Cost

- Source: about 30 lines across Walked, DeclarationUse, Function, Body,
  Checked/Internal, Scheme and optionally Desugar. All files stay under
  250 lines (largest Function at 182). No pinned citation or regression
  needle matches the lines that change. Body adds a token review.
- Tests: equivalence properties against the old arrow forms, extending
  test/r0-entry-rows.test.mjs's generators or a sibling file.
  Restored-defect checks on the new paths, re-aimed from plants.mjs:
  dropping a walked row's spliced labels and dropping an instantiated
  row at a use, at least.
- Verification as for Entry: independent review, comparison and
  performance protocol on the final src (about 25 minutes), and routine
  verify (about 60 minutes at concurrency 2). Roughly 1.5 hours of
  machine time per full round, plus a round for any review fix that
  touches src.

Scope boundary: items 1-4 close the arrow-wrapper class in the live
checker and in R0's generation. With item 5, every R037 (2) site is
either repaired or left with a recorded argument (Core). Closing R037
(2) does not by itself meet criterion 2, which also needs the
read-fault and ForcedTail losses ruled.

## Repair (§18.182, implemented)

Authorized by the author (§18.182): items 1-5. Core's arms and
`resolver` are unchanged. Final source at 59e70fdb: 422aae52, the review
fixes (94edf6eb), and a purs-tidy formatting fix.

- Walked.purs: `walkedRow subst row = checkedRow (walkRow subst
  (flexibleRow row))`.
- Scheme.purs: `atRow scheme = renameRow (shifted scheme)` beside `at`,
  which now shares the top-level `shifted`. DeclarationUse.purs:
  `instantiated = withRowMarks (atRow scheme.value row)`, where
  `withRowMarks` is `mapRowMarks` under the same `markNames` test as
  `withMarks`. `arrowRow` is removed.
- Domain/Checked/Internal.purs: `rigidRow = renameRow Rigid` beside
  `rigid`. Function.purs `current` and Generate/Body.purs `rowOf` use
  it; `main`'s handling (`mainRow`, `isEntry`) is unchanged. Body is
  trusted surface: the reviewer's token review found no token built and
  no export added (`generateIn` only, as pinned).
- RowMerge/Desugar.purs `freshRow`: the first tail comes from
  `Array.uncons`; one tail or none returns the row as written. No
  `Meta 0` is written anywhere.

Why each is the same function: `rename f (TFun TUnit r TUnit)` is
`TFun TUnit (substituteRow (renaming f) r) TUnit` (`stagesThrough
identity` gives one stage; `foldStages` rebuilds it), so its row is
`renameRow f r`. `mapMarks c` on that arrow is `editedRow` on `r`,
which is `mapRowMarks c r`. Desugar: zero, one, and two or more metas
take the same branch as the old `length < 2` guard with the same
`first` and `rest`.

Checks:
- test/r0-site-rows.test.mjs (7 tests): each new form against the old
  arrow form on 400 generated rows plus fixed ones (repeated labels,
  every mark kind, nested arrows whose rows carry marks inside label
  arguments, all tail kinds), compared both as plain rows and as raw
  structure; walkedRow under generated substitutions and a tail
  splice with duplicates; atRow's shift; Body's elaborated row end to
  end (labels kept, `main`'s tail closed); Desugar's closed record
  beside a several-tail one staying closed.
- Restored-defect checks (research/r037-2-sites/mutants.mjs, compiled
  output patched in an isolated copy; log
  .build/evidence/2026-11-12-r037-2-sites/mutants.log). Each mutant is
  confined to its named function.

| Mutant | site-rows | entry-rows | origins | defer | defer-run | nofail-k | elab-build |
|---|---|---|---|---|---|---|---|
| Walked: spliced labels dropped (row unwalked) (caught) | 2 | 0 | 0 | 24 | 6 | 5 | 0 |
| DeclarationUse: instantiated row dropped at a use (caught) | 1 | 3 | 11 | 23 | 0 | 3 | 0 |
| DeclarationUse: instantiated row's labels dropped, tail kept (caught) | 1 | 3 | 10 | 23 | 0 | 3 | 0 |
| DeclarationUse: row marks not instantiated (caught) | 0 | 0 | 0 | 0 | 1 | 2 | 0 |
| Scheme.atRow: variables not shifted by the base (caught) | 2 | 1 | 4 | 2 | 8 | 5 | 0 |
| Checked.rigidRow: labels dropped (caught) | 2 | 1 | 7 | 6 | 9 | 4 | 3 |
| Function.current: labels dropped (caught) | 1 | 1 | 7 | 6 | 9 | 4 | 3 |
| Body.rowOf: labels dropped (caught) | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Desugar.freshRow: one-tail guard removed (missed) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Desugar.freshRow: Meta 0 invented (old default, unguarded) (caught) | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

  Failing tests per suite. r0-static, r005b-render and r005b-outcome
  failed under no mutant.

  The marks mutant is caught only by fx008-defer-run and fx008-nofail-k.
  The one-tail guard mutant is missed. With one meta `m`, `finished`
  returns the same row (Flex's order puts rigid before meta, and
  `recordRow` sorts), but the substitution gains `addLacks m`, `seedApart`
  against each rigid tail, and an occurrence in the origins. No suite
  reaches a binding that the lacks constraint would refuse, or reads
  that occurrence. The guard is unchanged; this is a test gap, recorded,
  not a defect. The `Meta 0` mutant restores the old default without
  the guard; only the new Desugar test catches it, and the old code
  passes that test too, because its guard made the default unreachable.
- Independent review (2026-11-12, of 422aae52): no behavioral defect.
  Fixed: Desugar's guard comment, nested label arguments and raw
  comparison in the tests, the Desugar test's comment. One finding was
  wrong: `main`'s written row has a tail variable, so Body's test does
  exercise the tail closing; the test now asserts it.
- Comparison: the corpus dump is byte-identical to comparison 8's, and
  the moved report against the pre-switch baseline equals comparison 8's
  line for line, at 422aae52, 94edf6eb and 59e70fdb. No acceptance,
  diagnostic or compilation movement. Recorded as
  test/fixtures/r0/t2-minting-comparison10.json (59e70fdb; evidence
  .build/evidence/2026-11-12-comparison10/). Comparison 9 (94edf6eb)
  went stale with the formatting fix.
- Performance 10: test/fixtures/r0/t2-performance-10.json at 59e70fdb:
  read-back CPU ×2.36, peak RSS ×1.09; validator CPU ×2.22, peak RSS
  ×1.01, within the §18.168 budgets. Performance 9 (77b08566, src as at
  94edf6eb: ×2.33, ×1.06; ×2.22, ×1.02) went stale the same way.
- The first protocol run on 94edf6eb failed before measuring: the
  no-collection baseline (scripts/r0-t2-trace-removal.mjs) writes
  `Row [] Nothing` into Function.purs, and `current` no longer needs
  `Nothing`, so its import was gone. One more removal edit restores the
  import in the scratch copy (77b08566). Kept:
  .build/evidence/r0-t2-perf-2026-11-12T18-42-34-092Z/.
- Routine verify at c30a1e52 failed at purs-tidy (DeclarationUse's
  import layout; log in
  .build/evidence/2026-11-12-verify-r037-failed-c30a1e52/). Fixed in
  59e70fdb, and both records repeated.
- Routine verify passed at 863a0992 (src as at 59e70fdb): parallel
  3501/3501, serial 242/242, regression proofs 509/509, growth ratio
  2.342 against 3.0 (.build/evidence/2026-11-12-verify-r037/).
