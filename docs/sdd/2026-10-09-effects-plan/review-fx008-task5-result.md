# Review: FX008 Task 5 (settling loop), fx008-impl d9a0576 (base 84b684e)

[ran] = executed by the reviewer; [read] = from reading the code.
Scratch: /private/tmp/claude-501/-Users-ethan-Desktop-waxwing/d41c2ee4-6993-4bc5-a1f7-33359afc9a21/scratchpad/t5review/
(base build `base/output`, instrumented build `inst/`, one-line fix build
`fix/`, tools in `tools/`, counterexamples in `cx/`). The worktree was
not modified; `.build/regression` was written by the regression script,
as it always is.

## Verdict

- **Spec ✅.** The loop matches the corrected procedure, the gate diff
  is clean, and behaviour is preserved except for the four programs.
- **Quality: Needs fixes.** I1 below: the settle order is quadratic in
  the number of deferrals, through an eager `maybe` fallback that
  AGENTS.md forbids. It is a one-line fix.

## What ran

- `node --test test/fx008-cycle.test.mjs test/fx008-settle.test.mjs
  test/fx008-probes.test.mjs`: 123/123 pass [ran]. `8,000 defers settle`
  took 7076 ms against the 20 s child timeout.
- `test/fx-cleanup.test.mjs`: 32/32 pass, including the two P4 tests the
  plan names [ran].
- `node scripts/regression.mjs fx008-cycle-presence` prints the proof
  line [ran]. The mutant fails with `cycle weight: timed out`, which is
  the right reason: with presence weights dup's extra Log weighs 0, so
  there is no cycle and the loop grows τ forever.
