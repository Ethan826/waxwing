# Where `npm run verify` spends its time (2026-10-17)

Measurement only. Nothing in scripts, tests or source was changed; every
speedup below is a proposal that needs the user's approval before work.
Raw data and the throwaway drivers are in `.build/profile/` (git-ignored):
`phases.jsonl`, `par.jsonl`, `ser.jsonl`, `rows.jsonl`, `tests-summary.txt`,
`drive.mjs`, `regdrive.mjs`, `reporter.mjs`.

## Method

- Host: macOS arm64, 10 cores (`sysctl -n hw.ncpu`), nothing else running.
  `GOTOOLCHAIN=go1.26.4`, purs 0.15.16, Node as installed.
- `rm -rf output .build/go-cache` first, then the same commands verify runs,
  in its order, each timed by wall clock (`.build/profile/drive.mjs`):
  purs-tidy, `scripts/build.mjs`, `scripts/strict-rebuild.mjs`, the
  structure gate, `scripts/width.mjs`, `node --test` over the 147 parallel
  files, `node --test --test-concurrency=1` over the 14 serial files.
- Per-file test time comes from a custom reporter summing the top-level
  test durations of each file (Node reports no per-file event here).
- The regression phase was run row by row (`node scripts/regression.mjs
  <name>` for each of the 142 rows, `.build/profile/regdrive.mjs`) so each
  row has its own wall time. The sum includes one Node start per row
  (about 0.1 s). I did not run `scripts/regression.mjs` whole, so I have
  not measured how its total differs from this sum.
- Parallel runner concurrency is Node's default (cores minus one, so 9);
  verify passes no `--test-concurrency` there.

## Total and per-phase

Sum of the phases below: 1292 s, 21.5 min. This is lower than the
25-30 min quoted in the task; I measured one run on an idle machine and
cannot say what accounts for the difference (a busy host, an older
tree, or first-run effects are guesses, not findings).

| Phase | Wall (s) | Share |
|---|---:|---:|
| purs-tidy check | 0.5 | 0.0% |
| build (cold `output`, spago --strict) | 7.3 | 0.6% |
| strict-rebuild proof | 16.5 | 1.3% |
| structure gate | 1.1 | 0.1% |
| width gate | 0.1 | 0.0% |
| `node --test` parallel (cold Go cache) | 76.0 | 5.9% |
| `node --test` serial (cold Go cache) | 92.6 | 7.2% |
| regression proofs (142 rows, sum) | 1098.3 | 85.0% |
| Total | 1292.4 | 100% |

Warm Go cache (rerun of the two test phases right after, same machine):
parallel 58 s (cold 76), serial 88 s (cold 92.6). The cold-cache cost is
about 18 s plus 5 s, small next to the regression phase. `.build/go-cache`
was 1.2 GB after the run.

## Test files

Parallel phase: 147 files, 2112 top-level tests, summed test time 520 s
over 76 s wall (about 6.8 cores busy out of 9 slots). The longest single
file (depth.test.mjs, 35 s) is under half the wall time, so file sharding
cannot shorten this phase much.

Top 25 parallel files by summed test time:

| File | Seconds | Tests | Slowest test (s) |
|---|---:|---:|---:|
| depth.test.mjs | 35.0 | 37 | 2.7 |
| fx008-hook.test.mjs | 30.6 | 25 | 5.9 |
| adt-order.test.mjs | 25.6 | 7 | 8.5 |
| poly-properties.test.mjs | 23.0 | 7 | 11.3 |
| large-source.test.mjs | 21.4 | 15 | 6.4 |
| text-properties.test.mjs | 17.2 | 3 | 9.8 |
| r001-go-keys.test.mjs | 14.9 | 12 | 9.5 |
| adt-print.test.mjs | 14.3 | 7 | 8.7 |
| fx008-probes.test.mjs | 13.7 | 110 | 1.9 |
| compiler.test.mjs | 13.4 | 12 | 5.8 |
| compare.test.mjs | 13.1 | 6 | 8.3 |
| adt-match.test.mjs | 12.7 | 13 | 7.5 |
| fn-run.test.mjs | 12.6 | 22 | 10.3 |
| fx020-imports.test.mjs | 12.3 | 18 | 3.5 |
| fn-specialize.test.mjs | 12.2 | 6 | 7.6 |
| poly-run.test.mjs | 11.8 | 27 | 10.3 |
| r005-go.test.mjs | 11.7 | 12 | 1.8 |
| fx008-defer.test.mjs | 10.9 | 26 | 10.0 |
| r001-go.test.mjs | 9.7 | 13 | 2.1 |
| r004-go.test.mjs | 9.2 | 8 | 1.7 |
| fx-console.test.mjs | 8.8 | 8 | 1.5 |
| r012-arguments.test.mjs | 8.8 | 12 | 1.0 |
| adt-properties.test.mjs | 8.3 | 2 | 8.1 |
| fx-oracle-record-patterns.test.mjs | 8.3 | 5 | 8.2 |
| fx-oracle-record-extension.test.mjs | 7.8 | 8 | 7.8 |

