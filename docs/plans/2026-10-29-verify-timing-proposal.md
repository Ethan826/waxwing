# Verify timing reliability: runner proposal (2026-10-29)

Status: proposal for the author, revision 2 (dossier §18.113-§18.114).
Nothing here is authorized or implemented. Task 24 is implementation
complete, verification blocked; Task 7 is held. No bound changes are
proposed.

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
  least headroom.

## Problem 1: timing tests in the parallel phase

`npm run verify` runs every non-serial test file in one `node --test`
call, which on this machine runs up to 9 files at once
(`availableParallelism()` is 10). scripts/verify.mjs already runs
`*.serial.test.mjs` files afterwards, one at a time, because timing
bounds suffer under the parallel runner's load (user, 2026-10-09), but
some timing assertions are still in parallel files.

### 1a. Move every timing assertion to the serial phase

Each test that measures elapsed time moves from its parallel file to a
`*.serial.test.mjs` file. What must not change: the test's name and the
suite it sits in; the workload it measures, meaning the code between
the two clock readings and the inputs built before them; where the
clock readings sit relative to that workload; and every bound's value.
A text scan found twelve candidate files (coverage-scale, depth,
fn-specialize, functional, fn-syntax, large-source, poly-coverage,
poly-depth, poly-termination, grammar, r005b-predicates, r013-scale).
The scan is a starting point; the gate in 1b is the inventory.

How the move is checked:

- **Test inventory as a multiset.** Before and after, list every test
  as (suite path, test name, skip or todo marker), counted with
  multiplicity, from the node test runner's structured output for both
  phases together. The two multisets must be equal, so a duplicate name
  cannot hide a dropped test, and no test may change phase except the
  moved ones, which are listed by name.
- **Workload and bounds.** For each moved test, the source text of the
  test body is compared before and after, ignoring only the indentation
  that the move changes, and each bound constant is compared by value.
  Helpers the body calls stay where they are or move unchanged.

Expected runtime cost: the moved tests run one after another instead
of beside others. Isolated costs are known for two files (coverage-scale
about 2 s, large-source about 18 s); the rest are unmeasured, so the
total added to a verify of about 10 minutes is unknown until the first
implementation step measures each moved file alone. The parallel phase
loses the same work.

### 1b. A gate that keeps clocks out of the parallel phase

The rule is simpler than "a clock beside an assertion": a parallel
(non-serial) test file, or a module it imports from test/, may not read
a clock at all, except through an entry in an explicit allowlist that
starts with the uses listed below.

Detected clock reads:

- `performance.now`, `performance.timeOrigin`, `performance.mark`,
  `performance.measure`, `globalThis.performance`, and any import from
  `node:perf_hooks` or `perf_hooks`;
- `Date.now`, and `new Date` used in arithmetic or comparison;
- `process.hrtime` and `process.hrtime.bigint`;
- `console.time`, `console.timeEnd`, `console.timeLog`;
- aliases of any of these by destructuring (`const { now } =
  performance`), assignment or `.bind`, followed through the same file;
- imports of the timing helpers test/timing.mjs (new, the one way to
  assert elapsed time) and test/go-timed.mjs.

Existing clock reads that are not bounds and need an allowlist decision
by the author: test/fx-shrink.mjs uses `Date.now` for a shrink deadline,
so under load it may stop shrinking earlier (the result can differ, but
nothing fails on time); test/go-timed.mjs writes `Date.now()` into a
cache nonce; test/regression-r005b-end.mjs waits for a quiet period.

How it decides: on a parsed syntax tree, not matched text. The
repository has no JavaScript parser today (package.json has no
dependencies), so this needs either:

- (i) a new pinned dependency, such as `acorn`, taken through the
  dependency-intake review (exact pin, lockfile, license); or
- (ii) a lexical scan of tokens with comments and strings removed,
  which is weaker and must list more blind spots.

Proposal: (i). Option (ii) is the fallback if the author declines a
dependency.

