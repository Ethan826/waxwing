# Paired performance measurement: the protocol (2026-11-04)

Status: protocol fixed before any run; nothing has been measured. The
run is authorized once by dossier §18.159 criterion 6: "one `npm run
perf`, with every result preserved and no retries or bound changes;
and paired read-back/trace and validator measurements, peak memory
included, with the protocol fixed before running. Budgets are to be
proposed from those results; no budget is approved." This covers the
paired measurements only. `npm run perf` is not run by these scripts,
must not run at the same time, and is reported apart. It answers
BACKLOG R035 (collection +22% compile and +35% recheck CPU; the online
read-back about +80% CPU on the shadow test; all noisy) and feeds
criterion 6 of docs/plans/2026-11-03-a2-activation-gate.md.

## 1. Files and command

scripts/r0-t2-perf-run.mjs (the driver), r0-t2-perf-builds.mjs (clean
tree, both builds, the inputs), r0-t2-perf-worker.mjs (one sample),
r0-t2-perf-stats.mjs and r0-t2-perf-file.mjs (schedule, statistics,
file shape; pure), r0-t2-perf-conditions.mjs (conditions, injected
host); test/r0-t2-perf.test.mjs with test/r0-t2-perf-samples.mjs.
After `npm run build`, on a clean tree (the driver refuses any tracked
change and any untracked file under src/, test/ or scripts/;
docs/writing and other untracked files are allowed):

```text
node scripts/r0-t2-perf-run.mjs <scratch dir outside the worktree>
```

## 2. What is measured, on which inputs

| Comparison | Part | Without | With | Inputs |
|---|---|---|---|---|
| traceCompile | readBack | `compile`, no-collection build | `compile`, collecting build | corpus loader sources |
| traceRecheck | readBack | `recheck`, no-collection build | `recheck`, collecting build | corpus loader sources |
| onlineReadBack | readBack | `recheck` alone | `recheck`, `readBack`, `readEffects` | effect pin sources |
| validator | validator | `certify` on each honest package's σ | `validate` on each honest package | effect pin sources |

- traceCompile: `compile` on every corpus loader source, as R035's
  +22% was taken; traceRecheck: `recheck` on every declaration of
  every resolving program of those sources.
- onlineReadBack: per declaration, what Online.searched and
  Online.packaged run: `recheck`; on acceptance `readBack`; on its
  success `readEffects`. Both arms load the collecting build, so the
  difference is the read-back alone.
- validator: every honest package (a candidate whose package reads and
  is not `Malformed`, as test/r0-t2-honest-report.mjs reads it):
  `certify(problem)(σ)` against `validate(problem)(package)`.

The effect pin's sources (test/r0-effects-pin-run.mjs `sourcesOf`)
hold both denominators: 2832 candidates, 2823 from the corpus loader's
origins (test/fixtures/r0/t2-honest.json, §18.157). The validator
samples and onlineReadBack's `with` samples count candidates, checked
against both pinned figures. The driver loads both source sets once
(`loadCorpus`, `sourcesOf`) and writes them as JSON in the scratch
directory. A worker reads that file and imports nothing from test/:
the test loaders import output/ and would put a second compiler in
the measured process.

## 3. How "with" and "without" are built

Each arm is a constructed implementation, `{ prepare, run }`
(scripts/r0-t2-perf-worker.mjs). `measure` times `run` over what
`prepare` built and never branches on the arm; the name is looked up
once, at the worker's composition root. Each comparison entry names
its arms and the build each loads (r0-t2-perf-stats.mjs).

- Both builds are made the same way in the scratch directory: the
  worktree's src and output/ cloned, then compiled by plain purs. The
  collecting build has no edit. The baseline has the removal edits
  (scripts/r0-t2-trace-removal.mjs), and the run stops if it still
  collects (every raw and finished trace count over the corpus zero).
  The driver checks that the collecting build's src digest equals the
  worktree's, and the baseline's equals the worktree's with the edits
  applied; it records the digests and commit and removes both builds
  afterward. Every arm loads a scratch build, never output/.
- Trace arms differ only in the build; online and validator arms only
  in the step run on each item, over items `prepare` builds alike.

## 4. Pairing, order and count

- One sample: one fresh node process running one arm once.
- Order: rounds outermost; the four comparisons in the table's order;
  the two arms counterbalanced (the controller's ruling, 2026-11-04):
  `without` first in an even round, `with` first in an odd one.
- Warm-up: round 0, one pair per comparison (`without` first), kept in
  the record and left out of the statistics.
- N = 12 measured pairs per comparison, rounds 1 to 12: six odd rounds
  run `with` first and six even ones `without` first, exactly 6 to 6.
  In all 13 rounds × 4 comparisons × 2 arms = 104 samples.
- Checks per pair: the builds differ in the trace pairs and are equal
  elsewhere; every count both arms report agrees, except the
  validator's `accepted` (the verdicts differ by design).
- No retries. A sample that exits non-zero, prints a malformed line or
  exceeds the termination safeguard (600 s, perf.mjs `fileTimeoutMs`;
  not a budget) is recorded as failed, and the run goes on. A
  comparison with a failed sample, fewer than 12 pairs or a failed
  check has `measured: null`, which the gate reads as unmet; the driver
  exits 1. A failure of the run itself (dirty tree, inputs, builds) is
  written to failure.json in the evidence directory with its stage and
  message. Another attempt is a new authorized run.

## 5. Metrics

The bracket holds `run` only. Module load and `prepare` lie outside
it and reach only the RSS figures.

- Wall time: `process.hrtime.bigint()` across `run`.
- CPU user + sys: the `process.cpuUsage()` difference across `run`,
  user and system also kept. It is process-wide: GC and JIT threads
  working in that interval count.
- Peak RSS: `process.resourceUsage().maxRSS` at the end, in MiB, the
  whole process's high-water mark; `peakMemory.measured`'s basis (the
  gate's field, meaning unchanged). As a high-water mark it reads near
  1.00 by construction when `run` stays below `prepare`'s peak (likely
  for validator and onlineReadBack). So two more are recorded:
- maxRSS right after `prepare`, and the increment `run` adds to it;
  zero means `run` stayed below `prepare`'s peak: a lower bound;
- heap used (`process.memoryUsage().heapUsed`) before and after `run`,
  and its increment (GC can make it negative).

Which figure a budget binds to is the author's choice.

## 6. Statistics

- Per comparison and metric, over the 12 pairs: the paired ratio (with
  ÷ without) and difference (with − without), each as median, Tukey
  hinges (q1, q3) and min/max, and each arm's own values; increments
  as differences and arms. Median of an even count: the mean of the
  two middle values.
- The part's gate figure: the largest median paired ratio over its
  comparisons, CPU for `compileTime`, maxRSS for `peakMemory`; a ratio,
  so a budget is a ratio. readBack's is the largest of three ratios
  with different denominators (an uncollected compile, an uncollected
  recheck, a recheck alone), so each comparison's own median and q3
  are kept beside it (`figures`). validator has one comparison.
- No significance test or confidence interval is claimed (one machine,
  one run, N = 12). The spread is reported, not interpreted.

## 7. Conditions

Recorded before every sample, never gated (the author keeps using the
machine, §18.159): load average; the five busiest processes (`ps -A -r
-o pid=,pcpu=,rss=,comm=`); memory free percentage (`sysctl -n
kern.memorystatus_level`); pressure level (`sysctl -n
kern.memorystatus_vm_pressure_level`); swap use (`sysctl -n
vm.swapusage`); power source and charge (`pmset -g batt`); thermal
notes and any CPU speed limit (`pmset -g therm`). `memory_pressure` is
not used: by default it allocates. A failed command is recorded as
`unavailable (<reason>)` and the sample still runs. At start and end:
verify's conditions line, its git run at the repository root (commit
with `-dirty`, time, load, power, untracked files). Also the node
version, cores, CPU model, the driver's own peak RSS and the workers'
environment (`NODE_OPTIONS`, `UV_THREADPOOL_SIZE`, all variable names;
other values not kept). Workers get that environment explicitly and a
64 MiB output buffer.

## 8. Outputs

- Raw log: .build/evidence/r0-t2-perf-<time>/samples.jsonl, appended
  per sample with its conditions, raw command output, stdout and
  stderr; then measurement.json (a copy of the file below), or
  failure.json.
- Measurement file: test/fixtures/r0/t2-performance.json (or `--out`),
  written with `flag: 'wx'`, never overwritten. It holds `conditions`
  (one string: start line, load, memory, pressure and power seen, end
  line), `readBack` and `validator` (each `compileTime` and
  `peakMemory` with `measured`, `unit`, `statistic`; `figures`; every
  comparison's statistics), and every sample, warm-ups included. It
  holds no budget; the gate would ignore one there anyway.
- The controller commits it and sets `performance.measurement` in
  test/fixtures/r0/t2-activation-gate.json. Criterion 6 stays unmet
  until the author approves a budget.

## 9. Expected cost

From Task 7's report (load 7-11: compile 5.4-6.3 s and recheck 2.2-3.0
s per corpus pass), plus guesses for what was never timed alone: about
8 s per compile sample, 5 s per recheck sample, 8-11 s per online
sample and 12 s per validator sample (its `prepare` runs the whole
online path). About 70 s per round, 15 minutes for 13 rounds. Add 2-5
minutes for the two builds (compileTree's limit is 180 s each), the
baseline's corpus check and the inputs. Expected: 17-25 minutes when
lightly loaded, up to about 40 under the load seen in Tasks 7 and 12.

## 10. Threats to validity

- Shared machine. Adjacent pairing cancels slow drift, not a burst
  during one arm, which widens the spread. No sample is dropped.
- Order. Each arm runs first in 6 of the 12 measured pairs, which
  spreads the first-runner effect (file cache, thermal state,
  scheduler) evenly. Carry-over from the previous comparison's last
  sample remains. Side and round are kept; nothing corrects for order.
- Cores and frequency. On Apple silicon a process may land on
  efficiency or performance cores, and a laptop may throttle. Power and
  pmset's thermal notes are recorded; core placement is not.
- Memory pressure. At writing (another performance run going) the host
  reported pressure `warn`, 31% free, 15,867 of 16,384 MiB swap used.
  Under pressure maxRSS reflects what the kernel lets stay resident,
  and timings include paging.
- maxRSS is a high-water mark including module load and `prepare`, so
  `peakMemory` can read about 1.00 for a light `run`. The increments
  are reported and are lower bounds. GC timing makes maxRSS and heap
  use vary.
- The driver keeps the inputs, the test loaders' compiler (worktree
  output/) and the baseline's collection check in its own memory while
  workers run: system pressure, not a worker's maxRSS. Its peak RSS is
  recorded.
- Cold processes: each sample includes JIT warm-up, as one compiler
  invocation does. Steady state is not measured.
- onlineReadBack composes the calls Online.searched and Online.packaged
  make, without `onlineSearch`'s `declaration` regeneration. The
  compile path runs no read-back until activation (Task 16 held), so
  this is the step's cost, not a compile after activation.
- `certify` is cheap, so the validator ratio can be large while the
  difference is small. Both are reported.
- The baseline is a textual edit; each edit must match once and the
  baseline must collect nothing, but it also drops `finish` and the
  second `numbering`, part of collection's cost as defined there.
- One pinned corpus, one machine, one node version; not user programs.
- Both builds compile from the clean worktree's src, so a stale
  output/ is recompiled, not measured; output/ must exist for the
  driver's input loading.
- Not measured: Go generation; type and effect read-back separately;
  the trace's own heap size; compile end to end after activation.

## 11. How budgets will be proposed (proposal, not approval)

For each part and metric, from the recorded file:

1. Ceiling: the largest q3 of the part's paired ratios, rounded up:
   ceil(x / 0.05) × 0.05, an x within 1e-9 of a multiple counting as
   it (`ceilingOf`). Today's code meets it, so it guards only against
   growth. The proposal lists each comparison's own median and q3
   (readBack's three have different denominators), its median
   difference in ms and MiB, and the memory increments, so the author
   can choose what a budget binds to.
2. If a ceiling is too high, R035's next action: reduce cost (for
   example, read back only the chosen candidate), then a new run under
   this protocol.

The author approves a budget, if at all, in a dossier section after
§18.157 that names R035; the controller writes `performance.ruling` and
`performance.budget` in the gate status. These scripts write no budget.

## 12. What remains unrun

The measurement, the builds and verify have not run.
test/r0-t2-perf.test.mjs has run alone (`node --test`).