- Whole-compile differential [ran]:
  - Corpus: examples/, negative/, .build/fx008-probes/**, and every
    literal containing `fn main` in test/*.mjs, without `${}` templates.
    That is 388 unique programs.
  - Base build vs candidate output, comparing Go text, or code, message,
    span and `related` notes.
  - Only design-review/r4, design-review/r5 (= n1, deduplicated) and dup
    differ. The new texts and spans equal the pinned ones. Every other
    program, notes included, is identical.
- Probe table diff [read]: only the dup, n1, r5 and r4 entries changed
  (fx008 outcome pinned, `flipped: true`, reason), plus `tableHash`.
- Cycle property test [ran]: 60,000 random feed graphs (1–7 rows, 1–4
  tail metas, 2 keys with duplicates, random positions). Each was
  checked against a brute-force enumeration of simple cycles. 0 failures
  over 34,140 positive and 25,860 non-positive cases. Checked:
  - `positiveCycle` is `Just` exactly when some per-key positive cycle
    exists;
  - the returned row has w > 0 and lies on a positive cycle of that key;
  - `feedOrder` is a permutation;
  - it is topological across SCCs;
  - it is ordered by (position, index) inside each SCC.
- Waxwing counterexamples (base → candidate, each under 20 s) [ran]:

| program | shape | base | cand |
|---|---|---|---|
| cx/two0 | two-row cycle (`defer k` in g calling j; `defer j` in h calling k), no labels | acc | acc (1 round) |
| cx/two1 | same, plus `log` in g and `tick` in h (w = −1 per key, mixed keys) | acc | acc (2 rounds) |
| cx/two2 | two-row cycle where Log is only in one row (ρg ⊇ ρk ~ ρh ⊇ ρj = Log + ρg) | acc | side-condition @ first defer (no finite solution, correct) |
| cx/two3 | mixed keys Log and Tick; positive for Log only | acc | rejected (correct) |
| cx/dup2 | two `defer k`, `k(3)`: duplicate rows, zero weight | acc | acc |
| cx/n1two | n1 with two defers: one SCC, both rows heavy | acc | rejected at the earliest defer (172) |
| cycle2open, cycle2, argbind, f1–f3 | probes that must stay accepted | acc | acc |

- Round counts (instrumented build, whole corpus) [ran]: 367 programs
  with deferrals or functions took 0 rounds to a no-change exit, 27 took
  1 round, 1 took 2. No program needed 3 or more.

## (1) The loop against the corrected procedure [read, ran]

- **(a)** `settleKeys` runs at the top of each round
  (Settle.purs:87). "Decided" means the postponed count went down.
- **(b)** Rows and targets are resolved, and edges are compared as
  unbound metas on the resolved tails (Feed.purs:40-50, `metaOf`).
- **(c)** w = count(own) − count(target) per key, with `Fail` left out
  unless `keepFail` (Cycle.purs:73-97).
  - Bellman–Ford runs per looping SCC and per positive key. It stops
    early when a pass moves nothing; a move in pass |S| means a positive
    cycle. The walk back |S| steps then the predecessor cycle are
    standard. The property test above confirms all of this.
  - Zero-sum cycles are allowed (cycle2open, two1).
- **(d)** Rows are consumed in `feedOrder` with a fresh tail, and `Fail`
  is filtered for deferred rows (Settle.purs:153-170).
- **Exit.**
  - The loop continues when (a) decided a pair, or when any entry's own
    label count changed between the round's start (before (a)) and its
    end (after (d)), whatever binding caused it.
  - It also continues when (a), re-run after (d), would decide a pair
    (`retry`).
  - A round with no change is the idle round. It already consumed every
    row, and since rows only append, an equal count means an identical
    label list. Every X ⊑ T re-established in that round therefore holds
    at its end. A positive cycle cannot coexist with all containments
    holding (each w ≤ 0), so exiting without another (c) is sound. This
    meets the controller's ruling as I read it: the exit test is
    evaluated after the round's own consumption.
- **After exit.**
  - `settleFinal` turns a leftover pair into `Fail needs a concrete
    error family`.
  - `judgeDeferrals` runs after the loop (Check.purs:120-123).
- **P14.** Deferrals are sorted by (span start, registration index)
  (Settle.purs:47-60). Kahn's ready set is keyed by (earliest position,
  part id).
- **Termination.**
  - `decided` strictly lowers the postponed count.
  - `retried` makes the next (a) decide a pair.
  - `changed` is bounded by the review's 4c argument.
  - There is no explicit guard, as designed.

## (4) Performance [ran]

Warm, in-process compile times in ms, for `fn main(): Unit with Console
= { defer print(i); … () }`:

| N | base | candidate | candidate + fix (I1) |
|---|---|---|---|
| 1,000 | 89 | 196 | 116 |
| 4,000 | 349 | 1,801 | 464 |
| 8,000 | 796 | 6,438 | 912 |
| 16,000 | 1,381 | 26,494 | 2,063 |

- The candidate is quadratic. It is 8× base at 8,000, not 1.4×.
- With the fix it is linear and about 1.4× base, which matches the
  controller's figure.
- Profile: 4.9 s of 5.3 s in Settle is spent in `FeedOrder` (I1).
- The round count is not the problem: these programs have 0 edges and
  take 1 round.
- The `8,000 defers settle` test has only about 2.8× headroom under its
  20 s child timeout on an idle machine. Task 9's scale test at twice
  the size would show the 4× growth.

## Findings

### Critical

None.

### Important

**I1. Quadratic settle order, through an eager `maybe` fallback**
(src/Features/Check/FeedOrder.purs:76-78).

```
release graph state = maybe (Done (stackItems state.order)) released
  (Set.findMin state.ready)
```

- PureScript is strict, so `stackItems state.order`, which is O(N), is
  computed on every release step. That makes the order O(N²) in the
  number of components, i.e. the number of deferrals.
- It breaks AGENTS.md: "Computed Maybe fallbacks use `maybe'`".
- It also breaks the plan's T003 linearity constraint.
- Programs: any declaration with many defers; 16,000 `defer print(i)`
  takes 26.5 s against base's 1.4 s.
- Fix [ran in fix/]:

  ```
  release graph state = maybe' finished released (Set.findMin state.ready)
    where
    finished _ = Done (stackItems state.order)
  ```

  This restores linear scaling (table above).
- Add a proof that does not rely on timing. For example, an in-process
  test that the ratio of 16k to 8k compile time stays below 3. If that
  is judged too flaky, record it in BACKLOG T003 with Task 9's scale
  test as the control.

### Minor

- **M1. The same eager-fallback pattern in Feed.purs:92-94.**
  `maybe (Loop (finish walk call below)) …` computes `finish`, a Walk
  update with Map work and possibly `popUntil`, on every successor step.
  Measured linear on an adversarial chain plus fan-out (8,000 rows:
  50 ms), so this is a rule breach, not a hot spot. Use `maybe'` with a
  named helper.
- **M2. Declaration budgets.** `cycleFor` (Cycle.purs:127-141) and
  `condense` (FeedOrder.purs:48-62) each have 9 `where` bindings against
  the aim of 8. Split the edge construction out of `cycleFor`, and the
  owner map out of `condense`.
- **M3. Duplicated work and helpers.**
  - Each round computes `feedsOf` and Tarjan twice, once in `feedOrder`
    and once in `positiveCycle`.
  - `positionOf` (FeedOrder.purs:64) duplicates `positionAt`
    (Cycle.purs:64).
  - `snd'` (Feed.purs:57) is an unclear name.
  - Option: compute the graph once per round and pass it to both.
- **M4. Feed graph size.** Edges are over rows, so N rows sharing one own
  tail and one target tail give N² edges (`shared` shape). Base is
  already quadratic there, and with the fix the candidate is about 1.45×
  base (1,000 rows: 3.65 s vs 2.48 s). A graph over tail classes (rows as
  labelled edges between metas) would be O(N). Worth a BACKLOG note
  before Task 7 adds clause entries.
- **M5. Interface drift from the plan's Task 5 text.**
  - `Entry` has no `tail ∷ EntryTail` field.
  - `FeedRow` lives in Feed.purs; Cycle does not export it.
  - Task 6 adds `EntryTail` per its own file list, so nothing blocks.
    The plan's Task 5 Interfaces should be amended, or the field added
    now with `Fresh` only.
  - `positiveCycle rows starts`, which searches only SCCs reachable from
    `starts`, already serves Task 7's F2 over `affected`.
- **M6. The loop's `next` and `origins` are dropped**
  (Check.purs:120-122). `ended = finished { subst = restricted.subst }`
  is the same as base, which discarded `settleDeferred`'s state, and this
  is why notes are unchanged. But the provenance the loop records for
  late consumptions, and its fresh counter, never reach `judgeDeferrals`
  or `Entry.check`. Tasks 7 and 9 (clause entries, the mark check, notes)
  will need `restricted` itself. Note it in the Task 7 handoff, since
  switching changes notes.
- **M7. Diagnostic precedence moved for multi-error defer programs.**
  This is a consequence of the order the plan mandates. cx/order1.wxw (a
  late `Fail(E)` reaching `defer kk(())`, plus n1's cycle) is rejected
  by both builds, but:
  - base: `defer must not fail, but it performs Fail(E)` @158-170;
  - candidate: the side-condition text @212-222.

  It is not a gate probe, and the outcome is unchanged. Record it in
  §6/Task 12 as an allowed text move, or keep the earliest-span
  diagnostic.
- **M8. Doc drift.**
  - The plan's T003 line says no-feed-edge declarations "settle in two
    rounds". The measured count is 1 round plus a `retry` call only when
    pairs are postponed. Amend the line.
  - docs/engineering.md:132, a new line, is 123 columns. Rewrap it.

## (5)–(7) other checks

- **(5)** The regression row is real: exactly one needle, the mutant
  compiles and times out on dup, and the healthy build passes [ran].
- **(6)** For Task 7, `FeedRow` and `positiveCycle` fit F2. `Entry` needs
  `tail` and a `Remainder` consumption path (Task 6/7). The exit test
  already counts every entry's own row, so clause rows `c` will be
  counted as the termination review requires.
  - For `keepFail` rows, an unkeyed `Fail` is not counted in the
    weights. That is safe: such a pair is set aside, so it never extends
    anything, and then reaches `settleFinal`.
- **(7)** AGENTS.md:
  - Files are under 250 lines (Cycle 191, Settle 170, Feed 164,
    FeedOrder 102). test/regression.mjs is 247 (net −2) and
    scripts/regression.mjs 246 (+1).
  - No lambdas, `let … in`, or anonymous transformations.
  - Breaches: I1 and M1 (eager `maybe`), and M2 (budgets).
