# Perf attribution: the protocol (2026-11-04)

Status: protocol fixed before any run; nothing has been measured, no
other commit has been built. The controller runs it alone. Revised once
before any run on the controller's review (C1, I1-I5, minors 1-9).

Authority, dossier §18.161 (performance paragraph), verbatim: "The two
failed perf files remain failed qualification evidence. Before
activation, attribute their failures sufficiently to distinguish
existing shared-load sensitivity from added compiler cost. Do not
require an idle computer, retry for green or change bounds."

The failures (one `npm run perf` at 354ce6e; r0-t2-d1
.build/evidence/2026-11-04-perf/summary.md): test/fn-linear-timing
.perf.test.mjs, value 1359/1200, over 2331/1620, partialFirst 1155/930,
parenthesized 1276/1110 ms (bounds 3 × measuredMs); test/fn-scale
.perf.test.mjs, the 5,000-parameter generics phases 1900/1650. They
stay failed. This is attribution, not qualification: it changes no
bound, retries nothing and calls nothing passing. No load is induced
on the author's machine (controller's ruling I5).

## 1. Files and command

scripts/r0-t2-attr-run.mjs (driver), r0-t2-attr-builds.mjs (arms,
inputs, digest check), r0-t2-attr-worker.mjs (one sample),
r0-t2-attr-plan.mjs (arms, workloads, schedule, worker line; pure),
r0-t2-attr-stats.mjs and r0-t2-attr-file.mjs (statistics, attribution,
file; pure); test/r0-t2-attr.test.mjs, test/r0-t2-attr-run.test.mjs and
test/r0-t2-attr-samples.mjs. It reuses the paired protocol's
conditions recorder (r0-t2-perf-conditions.mjs), clean-tree rule and
src digest (r0-t2-perf-builds.mjs), `spread` and `median`
(r0-t2-perf-stats.mjs), the trace removal edits
(r0-t2-trace-removal.mjs) and plain-purs compile (regression-clone.mjs).

```text
node scripts/r0-t2-attr-run.mjs <scratch dir outside the worktree> \
  --lock <the verify lock directory the caller holds>
```

The driver refuses to start unless the lock directory exists and no
process matches the anchored pattern `^([^ ]*/)?node scripts/(verify|
perf|regression|r0-t2-perf-run|r0-t2-attr-run)\.mjs` (`pgrep -f`, its
own pid excluded), and on any tracked change or untracked file under
src/, test/ or scripts/.

## 2. Arms

| Arm | src | Role |
|---|---|---|
| pre | `git archive 823f628 src` | the existing compiler |
| failed | `git archive 354ce6e src` | the failed run's compiler |
| head | `git archive HEAD src` | the activation candidate |
| uncollected | head with the trace removal edits | trace share |

