# FX008 Task 8 review (installations), `66f1eca..b30b8b8`

**Verdict: Spec ✅ (with the deviation accepted, see D1), Quality Needs fixes
(I1, I2; Minor M1-M5).**

Experiments ran in one isolated copy, /private/tmp/claude-501/t8rev, which
was a `git archive` of b30b8b8 with .spago and output copied in. The copy
has been deleted. The baselines were the worktree's built output (b30b8b8)
and 66f1eca's src, built in the same copy. Corpus: the 3,421-source harvest
(.build/differential-harvest.jsonl), of which 3,151 sources check.

## D1. Deviation: no consumption at install; `Lend.assume` in settling

**Ruling: sound for Task 9. Accept it, and keep the plan note.**

**Equivalence to the planned semantics [ran].** Experiment E1 replaced
Settle.purs:157 with `fresh entry = plain entry`, which is the plan's
Directional `consumeBare` of C into `current` with a throwaway tail and
arguments lent by R. I then compared every function's mark-edge set
(reason, span start and resolved endpoints) between b30b8b8 and E1 over the
corpus:
- 3,151 checked sources, 570 of them with installations;
- **0 differing edge sets**;
- duplicate counts identical (404 and 404).

**Why they agree.** With a throwaway stage tail, a Directional consumption
records only two kinds of edge:
- pair edges, target ⊑ stage;
- extension edges, fresh t ⊑ c, made only when `current` lacks a C label.

It never makes copies (`stageLabel` returns the label unchanged for the
throwaway). `assume` records the same pair edges, pairing by key and
position as row unification does. When any lent label has no partner, it
returns `Nothing`, and the entry falls back to the full consumption, so
extension edges are not lost either. Install-time consumption would only
add an earlier subset of the same edges, because C only grows. The one
difference is insertion order, discussed under Q3.

**Is the invariant real?** The invariant is that every lent C label has a
partner in `current`. It does hold:
- `lend` keeps only C labels with an R partner of the same key and rank, so
  the lent labels are contained in R as a multiset.
- `consumeIgnoring` makes R ⊆ `current` by key multiset. An open R is
  unified with `current`, tail included, so it can only grow together with
  `current`. A closed R is opened with a throwaway tail and cannot grow.

**Fallback instrumentation [ran].** I made the fallback branch mark the
substitution (it subtracts 10^6 from `marks.fresh`; `ended.next` cannot be
used, because Check.purs keeps `finished.next`). A sanity mutant confirmed
the flag fires. The fallback was **never taken** on:
- the 3,421 corpus sources;
- every fx008 probe;
- 12 targeted programs: a handler parameter with a closed R (p01); one with
  `Log + ...e` (p02); `mk(): Handler(Log with ...e)`, whose C shares R's
  instantiated tail (p03); nested Log handlers (p04); a current row
  `Log + Log` (p05); a let-bound handler installed twice (p06); a literal
  passed to a parameter (p07); a lambda parameter (p08); a failing clause
  (p09); three nested installations with duplicate keys (p10); `if`
  unifying a literal with a parameter (p11); and the rigid callback case
  (p12).

**Duplicate keys [ran].** In p10, the inner Log clause calls `tick(); log(n)`
under `[f2 Tick, f1 Log | …]`. It gets the edges `f2 ⊑ c_tick` and
`f1 ⊑ c_log`, which pair with the outer frames as intended. In p05, C's Log
pairs with the first Log of `Log + Log`.

**Counter-example.** I found none. p06 and p08 are rejected with a "both end
in ..." error, but 66f1eca rejects them identically [ran], so the rejection
predates Task 8.

## Q2. The 449 IR differences

**E1 result [ran].** Doing the plan's consumption in settling alone, with
nothing at install, gives 442 check-phase differences and no difference in
any later phase. The first case diffed is
`effect Log …; fn main(): Unit with Console = { defer print(1); with handler Log
{ log(n) => () } { log(1) } };`.
The only change in its IR is `functions[0].row`'s tail: `Hole -4` against
`Hole -5`.

**Cause.** `current` holds labels beyond C, so they extend the throwaway
stage tail. `extendRow` takes a fresh meta from `Subst.fresh`, the negative
counter. `unifyTails` binds the larger meta to the smaller, so `current`'s
real tail ends up bound to that negative meta: it is renamed and the counter
shifts.

