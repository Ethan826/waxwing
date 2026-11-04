# Paired performance measurement: the protocol (2026-11-04)

Status: protocol fixed before any run; nothing has been measured. The
run is authorized once by dossier §18.159 criterion 6: "one `npm run
perf`, with every result preserved and no retries or bound changes;
and paired read-back/trace and validator measurements, peak memory
included, with the protocol fixed before running. Budgets are to be
proposed from those results; no budget is approved." This document
covers the paired measurements only. The `npm run perf` run is
separate: it is not run by these scripts, must not run at the same
time as them, and its result is reported apart.

It answers BACKLOG R035 (collection +22% compile and +35% recheck CPU;
the online read-back about +80% CPU on the shadow test; all noisy, a
size of neither regression nor acceptable cost) and feeds criterion 6
of the activation gate (docs/plans/2026-11-03-a2-activation-gate.md).

## 1. Files

- scripts/r0-t2-perf-run.mjs: the driver, run once.
- scripts/r0-t2-perf-worker.mjs: one sample in a fresh node process.
- scripts/r0-t2-perf-stats.mjs: schedule, statistics, file shape (pure).
- scripts/r0-t2-perf-conditions.mjs: conditions per sample (injected).
- test/r0-t2-perf.test.mjs: the pure parts, fixture-level.

Command, after `npm run build` on a clean commit:

```text
node scripts/r0-t2-perf-run.mjs <scratch dir outside the worktree>
```

## 2. What is measured

Four comparisons. Each has a `without` arm and a `with` arm:

| Comparison | Part | Without | With | Inputs |
|---|---|---|---|---|
| traceCompile | readBack | `compile`, no-collection build | `compile`, output/ | corpus loader sources |
| traceRecheck | readBack | `recheck`, no-collection build | `recheck`, output/ | corpus loader sources |
| onlineReadBack | readBack | `recheck` alone | `recheck`, `readBack`, `readEffects` | effect pin sources |
| validator | validator | `certify` on each honest package's σ | `validate` on each honest package | effect pin sources |

- traceCompile: `compile` on every corpus loader source
  (test/r0-corpus.mjs), as R035's +22% was taken.
- traceRecheck: `recheck` on every declaration of every resolving
  program of the same sources.
- onlineReadBack: per declaration of the effect pin's sources, what
  Online.searched and Online.packaged run: `recheck`; on acceptance
  `readBack`; on its success `readEffects` over the final mark store
  and finished trace. Both arms load output/ (collection on), so the
  difference is the read-back alone.
- validator: every honest package (a candidate whose package reads and
  is not `Malformed`, as test/r0-t2-honest-report.mjs reads it):
  `certify(problem)(σ)` against `validate(problem)(package)`. This is
  the brief's "`validate` on the corpus's honest packages against
  `certify` alone".

Inputs. The effect pin's sources (test/r0-effects-pin-run.mjs
`sourcesOf`, RT8's sources and the window's defect probes) hold both
denominators: 2832 candidates, of which the corpus loader's origins
hold 2823 (test/fixtures/r0/t2-honest.json, §18.157). Every validator
sample's counts are checked against both pinned figures; a mismatch
leaves that comparison without a figure. The trace comparisons use the
corpus loader's sources only, because the effect pin's loader imports
output/ at load time and would put a second compiler in the baseline
process's memory.

## 3. How "with" and "without" are built

Each arm is a constructed implementation, `{ prepare, run }`, in
scripts/r0-t2-perf-worker.mjs. The harness `measure` times `run` over
what `prepare` built. It never branches on which arm it holds. The arm
name is looked up once, at the worker's composition root.

- Trace arms differ only in the build loaded. Without: the disposable
  no-collection baseline (scripts/r0-t2-trace-removal.mjs), built under
  the scratch directory. It refuses to run if the baseline still
  collects (every raw and finished trace count over the corpus must be
  zero), and the driver removes the baseline afterward. With: this
  worktree's output/.
- Online and validator arms load the same build and differ only in the
  step run on each item: `recheck` alone or the online path; `certify`
  or `validate`. `prepare` builds the same items for both arms.

## 4. Pairing, order and count

- One sample is one fresh node process running one arm once (module
  load and JIT warm-up included, the same for both arms).
- Order: rounds outermost; in each round the four comparisons in the
  table's order; in each comparison the two arms, counterbalanced
  (the controller's ruling, 2026-11-04): in an even round `without`
  runs first, in an odd round `with`. The pair is the two adjacent
  samples of one round.
- The split: round 0, the warm-up, runs `without` first. Of the 12
  measured rounds (1 to 12), the six odd ones run `with` first and the
  six even ones `without` first, in every comparison. The split is
  6 to 6: N = 12 (the controller's ruling) makes it exact.
- Warm-ups: round 0 (one pair per comparison) is discarded from the
  statistics and kept in the raw log and the file.
- N = 12 measured pairs per comparison, rounds 1 to 12. In all, 13
  rounds × 4 comparisons × 2 arms = 104 samples.
- No retries. A sample that exits non-zero, prints a malformed line or
  exceeds the termination safeguard (600 s, perf.mjs `fileTimeoutMs`;
  not a budget) is recorded as failed with its reason, and the run goes
  on. A comparison with any failed sample, fewer than 12 measured pairs
  or a failed count check has no figure. Its `measured` is null, which
  the gate reads as unmet. The driver exits 1. Another attempt is a new
  authorized run, and the failed one stays on record.

## 5. Metrics

Per sample, around `run` only:

- wall time: `process.hrtime.bigint()`;
- CPU user + sys: `process.cpuUsage()` difference, user and system
  also kept apart;
- peak RSS: `process.resourceUsage().maxRSS` at the end, in MiB. This
  is the whole process's peak, including module load and `prepare`.
  For the online and validator comparisons, `prepare` is identical
  across arms, so the paired MiB difference shows the arm's own share.

## 6. Statistics

- Per comparison and metric, over the 12 pairs: the paired ratio
  (with ÷ without) and the paired difference (with − without), each as
  median, Tukey hinges (q1, q3) and min/max; each arm's own values in
  the same form. Median: the mean of the two middle values (N is even).
- The gate's figure for a part: `compileTime.measured` is the largest
  median paired CPU ratio over the part's comparisons; `peakMemory`
  likewise for maxRSS. readBack takes three comparisons and validator
  one. Unit: a ratio, so a budget is a ratio too.
- No significance test or confidence interval is claimed: one machine,
  one run, N = 12. The spread is reported, not interpreted.

## 7. Conditions

Recorded before every sample and never gated; the author keeps using
the machine (§18.159):

- load average (1, 5, 15 minutes), `os.loadavg`;
- the five busiest processes by CPU, `ps -A -r -o pid=,pcpu=,rss=,comm=`;
- memory free percentage, `sysctl -n kern.memorystatus_level`;
- pressure level (normal, warn, critical),
  `sysctl -n kern.memorystatus_vm_pressure_level`;
- swap use, `sysctl -n vm.swapusage`.

`memory_pressure` is not used: by default it allocates memory. A failed
command is recorded as `unavailable (<reason>)` and the sample still
runs. At the start and end the driver records verify's conditions line
(commit with `-dirty`, time, load, power, untracked files), plus the
node version, core count and CPU model.

## 8. Outputs

- Raw log: .build/evidence/r0-t2-perf-<time>/samples.jsonl, appended
  as each sample ends, with its conditions, the raw command output,
  stdout and stderr; then measurement.json, a copy of the file below.
- Measurement file: test/fixtures/r0/t2-performance.json (or `--out`),
  never overwritten. It holds `conditions` (one string: start line,
  load and memory ranges, pressure levels seen, end line), `readBack`
  and `validator`, each with `compileTime` and `peakMemory` (`measured`,
  `unit`, `statistic`) and every comparison's statistics, and every
  sample, warm-ups included. It names no budget. The gate ignores one
  in this file anyway.
- The controller commits the file and sets `performance.measurement`
  in test/fixtures/r0/t2-activation-gate.json. Criterion 6 stays unmet
  until the author approves a budget.

## 9. Expected cost

The estimate comes from Task 7's report (load 7-11: compile 5.4-6.3 s
and recheck 2.2-3.0 s per corpus pass) plus guesses for what has never
been timed alone: about 8 s for a compile sample, 5 s for a recheck
sample, 8-11 s for an online sample and about 12 s for a validator
sample (whose `prepare` runs the whole online path). That makes about
70 s per round and 15 minutes for 13 rounds. Add 1-3 minutes for the
baseline build (purs on the edited modules; compileTree's limit is
180 s) and its corpus check. Expected: 16-22 minutes on a lightly
loaded machine, up to about 38 minutes under the load seen in Tasks 7
and 12. These are estimates; the run records the real times.

## 10. Threats to validity

- Shared machine. Adjacent pairing cancels slow drift. A burst of load
  during one arm does not cancel, and it widens the spread. The
  conditions show when a burst happened; no sample is dropped for it.
- Order. Counterbalancing spreads the first-runner's advantage or
  penalty (file cache, thermal state, scheduler history) over both
  arms, evenly: each arm runs first in 6 of the 12 measured pairs.
  Carry-over from the previous comparison's last sample remains. Each
  sample's side and round are kept, so an order effect can be examined
  afterward; it is not corrected for.
- Heterogeneous cores and frequency. On Apple silicon a process may
  run on efficiency or performance cores, and a laptop may throttle.
  Either can affect one arm of a pair more than the other. Neither is
  controlled or recorded.
- Memory pressure. At writing (with another performance run going),
  the host reported pressure level `warn`, 31% free and 15,867 of
  16,384 MiB of swap in use. Under pressure,
  maxRSS reflects what the kernel lets the process keep resident, not
  only what it allocates, and timings include paging.
- Peak RSS includes module load and `prepare`, which dilutes the ratio
  for the online and validator comparisons. The paired MiB difference
  is reported for this. GC timing makes maxRSS vary between runs.
- Cold processes. Each sample includes JIT warm-up, like one compiler
  invocation. Steady-state cost in a long-lived process is not
  measured.
- Fidelity of onlineReadBack. It composes the exported functions
  Online.searched and Online.packaged call. It does not call
  `onlineSearch`, whose `declaration` regeneration is no part of the
  read-back. Nothing on the compile path runs the read-back until
  activation (Task 16 held), so this is the step's cost, not a compile
  after activation.
- Validator against certify. `certify` is cheap, so the ratio can be
  large while the difference is small. Both are reported.
- The baseline is a textual edit (scripts/r0-t2-trace-removal.mjs).
  Each edit must match exactly once and the baseline must collect
  nothing, but it also drops `finish` and the second `numbering`. That
  is part of collection's cost as defined there.
- Inputs. The corpus is the project's pinned corpus. It does not stand
  for user programs. One run, one machine and one node version.
- Stale build. The driver does not build. A stale output/ would measure
  another compiler. The start line's commit and `-dirty` mark are
  recorded, but nothing checks output/ against them.
- Not measured: Go generation; the type read-back and the effect
  read-back separately; the trace's own heap size; end-to-end compile
  after activation.

## 11. How budgets will be proposed (proposal, not approval)

From the recorded file, for each part and metric:

1. Ceiling: the largest upper hinge (q3) of the part's paired ratios,
   rounded up to the next 0.05. Today's code meets it, so it measures
   only that cost does not grow. The proposal states it with each
   comparison's median difference in ms and MiB.
2. If the author finds a ceiling too high, the alternative is R035's
   next action: reduce cost (for example, read back only the chosen
   candidate), then measure again with this protocol and a new run.

The author approves a budget, if at all, in a dossier section after
§18.157 that names R035. The controller writes `performance.ruling`
and `performance.budget` in the gate status. Nothing in these scripts
writes a budget.

## 12. What remains unrun

The measurement, the baseline build and verify have not run.
test/r0-t2-perf.test.mjs has run alone (`node --test`); it joins
verify's parallel phase.
