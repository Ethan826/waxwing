# Verify timing reliability: runner proposal (2026-10-29)

Status: proposal for the author (dossier §18.113). Nothing here is
authorized or implemented. Task 24 is implementation complete,
verification blocked; Task 7 is held. No bound changes are proposed.

## What the measurements showed

Evidence: main checkout's .build/evidence/2026-10-29-task24/ and
.build/evidence/2026-10-29-reliability/ (each with MANIFEST.sha256).

- Six full or parallel-phase runs failed one or two timing bounds, and
  one isolated fn-linear-timing run failed one, across seven tests:
  coverage-scale (10,000-type chain; 5,000-field pattern), large-source
  (3,000-constructor match; 5,000-arm match) and fn-linear-timing
  (`over`, `partialFirst`, `parenthesized`).
- Under matched, interleaved conditions (ABBA, A = 7d1d668, B = b107049),
  A failed once in the parallel phase and B passed both runs. No `src/`
  file differs between the two commits.
- Run alone, coverage-scale (1-2 s) and large-source (17-18 s) passed
  4 of 4. Parallel contention is a plausible contributor to their
  parallel-phase failures; these runs do not prove the failures require
  it.
- fn-linear-timing alone passed 3 of 4. B failed once (`partialFirst`
  969 ms, bound 930). Across stage 1 and stage 2, `partialFirst` alone
  took 847 to 969 ms. This does not show an isolated failure on A.
- fn-linear-timing's bounds are 3 times the times measured on 2026-10-09
  (95458e3). Run alone now, the eight forms take 1.8 to 3.1 times their
  measured values (`pipe` 439-534 ms against 250; `value` 920-996
  against 400; `over` 1362-1445 against 540; `partialFirst` 847-969
  against 310). `partialFirst`, `over` and `parenthesized` have the
  least headroom. Whether the change since 2026-10-09 reflects code or
  this machine's state is not known.

## Problem 1: timing tests in the parallel phase

`npm run verify` runs every non-serial test file in one `node --test`
call, which on this machine runs up to 9 files at once
(`availableParallelism()` is 10). Timing tests in that phase share the
CPU with whatever else is running. scripts/verify.mjs already moves
`*.serial.test.mjs` files to a later one-at-a-time phase for this reason
(user, 2026-10-09), but some timing assertions are in parallel files.

### Proposed change 1a: move every timing assertion to the serial phase

Split each elapsed-time assertion out of its parallel file into a
`*.serial.test.mjs` file, unchanged: same test names, inputs, bounds and
assertions. A text scan for timing calls next to an `assert.ok(... <`
found twelve candidate files: coverage-scale, depth, fn-specialize,
functional, fn-syntax, large-source, poly-coverage, poly-depth,
poly-termination, grammar, r005b-predicates and r013-scale. The scan is a
starting point, not an inventory; step 1 of the implementation replaces
it with the gate in 1b.

Expected runtime cost: the moved tests run one after another instead of
alongside others. The isolated costs are known for two files
(coverage-scale about 2 s, large-source about 18 s); the others are
unmeasured. An estimate of 30 to 90 s added to a verify of about 10
minutes is a guess until step 1 measures each moved file alone. The
parallel phase loses the same work, so its wall time should fall
slightly.

### Proposed change 1b: a gate that keeps timing out of the parallel phase

A shared helper (for example test/timing.mjs, `withinSeconds`) becomes
the only way a test asserts elapsed time, and a structure check fails if
a non-serial test file imports it or calls `performance.now`,
`process.hrtime` or `Date.now` beside an assertion. The check decides on
parsed imports and calls, not matched text (the gate-integrity skill).

How it is tested: a must-fail fixture (a parallel file with a timing
assertion) and a must-pass fixture (the same file named `*.serial`);
the parallel and serial test-name lists before and after the move,
compared so the union is identical (no test dropped or renamed); each
bound compared as a value before and after.

### Proposed change 1c: record conditions in every verify

Before each phase, verify appends the 1-minute load, the power source and
the commit to its log, so a later timing failure can be read against
them. Cost: under a second. Test: a unit test of the formatter; the log
line is present in one verify run.

Not proposed: retrying failed timing tests (it would hide a real
slowdown), and lowering the parallel phase's concurrency (it slows every
verify and leaves the timing tests exposed to outside load).

## Problem 2: telling variation from a slowdown in `partialFirst`

A single run against a fixed bound cannot tell a slower machine from
slower code, and lower parallel concurrency cannot either: fn-linear
already runs alone.

### Proposed protocol (a measurement, run only on authorization)

1. **Reference and candidate.** Build both commits in separate
   worktrees: the commit that set the bounds (95458e3) and the current
   head. A third, 7d1d668, separates code changes since 2026-10-09 from
   Task 24.
2. **Interleaved repetitions.** Run fn-linear-timing alone, alternating
   commits in a randomized balanced order, for a fixed count stated
   before running (proposed: 20 per commit). Record each form's time and
   the conditions from 1c.
3. **A within-run ratio.** For each run, divide `partialFirst` by `value`
   from the same process. The ratio cancels machine speed shared by both
   forms, so a change in the ratio points at `partialFirst`'s own path.
4. **The decision rule, fixed before running.** Compare the two commits'
   distributions of raw times and of ratios with a Mann-Whitney U test
   (published, distribution-free) and report the median ratio between
   commits with a bootstrap 95% interval. A slowdown is called only when
   the interval for the candidate against the reference excludes 1 by
   more than a stated margin (proposed: 10%). Otherwise the difference
   is reported as within variation.

Expected cost: about 7 s per run, so 60 runs take about 7 minutes of
wall time, plus about 10 minutes to build the extra worktrees. Controller
tokens only, roughly 0.02M.

What it would settle: whether `partialFirst` (and the other forms) are
slower in code since 2026-10-09, or the machine is slower across the
board. A bound change, if any, would come after, as its own proposal,
with that evidence.

## Bounds

No bound changes are proposed. If the protocol shows the code is not
slower and the machine is, raising fn-linear's bounds or re-measuring
`measuredMs` would be a separate proposal, stated with the new
measurements and the argument for the new multiple.

## Order and authorization

1a with 1b and 1c is one runner change; Problem 2's protocol is a
separate measurement. Each needs its own authorization and cap. Until a
full verify passes with the runner change, the Task 24 gate stays
open and is not described as passed.
