# FX008 Task 11 review: failing random clauses and the soundness differential

Range `52b9df8..2ef711b` (worktree /Users/ethan/Desktop/waxwing-fx008-impl),
against docs/plans/2026-10-10-abort-tracking-plan.md "### Task 11" and
AGENTS.md. Reviewed 2026-10-12.

**Verdict: changes required (1 Critical, 3 Important, 3 Minor).** The
differential is real evidence for one escape shape. It covers a failing
handler installed lexically around the `defer`, in the same function, whose
clause fails directly. It gives no randomized evidence for the shapes that
produced the Task 9 holes. The `failing random clause` census row is met by
the designed `failing-frame` fragment, not by random clauses. The recorded
sensitivity count is wrong: 70 of 77, not 77.

Experiments (scratch copy of test/ against the worktree's output/; seed
20261010)
---

I instrumented the oracle to record each cleanup's operations, clause
parameters, the function that installed the handler, the handler expression
and the function that registered the `defer`. I then classified the 77
escapes in `generate(20361010 + i, i, { unconstrained: true })`, i < 300:

| Shape | Escapes |
|---|---|
| Lexical handler around the defer, clause fails directly (`w`), same function | 73 (71 in main, 2 in a generated fn; 3 reach the op through a call to `fN`) |
| Forwarding clause into a failing outer handler | 1 (seed index 237: `Tick(n) > Tick(w)`, inside a generated fn) |
| Handler installed by a caller in another function | 0 |
| Handler value passed as an argument or returned (a1-a10) | 0 (every handler is a `handler` literal) |
| Clause calling an ambient callback | 0 |
| Mark variables / `nofail(k)` | 0 (no generic rows are generated) |
| No user op at all: the cleanup calls `risky` (direct `Fail(Err)`) | 3 |

Other measurements:
- **Without the `failing-frame` fragment** (its push disabled):
  - Soundness corpus: 0 escapes witnessed and 1 FX008-headline rejection,
    against 77 and 73 with the fragment.
  - Default census: `failing random clause` = 1, against 78 with the
    fragment. 77 of the 78 come from the fragment.
  - The random path writes a `w` clause in 30-42 programs, but the clause
    almost never runs. Most sit in uncalled generated functions or in dead
    code.
- **Sensitivity**: I rebuilt ff0c6d1 in scratch. It accepts 70 of the 77
  witnessed escapes. It rejects 7 (indices 14, 16, 75, 129, 175, 191, 265)
  with `defer must not fail, but it performs Fail(Err)`, because the
  fragment's unconstrained `defer` calls `risky` or an `fN` with
  `Fail(Err)`.
- **Accepted programs whose cleanup performs a user op** (55): only 8
  contain a failing clause, and only 2 run one. Go = oracle on the accepted
  half therefore says little about FX008 precision next to failing frames.
- **Margin across 10 seeds** (20261010, 1, 777, 42, 1000, 31337, 5, 99,
  123456, 2024):
  - Accepted with a cleanup op: 50-63.
  - Rejected by an FX008 headline: 67-83.
  - Escapes witnessed: 70-87.
  - Holes: 0.

## Critical