Serial phase: 14 files, 59 tests, summed 86 s, one at a time:

| File | Seconds | Tests |
|---|---:|---:|
| fn-linear.serial.test.mjs | 24.0 | 8 |
| fx-differential.serial.test.mjs | 14.5 | 8 |
| fn-scale.serial.test.mjs | 11.3 | 4 |
| text-scale.serial.test.mjs | 6.5 | 4 |
| fn-linear-timing.serial.test.mjs | 6.2 | 8 |
| r001-scale.serial.test.mjs | 5.1 | 2 |
| fx008-install.serial.test.mjs | 5.0 | 2 |
| fx008-soundness.serial.test.mjs | 4.7 | 5 |
| the other six files | 9.0 | 18 |

## Regression proofs

142 rows, all passing, summed 1098 s (average 7.7 s). Row times: minimum
6.3 s, median 7.1 s, maximum 27.1 s. 130 rows take 8 s or less. Twelve
rows take more; the slowest are fx008-f2 (27.1), fx008-cycle-presence
(27.0), fx-side-condition (26.7), fx008-settle-order-linear (21.5),
fx008-install-linear (20.4) and duplicate-scan-timing (13.6). Their
extra time (about 100 s over a typical row) is probe work (Go builds and
long checks), not compilation.

What a typical row costs (the `branch` row, measured by hand):

| Step | Wall (s) |
|---|---:|
| copy `src` | 0.07 |
| full `purs compile` of workspace and dependencies into a new output | 5.7 |
| healthy probe (`test/regression.mjs`) | 0.2 |
| mutant probe | 0.3 |

So about 85% of a typical row is the from-scratch purs compile, which
compiles 523 modules each time (20 s user CPU, about 3.8 cores busy for
5.9 s wall). Nothing is cached between rows: each row copies `src` only
and recompiles the dependencies too.

Other measurements:

- Incremental purs into an existing output: no change 0.26 s; the `branch`
  mutation in `Features.Check.Infer` 0.73 s; a one-line change in
  `Domain.Syntax.Core` (low in the graph) 5.6 s, about a full compile.
- Copying the 71 MB built `output`: `cp -R` 1.2 s, `cp -cR` (APFS clone)
  0.4 s.
- Where the 142 rows mutate (edit count by directory): Features/Check 73,
  Features/Resolve 36, Format/Go 25, Features/Specialize 10, Format/Lex 4,
  Format/Parse 2, Format/Diagnostic 1, Domain/Type 1. Most sit high in the
  module graph, where an incremental compile touches few dependents; I
  measured only `Infer`, so the typical incremental cost is an estimate.
- Ten simultaneous full purs compiles took 38 s wall (3.8 s each) against
  5.9 s alone: purs already uses several cores, so running rows in
  parallel gains about 1.5x, not 10x.

## Observations

- Regression proofs are 85% of verify, and nearly all of that is
  repeated identical dependency compilation, not testing.
- The test phases total 169 s (13%); their Go-cache cold penalty is small.
- Build, strict rebuild and the gates together are 26 s (2%).
- The parallel phase is bounded by total CPU (520 s over 9 slots), not by
  one long file.
- The serial phase is serial by policy (timing bounds; T003, T004, T007)
  and 92 s of the total.
- `scripts/regression.mjs` removes `.build/regression` at the start, so
  rows cannot be run concurrently from separate invocations without a
  change to that line.

## Proposals (need the user's approval; none implemented)

Ranked by expected saving, then risk. Savings are estimates unless noted.

| # | Proposal | Est. saving | Risk |
|---|---|---:|---|
| 1 | Incremental regression compiles from a cloned baseline output | 8-12 min | Medium |
| 2 | Run regression rows concurrently (3 to 4 workers) | 4-8 min | Medium |
| 3 | Profile the 12 probe-heavy rows (about 100 s above typical) | unknown | Low |
| 4 | Drop the redundant `output` copy in the strict rebuild proof | 5-10 s | Low |
| 5 | Keep a warm Go cache across runs (stop deleting it) | 20 s | Low |
| 6 | Raise `--test-concurrency` above the default 9 | 0-10 s | Low |

