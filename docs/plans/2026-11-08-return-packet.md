# Return packet: activation prerequisites (2026-11-08, dossier §18.162)

The one return §18.161 asked for.

**Milestones.** None has moved since 2026-10-25. The prerequisites are
implemented and reviewed, and their acceptance run has now passed.
Milestone 1 is still blocked by activation-gate criteria 2 and 6, which
are the author's. The gate reads **not met (2, 6)**, and "met" on the
others records evidence, not permission to activate.

Held: replacement losses, performance budgets, the minting switch, F14's
retirement, live replacement, pushing. No soundness claim.

## 1. Verification

Routine verify at 96ba184f **passed**, one run under the lock, with
2 test files at a time and regression jobs 1: parallel 3475/3475, serial
238/238, regression proofs 472/472, growth ratio 2.284 against 3.0.
Performance qualification was not run. Free memory stayed at 28% or
above, with the pressure level at "warn" through nearly all of the run,
and load 4 to 7 on the shared machine. Evidence:
.build/evidence/2026-11-08-verify/.

The earlier run at f93ac49f was killed under memory pressure. It stands
as incomplete evidence, not a pass. The new setting changes scheduling
only (WAXWING_VERIFY_TEST_CONCURRENCY, docs/engineering.md). Unset, it
keeps Node's default. The routine file list equals the commit before it
(379 files). Seven tests were added to an existing test file, and four
mutants were caught in an isolated copy.

## 2. What landed

| Item | Result | Rows |
|---|---|---|
| R034 (2) | duplicate `EffectsUnchecked` kinds merge in one reason | r0-a2-r034-2-unmerged |
| R034 (10) | owners counted once by provenance in check 4 (the narrow freeze exception) | r0-a2-r034-10-owner-twice |
| R036 (1) | termination and partiality audit: evidence, not a proof of totality | r0-t2-r036-1-* |
| R036 (2) | trace fallbacks fail closed; numbering preserved | r0-t2-r036-2-* |
| R036 (3) | conversion failures are their own read faults | r0-t2-r036-3-* |
| T6 | RT8 separates declines from defects; the window reports defects instead of aborting | r0-t6-* |

Also added during the batch: the gate compares each comparison and
measurement record's `src` tree with HEAD (stale reads unmet), and
regression runs take a mkdir lock.

**Reviews.** Each lane had an independent review with fix rounds; two
whole-branch reviews (source: ready; gates and evidence: approved after
one fix wave). Rulings made along the way are in the git-ignored ledger
.superpowers/sdd/2026-11-04-prerequisites/progress.md; the ones that need
the author are in section 6 below. The walk investigation and this packet
have had no independent review.

## 3. The repeated scratch comparison

Disposable build at 9ed83f1b; test/fixtures/r0/t2-minting-comparison2.json.
The same 16 declarations move, none unexpected: 11 read-fault declines
in RT8 plus 4 limitation declines, no RT8 defect, and the shadow run
completes. Nothing was re-pinned. Sixteen declarations lose
substitution-only certification and two move from Solved
(`statsEvidence` in c7 and q7). Neither figure measures what users would
lose when the live checker is replaced. Your ruling keeps those losses
unresolved.

## 4. Numbering findings

docs/plans/2026-11-04-holes-numbering-findings.md. The collection and
renaming walks visit the same metas, so the `Holes.purs` raw-meta arm is
not taken, by an argument from the code and two checks with planted
failures. The type does not enforce it. Lowering never reads a hole's
number. The checked declaration's `row` is a separate hazard: R037 (3).

## 5. Performance

Measured again after the compile-path changes
(test/fixtures/r0/t2-performance-2.json): trace ×1.11 compile and ×1.33
recheck CPU; online read-back ×13.7, +393 MiB; validator ×2.25 over
`certify`. No budget is approved or proposed here.

**The two failed perf files** stay failed qualification evidence.
Attribution (test/fixtures/r0/t2-perf-attribution.json, one run):
added compiler cost was needed to explain the failure for `value`,
`partialFirst`, `parenthesized` and `generic`; `over` is undetermined.
The added cost is the trace (×1.2 to ×1.4), with the rest about ×1.0.

**`Walk.nodeAt`**, on the path that validates
(docs/plans/2026-11-08-readback-walk-investigation.md). Median CPU of
five attribution samples, not the protocol:

| Option | Kind of fix | CPU (s) |
|---|---|---|
| today's walk | | 72.2 |
| memoize paths | removes repetition | 37.5 |
| index first, wrap one | makes each lookup cheaper | 22.0 |
| index first and memoize | both | 21.7 |
| lazy package | defers | 72.2 after activation (6.8 only while nothing reads it) |

Index-first gave identical results on all 2,832 candidates. Memoizing
adds nothing measurable after it. A lazy package saves nothing once the
validator reads every package, which is the path activation needs. The
strategy checks every candidate.