**C1. The `failing random clause` census row (≥ 25) is met by the designed
fragment, and random failing clauses almost never run.** The default census
gives 78. With `failing-frame` disabled it gives 1. The soundness corpus
witnesses 0 escapes without the fragment. The plan says a random clause body
may be `fail(...)`. As written, that path compiles but is dynamically dead,
so the census row and the docs/engineering.md text ("Random clauses may
fail ... which the census counts as `failing random clause`") overstate
coverage. Fix, to forward verbatim:

> In test/fx-gen-expr.mjs `wrapUser`, make failing random clauses reachable:
>
> (a) When no failure family is in scope, with chance 30, wrap the `with` in a
> `handle` of a random family (`handle(block([doItem(wrapUser(extend(ctx,
> family), depth, label))]), [failureClause(ctx, family, 1)])`) so that a
> `w` clause is possible.
>
> (b) When the clause kind is not `plain`, end the `with` body with
> `doItem(performing(calm(inside), label))` so that the clause runs, and with
> chance 50 register `deferItem(cleanupExpr(inside, 1))` before it.
>
> (c) Report the census of `clause-abort:w` with the `failing-frame` push
> disabled. It must be ≥ 25 by itself; the reviewer measured 55 at seed
> 20261010 with (a)+(b). Report the soundness counts with the fragment
> disabled too; the reviewer measured 10 escapes from the random path.
>
> (d) If a random clause still cannot reach 25 on its own, rename the census
> row `failing clause (designed or random)` and correct docs/engineering.md
> to say the fragment supplies it. Either way, the soundness test's
> diagnostic line reports how many witnessed escapes come from
> `failing-frame` and how many from random clauses.

## Important

**I1. Escape shapes: no cross-function or handler-as-value escapes.** All
witnessed escapes have the handler literal and the `defer` in the same
function. There is one forwarding escape and none of the a1-a10 shapes:
handler through `id`, a lambda parameter, a box, `later(x)(())`, or `g(x)`
with the handler from the caller. The "rejected at a `defer`" requirement
excludes the most important cross-function case: a generated function with
a `nofail Log` row and a `defer log`, called under a failing handler, is
rejected at the call. That is why `callable` excludes such functions even in
unconstrained bodies. Fix, to forward verbatim:

> Add variants to `failingFrame` (test/fx-gen-fragments.mjs), chosen at
> random. Each variant needs at least 5 witnessed escapes per 300
> unconstrained programs, and the test diagnostic reports the count per
> variant.
>
> (1) **forward**: the frame's clause forwards (`log(n) => print(tick(n))`)
> to an outer `with handler Tick { tick(w) => fail(P) }`.
>
> (2) **callee**: the registered defers move into a generated helper,
> pushed to `ctx.shared.extra`, that is called inside the `with`. Write the
> helper's row in two variants, plain `Log + Console` (rejected at the
> helper's `defer`) and `nofail Log + Console` (rejected at the call).
>
> (3) **value**: the failing handler is bound with
> `let h = handler Log { log(w) => fail(P) }` and installed by a generated
> `fn install(h: Handler(nofail Log with ...e)): Unit with ...e + Console`
> whose body is `with h { defer log(k); () }`. Do the same through an
> identity function on handlers (a1/a10).
>
> (4) **ambient**: a helper `fn bracket(f: Unit -> Unit)` installs
> `handler Log { log(n) => f(()) }` around the defers, and main passes a
> failing lambda.
>
> In test/fx008-soundness.serial.test.mjs, accept a rejection whose message
> matches `isHeadline` at a call or argument span inside the program, not
> only at a `defer`. Keep `isStrictText` restricted to `defer` spans. Update
> docs/engineering.md accordingly.

**I2. The recorded sensitivity is wrong: 70 of 77, not "all 77".** The
reviewer's rebuild of ff0c6d1 rejects 7 witnessed escapes with the strict
`Fail(Err)` text. docs/engineering.md says "every witnessed escape is
accepted", which is false. Fix, to forward verbatim:

> Correct the Task 11 evidence and docs/engineering.md. The sensitivity text
> becomes: "with the mark check absent (Task 8's state), N of the M witnessed
> escapes are accepted and the test fails". Use the numbers from a re-run
> after I3, and record the command and commit used.

**I3. The fragment's unconstrained `defer` can fail directly, which
pollutes the escape count.** `performing({ ...inside, lax: inside.failing },
label)` uses `inside = installed(extend(safe(ctx), family), ...)`, which
still holds the family label. `intExpr` can therefore call `risky` or an
`fN` with a `Fail(...)` row. As a result:
- 3 of the 77 "escapes" perform no user operation;
- 7 programs are rejected by the strict rule, which never exercises the mark
  check on them.

Fix, to forward verbatim:

> In `failingFrame`, build the unshifted defer from
> `{ ...safe(inside), lax: inside.failing }`. Check the registered
> `cleanupExpr(inside, 1)` defers in the same way. Then add to the
> soundness test: every witnessed escape's program, if rejected, is
> rejected by an FX008 headline, not a strict text. Re-run the soundness
> test and the sensitivity check.

## Minor

**M1. The thin margin (accepted with a cleanup op: 50-63 over 10 seeds; 50
at seeds 1 and 777).** The test is deterministic at the default seed and
acceptable as it stands. It is fragile under generator changes. I measured
three alternatives:
- Raising the probability of cleanup user ops (a Tick option, or biasing
  cleanup toward fail-free labels) does not help, because more cleanups then
  reach failing labels and are rejected.
- Lowering the fragment's unshift chance from 70 to 40 does not help.
- The bottleneck is that the cleanup scenario fragments run at top level
  with no user handler installed.

Fix, to forward verbatim:

> In the unconstrained corpus only, with chance 50, wrap each
> `cleanupFragments` scenario in a fail-free `with handler Log` or `Tick`
> (plain clause, `installed(ctx, label, 'plain')`), so that its cleanups
> may perform the label. Also add to `failingFrame` a fail-free sibling
> handler of the other label, and register a cleanup that performs it
> **before** the trigger. Accepted programs then include cleanups performing
> a user op next to a failing frame. Report the minimum over seeds
> 20261010, 1, 777, 42, 1000, 31337, 5, 99, 123456 and 2024; it must be
> ≥ 60. Add to the diagnostic the number of accepted cleanup-op programs
> that also ran a failing clause.

**M2. The census event is tied to a parameter name.** `clause-abort:w`
counts any clause whose parameter is `w`, including hand-written test
programs. This is acceptable for a test oracle and it is documented in
fx-oracle-frames.mjs. Fix, to forward verbatim:

> Note in test/fx-census.mjs that `w` is reserved for generated failing
> clauses.

**M3. Deviations: acceptable.**
- The separate `failingHandlerRejection` export, with its own 25-variant
  test, is clearer than extending `rejection(seed, index)`. The three kinds
  match the plan, and the span and message are asserted exactly.
- Keeping `failing-frame` outside the focus rotation is reasonable, apart
  from C1's attribution problem.
- The new events `cleanup-operation` and `clause-abort:*` only add to
  `events`. The catch rethrows, and escape detection in `runCleanups`
  (any `Abort` leaving a deferred expression is an `OracleError`) does not
  depend on them. Neither the events nor the fragment can hide an escape.
- The one-way differential remains dynamic: an escape on a path that never
  runs is invisible. That limit is inherent and fine given the measured
  sensitivity.
- Budgets: all touched files are ≤ 199 lines. A few JS lines run to
  102-123 columns, which no rule enforces for JS.

Fix, to forward verbatim:

> Record the deviations in the Task 11 evidence. Change the
> docs/engineering.md paragraph per C1 and I2. Wrap
> fx008-soundness.serial.test.mjs:75 and fx008-soundness-support.mjs:42
> under 100 columns.

On the generator constraints (question 3): in the default corpus,
`calm`/`callable` exclude failing labels from cleanups and plain clauses.
They also exclude, everywhere under a failing frame, calls to functions
whose row names the label. Given that every generated row is
`nofail`-marked, the exclusion is necessary. It does not make the corpus
trivially safe: designed frames and forwarding stay in. `unconstrained` is
unconstrained only inside cleanup, which is what the plan specifies. It
never places a nofail-row callee with its own `defer` under a failing frame
outside cleanup, which is the shape I1(2) adds.