1. Incremental regression compiles. Build the healthy output once; for
   each row, `cp -cR output` (0.4 s) into the row directory, apply the
   mutation, and `purs compile` incrementally into it (0.7 s for
   Features.Check.Infer; up to about 5.6 s for a mutation low in the
   graph). Estimated row cost drops from about 7 s to 1.5-2.5 s for most
   rows, so 142 rows go from 18 min to roughly 6-10 min. Needs: a change
   to `scripts/regression.mjs`; a check that a row's compiled output is
   byte-identical to a from-scratch compile of the mutant (so a stale
   output cannot hide a defect, which is the main risk: AGENTS.md
   requires the proofs to stay honest); keep the probes unchanged. Only
   `Features.Check.Infer` was measured, so the estimate is unproven.
2. Concurrent rows. Needs per-worker `base` directories (the `rmSync` of
   `.build/regression` must go), a worker pool of 3 to 4, and the shared
   `.build/go-cache` (Go's cache is safe for concurrent use). Because
   purs already uses about 3.8 cores, expect 1.5x at best on its own;
   it stacks with proposal 1 only for the probe time. The timing-sensitive
   rows (the `*-linear`, `*-timing` ones) must stay out of the pool or
   run last, alone; that is a review judgement I have not tested.
3. The twelve slow rows spend about 100 s in probes. Not investigated
   further; a profile of one (fx008-f2) is the next step.
4. `strict-rebuild.mjs` copies `output` and then builds twice; it takes
   16.5 s. A saving here is small and I have not tried it.
5. Deleting `.build/go-cache` after a run is the user's hygiene rule
   (disk); the measured cold penalty is 23 s for both test phases, so
   keeping it is not worth the disk.
6. The parallel phase used about 6.8 of 9 slots on average; the tail is
   a few 8 to 11 s tests. A higher setting would contend with Go builds;
   unmeasured and probably not worth it.

Not recommended: sharding slow test files (the longest is 35 s of a
76 s phase); loosening or skipping any proof or timing bound (AGENTS.md).

## Unmeasured

- The full unmodified `scripts/regression.mjs` run (only per-row sums).
- Any proposed change; all savings above are estimates from the component
  timings.
- Why the task description quotes 25-30 min against 21.5 min here.

## Incremental-compilation experiment (2026-10-17)

User-approved isolated experiment; nothing tracked changed. Raw results,
the variant runner and the report are in .build/t013/results/
(git-ignored). Built from `git archive main` at 106ce60, idle 10-core
host, GOTOOLCHAIN=go1.26.4.

- **Baseline:** one plain `purs compile`, 6.0 s. scripts/build.mjs
  (spago) cannot serve: its output carries source maps and corefn, so
  its index.js differs byte-wise from a plain compile.
- **Per row:** an APFS clone (`cp -cR`) of the baseline output and
  .spago, no hard links; the row's edits; purs with relative globs from
  the row directory; the unchanged healthy and mutant probes.
- **Equivalence, all 142 rows:** the mutant compiled incrementally
  against the same mutant compiled clean, 1,099 files per row (523
  modules' index.js and externs.cbor, foreign.js): 0 byte differences,
  0 file-set differences, 0 compile failures. Only exclusion:
  cache-db.json (source mtimes and hashes, build state not output).
  Each mutant changed 1-2 files against the baseline. **Limit:** in
  every row only the mutated module's own output changed; no row
  exercised propagation to dependents' externs (a low-level change such
  as one to Domain.Syntax.Core).
- **Measured complete runs** (not sums of phases):

| Run | Wall time | Outcome |
|---|---|---|
| `node scripts/regression.mjs`, unmodified | 1,039.5 s (17:19) | 142/142 |
| Incremental variant (clone, edit, compile, both probes) | 440.2 s (7:20) | 142/142, same outcome per row |
| `npm run verify`, clean copy, cold Go cache | 1,320.5 s (22:00) | exit 0 |

  The incremental variant saves about 600 s (58%) of the regression
  phase, about 45% of a full verify. Peak disk about 8 GB; the current
  script leaves 5.9 GB of per-row outputs until .build/regression is
  deleted.
- **A production change would need:** a plain-purs baseline step; per-row
  clones with a `cp -c` fallback; per-row cleanup; and, before relying on
  it, an equivalence check that includes at least one mutation low in
  the module graph (dependents' externs change), ideally kept as a
  standing check. Worker parallelism and strict-rebuild stay deferred.