**Why the alternatives would not help.**
- A dedicated counter (the m1 fix from Task 4) leaves the binding direction
  unchanged. The real tail would still be renamed, just to a number from
  another counter.
- Drawing the throwaway from somewhere other than `state.next` does not
  touch this path either.

The real alternative is that a throwaway stage tail never takes leftover
target labels (stop instead of `extendRow`). That would change RowFinish,
which is 243 lines and on the budget list. It would also change how
deferral entries rename tails, which the baseline has done since before
FX008, so it would create new differences.

**Recommendation.** Keep `assume`. It reproduces the planned edges exactly
(D1) and keeps 0 differences in every phase, which is the bar the earlier
tasks used.

**User decision (optional).** The plan approved by the user says `install`
consumes C. Options:
- (a) Accept the implementation note as written. Recommended.
- (b) Require literal plan conformance and loosen the differential bar to
  "check-phase naming differences only, Specialize, Go and diagnostics
  identical". Not recommended: it gains no semantics and loses a clean
  differential.

## Q3. Re-recording each round

- **Duplicates are not new.** E1 and b30b8b8 have identical duplicate
  counts, at most 2× per function across the corpus [ran]. Every
  consumption-based settling entry has always re-recorded its pairs; design
  property 2 requires it.
- **Effect on Task 9.** A duplicate has the same endpoints, reason and span
  as its first copy, and comes later in insertion order. It cannot change
  BFS `pred` or P7's choice (smallest span, then insertion), because the
  first copy always wins.
- **Insertion order versus the plan.** The plan's install-time consumption
  would have inserted these edges during body checking, before call-site
  edges at later spans. Here they come at settling. This can only change
  which equal-length BFS path `pred` keeps, so it affects Task 10's note
  choice, never the verdict. Task 9 and Task 10 pin the first observed text
  anyway.
- **Cost:** see I1.

## Issues

### I1 (Important, T003): Task 8 roughly triples the check time of many installations in one declaration

Check times [ran]. Both builds are warm, in one process, timing `check` only:

| Program | 66f1eca, n = 250 / 500 / 1,000 | b30b8b8, n = 250 / 500 / 1,000 |
|---|---|---|
| `main` with 1,000 sequential `with handler Tick { tick() => log(1) } { tick() };` under one Log handler | 0.36 / 1.04 / 3.97 s | 0.82 / 2.87 / 11.5 s |
| the same with late labels | 0.36 / 1.27 / 4.78 s | 0.89 / 3.36 / 13.4 s |

A chain of 1,000 functions, each installing a forwarding handler, stays
linear: 0.33 s against 0.38 s.