- pre is 823f6283 ("docs: Stage B authorized with rulings; executable
  tasks (§18.155)"). It is docs-only and its src equals 6c563e1a's, the
  last src change before it; its first descendant e2352091 (tranche 2
  Task 5, hole numbering) is the first commit to change src under
  tranche 2, and d55253dd (Task 6) adds the trace. So pre is the newest
  compiler with none of tranche 2 or the prerequisites batch. Taking
  d55253dd's parent instead would count Task 5 and A2 check 6 as
  existing cost. 823f628..9ed83f1b changes no file under
  src/Features/Specialize*, Format/, Features/Resolve* or Program/: the
  added cost, if any, is in Check and Domain.
- failed is 354ce6e1, where T was measured; the verdict's ratio is
  failed/pre (ruling I1). head (the driver's own HEAD; its src digest
  must equal the clean worktree's) and uncollected are reported beside
  it: head/pre, head/failed (the prerequisites batch), head/uncollected
  (the trace), uncollected/pre.
- uncollected: each removal edit must match once; over the pinned
  corpus it must collect nothing, and head must collect something.
- Built the same way: src from git (never a working tree), this
  worktree's .spago linked (spago.yaml and spago.lock checked equal at
  all three commits), a cold plain-purs compile into an empty output/
  (180 s limit each). Ancestry pre, failed, head is checked. Before any
  sample, each fn-scale source is compiled once per arm (a worker
  process) and the Go text's sha256 must agree in all four, or the run
  stops. Commits, src tree hashes, digests and the probe's digests go in
  the header; the builds are removed after.

## 3. Workloads, in the tests' context (ruling C1)

The tests time warm: one process runs the eight linear forms in order,
and fn-scale's generics phase is fourth after three compiles; "a
single cold compile costs about 1.4× the steady-state sum of its
phases" and "Measure a timing test's workload as the test runs it, in a
fresh process" (docs/findings.md). So one sample is one fresh node
process that runs one test file's workloads in that file's order, each
bracketed as its test brackets it:

| File | Workloads, in order | Bracket |
|---|---|---|
| linear | value, over, lambda, mismatch, partialFirst, partialAll, parenthesized, pipe (20,000 params) | `throughSpecialize` whole, Parse to Specialize and `wire(...)` for the code |
| scale | mixed (5,000), chain (1,000), curried (1,000), generic (5,000) | `compile` alone |

Bounds and the failed run's times (ms): value 1200/1359, over
1620/2331, lambda 1545/1336, mismatch 525/335, partialFirst 930/1155,
partialAll 675/598, parenthesized 1110/1276, pipe 750/621; mixed
3750/1709, chain 225/140, curried 225/123, generic 1650/1900. Those
within their bounds are controls. The unit test checks bounds, order
and titles against the test files' text, and the sources against the
tests' modules.

- The compiler's modules load once before the first bracket, as the
  tests import them first. Sources are generated by the driver, outside
  every bracket, as the tests build them before starting the clock.
- mismatch: the bracket includes `wire(...)` for its E_TYPE code, as
  `throughSpecialize` does; the accepted forms skip it.
- fn-scale: the test writes the Go file and runs `go build` between
  phases; here no go build runs (it is not compiler cost and passed);
  the gap is shorter and no child process runs between phases.
- No separate cold single-workload samples are taken (C1 allowed them as
  secondary data; left out to keep the run short).

## 4. Schedule and count

- Round 0 is a warm-up (kept, out of the statistics); rounds 1-12 are
  measured, fixed now.
- Within a round: the linear file, then the scale file; for each, the
  four arms adjacently, in row (round − 1) mod 4 of a Williams square
  (Williams 1949; warm-up: row 0, pre, failed, uncollected, head). Each
  row runs 3 times; each arm holds each position 3 times; of any two
  arms each runs first in 6 rounds; each ordered adjacent pair occurs 3
  times (first-order carry-over balanced).
- 13 × 2 × 4 = 104 samples. Every one is kept and none is rerun. A
  failed, malformed or timed-out sample (600 s, perf.mjs
  `fileTimeoutMs`) is listed under every workload of its file.
- Minimum, fixed now (minor 4): a workload's verdict uses the measured
  rounds in which both failed and pre succeeded; it needs at least 9 of
  12 such pairs, else `unmeasured`. Other ratios use their own pairs,
  each with its n. A failure in head or uncollected never voids the
  verdict. Any wrong outcome code or differing Go output in any arm
  voids it. The driver exits 1 if any workload is unmeasured.

## 5. Metrics and conditions

Per bracket: wall time (`process.hrtime.bigint`, the tests'
quantity), process CPU (`cpuUsage`), main-thread CPU
(`threadCpuUsage`), off-CPU time (wall − main-thread CPU), involuntary
and voluntary context switches (`resourceUsage`); per process, peak RSS
and the load average after. The outcome code per linear form; the Go
text's sha256 per scale phase (taken after the bracket). Before each
sample, the paired protocol's conditions (§7 there): load averages,
five busiest processes, memory free %, pressure level, swap, power,
thermal notes. Recorded, never gated.

## 6. Statistics, fixed in advance

Per workload (Tukey hinges and extremes; no significance test or
interval claimed):

- Ratios, each paired by round: added = failed/pre (the verdict's);
  head/pre; head/failed; head/uncollected; uncollected/pre; for wall,
  process CPU and main-thread CPU, each with its n.
- Load sensitivity, per arm: wall against the covariate, the one-minute
  load average read just before the sample's process started.
  Theil-Sen slope (Theil 1950; Sen 1968) with intercept median(y −
  slope·x), the slope over the arm's median, Kendall's tau-b (Kendall
  1945); tau-b of off-CPU time against load; the loads sampled.
- The added ratio against load: per verdict pair, failed/pre against
  the mean of that pair's two loads: Theil-Sen fit, tau-b, the loads.
- Low-load reference L: the median pre wall time over the third of the
  pre units (4 of 12) with the lowest load, in the tests' context.

## 7. Attribution, per workload (a formula, not a judgment)

T is the failed run's time, B its bound, M = B / 3, r the median of
failed/pre with hinges q1 and q3. The two loads 4.52 and 6.23 bracket
the whole failed `npm run perf` (before its first file, after its
last); no per-file load was recorded (minor 1).

- Pre-equivalent time T / r (range T / q3 to T / q1): the existing
  compiler's estimated time under the failed run's conditions, assuming
  r carries over to them and taking T, a single sample, as given.
- Added axis: `passed` if T ≤ B (controls). Else `addedNotNecessary`
  if T / q3 > B, `addedNecessary` if T / q1 ≤ B, else `undetermined`.
- Downgrade (rulings I3 and N1, fixed now): `addedNotNecessary` or
  `addedNecessary` becomes `undetermined` when |tau-b| of the added
  ratio against load exceeds 0.45 (about the tabled two-sided 5%
  critical value of Kendall's tau at n = 12; a screen, not a test).
  It also becomes `undetermined` when, at 4.52 or at 6.23, a load
  lying within the verdict pairs' sampled mean loads, the ratio's
  Theil-Sen fit there would flip it: `addedNotNecessary` when T /
  fitted ≤ B, `addedNecessary` when T / fitted > B. At a load outside
  that range the fitted ratio is reported as extrapolated and the
  verdict is left alone. The reasons and the fitted ratios, with their
  places, are recorded.
- Existing axis (ruling I2): `existingOverBound` if L > B (the existing
  compiler, at the lowest loads sampled and in the tests' context, is
  over the bound already); else `loadOrUnreproducedNeeded` (load, or
  something not reproduced here, is needed to exceed it).
- Overrun split (ruling I4), when T > B: T / B = r × T / (r · B);
  added's share log r / log(T / B) and the remainder's, labelled
  "existing + load + unreproduced", summing to 1. A share can fall
  outside [0, 1] (r < 1, or r > T / B).
- Supporting data: T / M = (L / M) × r × T / (r · L).
- Load half (ruling I5): correlational, conditional on the loads
  sampled, whose range is reported. The pre arm's fit at 4.52 and 6.23
  over its fit at L's load is reported, and each of the two loads is
  marked below, within or above the range sampled, for the pre arm's
  loads and for the verdict pairs' mean loads. Not used in the verdicts.

Prior evidence, cited not re-measured: compilers before tranche 2
already failed these bounds under load: `over` 2357/1620 at b107049
(§18.110), `partialFirst` 969/930 alone at b107049 (§18.113), 950/930
at dde534a (§18.129), 942/930 (docs/findings.md). All are ancestors of
823f628.

## 8. Outputs

Each run writes a new .build/evidence/r0-t2-attr-<time>/: an earlier
run stays reported and is never replaced. samples.jsonl (one line per
sample with conditions, raw command output, stdout, stderr), then
attribution.json (header: commits, builds, digests, trace counts, lock,
node and purs versions, start and end conditions lines, driver peak
RSS; each workload's statistics, failures and attribution; every
sample), or failure.json with the stage. Nothing is written under
test/fixtures; the controller decides what to commit.

## 9. Expected cost

Builds and checks: four cold purs builds, about 10-40 s each (a full
compile took 5.7 s idle at 523 modules on 2026-10-17; 180 s limit), two
corpus trace runs (5-15 s each) and four digest probes (about 5 s each):
2-4 minutes. Samples: under the failed run's load its linear times sum
to about 9.0 s and its scale phases to 3.9 s; with about 0.7 s per
process for start and module load and 0.2 s for conditions, about 15 s
per arm and round, 60 s per round, 13 minutes for 13 rounds. Expected
about 11-15 minutes when lightly loaded, about 17 under the failed
run's load, 25 as a generous ceiling.

## 10. Threats to validity

- Transfer. The verdict assumes failed/pre measured here holds at the
  failed run's conditions. The fit screen acts only where 4.52 or 6.23
  lies within the loads sampled; outside it only tau-b screens, so a
  load dependence that shows only beyond the sampled range is missed.
  With no load dependence (a simulation of 12 pairs, ratio 1.15 ± 0.02
  or 0.04), the tau screen downgrades about 4-5% of verdicts by itself
  and the fit screen under 1%.
- One failed observation. T is a single sample with unknown noise.
- Context. Each file's process matches its test's order and brackets,
  but not the node test runner, the perf runner's other files before
  it, or fn-scale's go builds between phases.
- The covariate. load1 lags (an exponentially damped average), counts
  this run's own worker, and sees neither core placement (Apple silicon
  performance or efficiency cores) nor frequency; off-CPU time, context
  switches, power and thermal notes are reported beside it. The failed
  run's two loads bracket the whole perf run, not the two files.
- Correlational load half. Load is observed, not controlled; a range
  never sampled leaves the load half extrapolated and flagged.
- Pre's boundary. Anything that slowed the compiler before 823f628
  counts as existing, as do the machine and context differences from
  the 2026-10-09 measurement; `existing` does not separate them.
- Order. Williams rows balance position and first-order carry-over;
  the fixed file order (linear, then scale) remains.
- Memory pressure and swap inflate wall time by paging; recorded per
  sample, not controlled. The driver keeps the two trace-checked
  compilers and the corpus in memory while workers run; its peak RSS is
  recorded.
- Builds are plain purs (no source maps), as the paired protocol's;
  `npm run perf` loads output/ from `npm run build`. Equal across arms.
- The uncollected arm also drops `finish` and the second `numbering`,
  part of collection's cost as the removal edits define it.
- Linear workloads compare outcome codes only; scale workloads the Go
  text. Twelve rounds on one machine; no interval is claimed.

## 11. What remains unrun

The measurement, the four builds, `npm run perf` and verify have not
run. test/r0-t2-attr.test.mjs and test/r0-t2-attr-run.test.mjs have run
alone (`node --test`).