**New finding:** with the walk fixed, validation is the largest step
(11.4 of 22.0 s), mostly path comparison in `Map`-keyed lookups. The
proposal's ×2.3 to ×3.2 excluded the validator and does not predict this
path.

**Recommendation:** take index-first (diff kept at
docs/plans/2026-11-08-walk-index-first-scratch.diff, not landed), skip
the memo and the path index for now, do not make the package lazy, and
look at validation before setting a validator budget.

## 6. Decisions: R037 and R038

The examples for R037 (2) describe a planted defect and were not run.
The others cite recorded data or the package and window behavior. None of
these has been ruled.

### R037 (1): uniqueness across every obligation kind

Example: two non-owner obligations carry one provenance. Check 4's
owner rule accepts the package and an every-obligation rule refuses it.
The two differ only if generation records a duplicate, and the corpus
gate shows none in the corpus (§18.124).

**Recommend:** not an activation blocker. Keep the corpus gate and leave
the rule as a follow-up, since it needs a third validator-freeze
exception.

### R037 (2): live-checker fallbacks

Most sites wrap a row in `TFun`, transform it and unwrap it, so the
second arm is unreachable unless the transform stops preserving the
arrow. They differ in what happens if it does:

| Site | If reached | Risk |
|---|---|---|
| Entry.purs:43-46 (`main`'s check) | `Row [] Nothing`: no labels to check, so the Console boundary passes silently | fails open |
| Scheme `flexibleRow`, `arrowRow`, Desugar:47 | invents `Meta 0` or a closed row | wrong value |
| `resolvedRow`, `walkedRow`, Body `rowOf`, Function `current`, Core:128, :138 | keeps a row unresolved or empties it | wrong value |

Example: plant a `resolve` that returns a non-arrow for `TFun`. `main`
then performs `Fs` and is accepted, where a fail-closed version would
report a defect. No such input exists today.

**Recommend:** not a blocker for the minting switch; a blocker for live
replacement. Give these sites row-level operations, removing the `TFun`
wrapper, so the unreachable arms cannot be written. Do Entry first.

### R037 (3): the declaration's raw `row`

Example from the corpus: `main` in a1-discard-dictionary.wxw has row meta
0, while the body numbers meta 3 as 0 and meta 0 as 1. Comparing the two
matches unrelated variables. 881 of 2,823 declarations hold raw metas
there, and 130 have one equal to a body hole number. The defect has
happened once and is guarded at that one reader.

**Recommend:** block the minting switch on a distinct type for the
unnumbered row. It changes no behavior, and it covers any future reader,
which one guarded test cannot.

### R037 (4): rest-only planted case

Example: a fixed body with a named rest and no other tail. Today one
generated body shows that divergence. **Recommend:** add the case when
that test is next touched; not a blocker.

### R037 (5): shared regression needles

Example: a restored defect prints a message another row's needle also
matches, so the row can pass on the wrong failure. About 30 older pairs
share needles. **Recommend:** not a blocker. Separate any pair before it
is cited as gate evidence.

### R038 (1): the fault name in RT8

With the rendering, a row reads `Unresolved Unsupported EffectsUnread
UnreadImage`. Without it the row loses `UnreadImage`, and the 11 read
faults become hard to tell apart. **Recommend:** carry it in the
switch's own commit. No ruling needed unless you disagree.

### R038 (2): two window classes (implementer readings)

**A read-fault decline.** Example: `statsEvidence` in c7 is Solved today
and becomes `PackageUnread`, `UnreadImage`. Labeled §3.2(b), a limit of
this checker, its fix is reading the package. Labeled §3.2(a), it would
be a question about what the language means. **Recommend (b):** the
fault says the read-back could not read the package. This labels the row
and accepts no loss.

**A refused `RequirementOpen` where today also refuses.** Example: a
requirement atom `ValidR` leaves open, in a program today rejects. Both
paths reject, and only the reason's class differs. The current §3.2(a)
label matches the same refusal where today compiles. A defect label
would report a disagreement that does not exist. **Recommend (a),
pending G-ValidR.** The class has no rows in the comparison today.

### R038 (3): the scratch name `EffectsUnread`

If the real constructor has another name, RT8 reads every read fault as
DEFECT: fail-closed and noisy. **Recommend:** keep the name, or change
RT8 in the same commit. No ruling needed.

### R038 (4): strict `finish` in `Rechecked`

Example: a plain compile pays to resolve and renumber a trace it never
reads, while a validated declaration reads it every time. Laziness helps
only the first, the same distinction as the package. **Recommend:** leave
it strict until routing after replacement says whether compile ever
skips validation; §18.159's routing governs.

## 7. Decisions awaiting the author

1. Criterion 2: the loss rulings, still held.
2. Criterion 6: budgets, still held. Whether to land index-first and then
   run the protocol.
3. R037 (3) and R037 (2): the blockers recommended above.
4. R038 (2): the two window classes.