Notes on the measurements:
- The quadratic shape predates Task 8 (T008's family).
- Task 8 adds about 7.5 s at n = 1,000.
- In a CPU profile, `Lend` accounts for 4.4 s of the 10.7 s, mostly
  `walkedRow` / `Subst.spliced` over `current`'s and R's long tail chains.
  The chains are walked once per installation per round, and again twice
  per round in `labelCount` (Settle.purs:93-98, `lend` for both the before
  and after counts).

Task 9's scale test "1,000 installations in one declaration" sets its bound
at 3 × the measured median, so it would lock this cost in.

**Fix (forward verbatim):**

> Before Task 9, add this measurement to T008 (rows above). Then cut
> Lend's constant cost:
> (1) Walk `donor` and `target` once per entry per round. `labelCount` can
> reuse the round's `lend` result, instead of `lend` running at Settle.purs:97
> for both the start and end substitutions.
> (2) If (1) is not enough, address the tail-chain walk itself (T008).
>
> Report the 1,000-installation time beside 66f1eca's 3.97 s before pinning
> Task 9's bound.

### I2 (Important): the tests do not pin the edges' direction or partners; the TailPass installation rule is untested

- **Edge test.** test/fx008-install.test.mjs:44-56 asserts only that there
  is one distinct Assumed edge at the `with`. A mutant that swaps
  `stage`/`partner` in `Lend.assume` (Lend.purs, the `pairMarks` call),
  giving the edge C ⊑ current instead of current ⊑ C, **passes all five
  tests** [ran].
- **TailPass rule.** Removing the installation fold in TailPass.purs:46-48
  (the `installed` rule) passes all 228 fx008 tests and gives **0
  differences** over the corpus [ran].
- **Why the rigid test does not cover it.** The rigid test (:66-73) checks
  `current` ending in `Fixed`, but `run`'s signature already makes it
  `...e`.
- **Why the rule never fires.** R ≡ `current` binds that tail first: R's
  rigid tail comes from the clause tail pass or the hook, and its
  consumption at `with` passes it on. So the rule is a guard that never
  fires.

**Fix (forward verbatim):**

> (1) In `an installation records frame <= C edges`, assert the edge's
> endpoints. Its lower bound is the resolved mark of `run`'s signature Tick,
> `plain`. Its upper bound is the mark of the C label resolved from
> `installation.clauses`. Add a nested case, p10:
> `with handler Log { log(n) => print(n) } { with handler Tick { tick() => {
> log(1); log(2) } } { with handler Log { log(n) => { tick(); log(n) } } {
> log(3) } } }`.
> The innermost installation must have exactly the edges `frame(Tick) ⊑ c_tick`
> and `frame(outer Log) ⊑ c_log`, never its own frame. This kills the
> direction mutant and any wrong-partner mutant.
> (2) In TailPass.purs, comment the installation rule as "unreachable while
> R ≡ current; kept as the design §3.5 guard". Change the rigid test's
> claim, or add a test that reaches the rule if one can be found. Do not
> present the current assertion as evidence for the rule.

### M1 (Minor): the fallback is unobservable

Settle.purs:161 falls back to `consumeBare` when `assume` returns `Nothing`.
The note says this is unreachable, and the instrumentation agrees [ran]. If
it is ever reached, it is sound, but the IR naming differences come back
without anyone noticing.

Fix: state the invariant at the fallback ("lent labels ⊆ R ⊆ current by key
multiset; a consumption here only renames tails"). The current comment says
only "a label with no partner yet".

### M2 (Minor): `checkedStates` duplicates `check`'s private `rechecked`

Check.purs:71-80 copies `rechecked` and `located`.

Fix: lift `rechecked` to top level and define
`checkedStates program = traverse (stated program) program.functions` over
it. The layering is fine: it stays in Features and returns the internal
`State`, which the tests already reach through output modules.

### M3 (Minor): Settle's `consume` is over the where budget

`consume` now has 12 `where` bindings; the budget is about 8, and it already
had 9 before this task. Move the donor branch (`fresh`, `assumed`,
`marked`) into a named top-level helper, e.g. `consumeInstalled`.

### M4 (Minor): the test comment at test/fx008-install.test.mjs:52 is misleading

It reads "the same edge is not a second one", but the store does hold
duplicates and the test removes them.

Fix: "settling records each pair once per round; count distinct edges".

### M5 (Minor): two plan notes

- (a) Task 9's row `fx008-c-unified` names Install.purs, which no longer
  consumes C. Retarget the mutant at `Lend.assume` or Settle's donor branch
  (C paired with `current` under `EqualMarks`), or insert the consumption
  into `install`.
- (b) The design says "C is consumed into ρ" at `with`. Add a pointer there
  to the plan note.

## Also checked

- **Frame [ran].** The frame comes from `marks.fresh`, counting down, and
  `normalMark` makes it N for Console (p01-p12 and the Console test). The
  counter is decremented for Console too, which is harmless.
- **Revert risk.** `marks.fresh` lives in the substitution, which a
  postponed pair can revert, but frames are allocated during checking,
  outside any revert window.
- **Registration.** Installation ids come from `Map.size`. Installations are
  registered before the body, so ids and positions are monotone.
- **`watchTail`.** Not calling it is right: an installation entry has no
  typing effect (C ⊆ R ≡ current), so `sync` has nothing to do.
- **TailPass rule.** It matches design §3.5: the origin is the `with`, it
  loops on `changed`, and through `ensure` a closed row or another variable
  gives the missing-capability error.
- **Regression row.** `fx008-r-consumed` was moved to Install.purs with an
  equivalent needle, which is fine.
- **Budgets.** Every file is 185 lines or fewer, and the new modules are
  about 115 lines.
- **Style.** No lambdas and no `let … in`.