Blind spots, either way: a clock reached through a module outside
test/ (scripts/, compiled output, a child process); computed property
access (`performance['n' + 'ow']`) or `eval`; elapsed time asserted
through a runner timeout (`{ timeout }`, `spawnSync`'s `timeout`), which
the gate does not treat as a clock; and a clock read in one file whose
value is compared in another. These are written into the gate's comment
and into docs/engineering.md beside its rule.

How it is tested: must-fail fixtures, one for each detected form and
alias; must-pass fixtures (the same code in a `*.serial.test.mjs`
file; an allowlisted use); near-miss probes (`performance` as an
unrelated local name, a string containing "Date.now"); and a floor on
the number of files scanned, so an empty scan cannot pass.

### 1c. Record conditions in every verify

Before each phase, verify appends the commit, the time, the 1-minute
load average and the power source to its log. Each value that the host
cannot give is written as `unavailable` with the reason, never left out
or guessed: `os.loadavg()` returns zeros on Windows; the power source
comes from `pmset -g batt` on macOS and from /sys/class/power_supply on
Linux, and is `unavailable` elsewhere or when the command fails. Only
macOS builds are verified today (README: cross-platform builds remain
unverified), so the Linux and Windows paths are tested with injected
command results, not on those hosts. Cost: under a second per verify.
Test: unit tests of the formatter with each value present and absent;
the line appears in a verify log.

Not proposed: retrying failed timing tests (that would hide a real
slowdown), and lowering the parallel phase's concurrency (it slows every
verify and leaves timing tests exposed to outside load).

## Problem 2: a measurement protocol for `partialFirst`

A single run against a fixed bound cannot tell ordinary variation from
a slowdown, and lower parallel concurrency cannot either: fn-linear
already runs alone. This protocol is a measurement, to be run only on
authorization; everything below is fixed before running.

**Commits.** The primary comparison is the current head against 95458e3,
the commit that set fn-linear's bounds. 7d1d668 is a secondary,
descriptive comparison (no `src/` difference from b107049 is expected
to show). All three are built in separate worktrees before any run.

**Order.** 20 blocks; each block runs the three commits once, in an
order drawn from the six permutations by a seeded generator. The seed
and the full schedule are written to the log before the first run. Each
run is one `node --test --test-concurrency=1` of
test/fn-linear-timing.serial.test.mjs, with 1c's conditions recorded.

**Primary statistic.** For `partialFirst`, the ratio of medians of raw
elapsed time, head over 95458e3, with a 95% percentile bootstrap
interval: 10,000 resamples, each drawing 20 runs with replacement within
each commit, with a fixed seed. Raw times are the primary evidence.

**Outcomes, stated before running.**

- Slowdown established: the interval's lower end is above 1.10.
- No difference larger than 10% established: the whole interval lies
  between 1/1.10 and 1.10.
- Inconclusive: anything else. Failing to show a slowdown is not
  evidence of equivalence and is reported as inconclusive.

**Supporting evidence, not part of the decision.** The within-run ratio
of `partialFirst` to `value`, summarized the same way. It cancels only a
slowdown that scales both forms by the same factor; it can hide a
slowdown shared by both paths, and it moves when `value` itself
changes. The other seven forms' raw times, summarized the same way. No
second test (Mann-Whitney or other) is used for the decision.

**What it can conclude.** Whether the commits differ in fn-linear time
under today's conditions on this machine. It cannot say how much the
machine has changed since 2026-10-09, and it does not separate every
environmental effect from code changes.

Expected cost: about 7 s per run, 60 runs, about 7 minutes; building
the extra worktrees about 10 minutes. Controller tokens only, roughly
0.02M.

## Bounds

No bound changes are proposed. Any change to fn-linear's bounds, or a
re-measurement of `measuredMs`, would be a separate proposal stated with
the protocol's results and the argument for the new multiple.

## Implementation estimate for 1a-1c (for authorization)

One implementer subagent, one targeted review, one fix round, and one
full verify under the lock, in this order: 1c, the 1b gate with its
fixtures (which produces the inventory), then 1a's moves with the
multiset and workload checks. Estimate 0.25M to 0.35M tokens; proposed
cap 0.4M. If the author chooses option (i), the dependency-intake
review adds about 0.03M before implementation. Stop points: a moved
test whose workload cannot move unchanged; an allowlist decision the
author has not made; any bound that would have to change.

## Order and authorization

1a-1c is one runner change; Problem 2's protocol is a separate
measurement. Each needs its own authorization and cap. Until a full
verify passes with the runner change, the Task 24 gate stays open and
is not described as passed.
