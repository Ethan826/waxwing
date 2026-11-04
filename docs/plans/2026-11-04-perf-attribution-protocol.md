# Perf attribution: the protocol (2026-11-04)

Status: protocol fixed before any run; nothing has been measured, no
other commit has been built. The controller runs it alone.

Authority, dossier §18.161 (performance paragraph), verbatim: "The two
failed perf files remain failed qualification evidence. Before
activation, attribute their failures sufficiently to distinguish
existing shared-load sensitivity from added compiler cost. Do not
require an idle computer, retry for green or change bounds."

The failures (one `npm run perf` at 354ce6e, load 4.52 before and 6.23
after; r0-t2-d1 .build/evidence/2026-11-04-perf/summary.md):
test/fn-linear-timing.perf.test.mjs, value 1359/1200, over 2331/1620,
partialFirst 1155/930, parenthesized 1276/1110 ms (bounds 3 ×
measuredMs); test/fn-scale.perf.test.mjs, the 5,000-parameter generics
phases 1900/1650. They stay failed. This protocol changes no bound,
retries nothing and calls nothing passing.

## 1. Files and command

scripts/r0-t2-attr-run.mjs (driver), r0-t2-attr-builds.mjs (arms and
inputs), r0-t2-attr-worker.mjs (one sample), r0-t2-attr-plan.mjs
(arms, workloads, schedule, worker line; pure), r0-t2-attr-stats.mjs
and r0-t2-attr-file.mjs (statistics, attribution, file; pure);
test/r0-t2-attr.test.mjs with test/r0-t2-attr-samples.mjs. It reuses
the paired protocol's conditions recorder (r0-t2-perf-conditions.mjs),
clean-tree rule and src digest (r0-t2-perf-builds.mjs), `spread` and
`median` (r0-t2-perf-stats.mjs), the trace removal edits
(r0-t2-trace-removal.mjs) and plain-purs compile (regression-clone.mjs).
On a clean tree, under the verify lock, with no other perf, verify or
measurement running:

```text
node scripts/r0-t2-attr-run.mjs <scratch dir outside the worktree>
```

## 2. Arms

| Arm | src | Edit |
|---|---|---|
| pre | `git archive 823f628 src` | none |
| head | `git archive HEAD src` (the clean measured commit) | none |
| uncollected | as head | the trace removal edits |

- pre is 823f6283 ("docs: Stage B authorized with rulings; executable
  tasks (§18.155)"). Why: it is docs-only and its src equals 6c563e1a's,
  the last src change before it; its first descendant e2352091 (tranche
  2 Task 5, hole numbering) is the first commit to change src under
  tranche 2, and d55253dd (Task 6) adds the trace. So pre is the newest
  compiler with none of tranche 2 or the prerequisites batch. Choosing
  d55253dd's parent instead would count Task 5 and A2 check 6 as
  existing cost. 823f628..9ed83f1b changes no file under
  src/Features/Specialize*, Format/, Features/Resolve* or Program/:
  the added cost, if any, is in Check.
- head: the driver's own HEAD; expected to be r0-t2-d1's integrated
  head (9ed83f1b plus commits that change no src). Its src digest must
  equal the clean worktree's.
- uncollected: optional arm (iii), the paired protocol's baseline: head
  with collection removed (each edit must match once; over the pinned
  corpus it must collect nothing, and head must collect something).
- Built the same way: each arm's src from git (never a working tree),
  this worktree's .spago linked (spago.yaml and spago.lock checked
  equal at 823f628 and head), a cold plain-purs compile into an empty
  output/ (180 s limit each). The driver records each arm's commit, src
  tree hash and src digest, and removes the builds after.

## 3. Workloads

The tests' own sources (test/fn-linear-sources.mjs; fn-scale-mixed.mjs;
fn-scale-programs.mjs), written once to JSON; a worker imports nothing
from test/.

| Workload | Timed call | Bound (ms) | Failed run (ms) |
|---|---|---|---|
| linear value | Parse → Specialize, 20,000 params | 1200 | 1359 |
| linear over | same | 1620 | 2331 |
| linear lambda | same | 1545 | 1336 |
| linear mismatch | same (E_TYPE expected) | 525 | 335 |
| linear partialFirst | same | 930 | 1155 |
| linear partialAll | same | 675 | 598 |
| linear parenthesized | same | 1110 | 1276 |
| linear pipe | same | 750 | 621 |
| scale mixed | `compile`, 5,000-param value | 3750 | 1709 |
| scale generic | `compile`, 5,000-param generics | 1650 | 1900 |

The four forms and one phase that passed are controls. The unit test
checks the bounds against the two test files' text. Go builds are not
timed (they passed and are not compiler cost).

## 4. Schedule and count

- One sample: one fresh node process, one workload, once, in one arm.
- Round 0 is a warm-up (kept, left out of the statistics); rounds 1-12
  are measured: N = 12 triples per workload, fixed now.
- Within a round: the workloads in the table's order; for each, the
  three arms adjacently, in order (round − 1) mod 6 of the six
  permutations (warm-up: pre, head, uncollected). Each order runs twice,
  each arm holds each place 4 times, and of any two arms each runs
  first in 6 of the 12 rounds.
- 13 × 10 × 3 = 390 samples. Every one is kept. A failed, malformed or
  timed-out sample (600 s safeguard, perf.mjs `fileTimeoutMs`) is
  recorded and never rerun; its workload is incomplete and gets no
  attribution; the driver exits 1. Another attempt is a new run.

## 5. Metrics and conditions

Bracketed around the call only (module load and source read outside):
wall time (`process.hrtime.bigint`, the tests' quantity), process CPU
(`cpuUsage`), main-thread CPU (`threadCpuUsage`), off-CPU time (wall −
main-thread CPU), involuntary and voluntary context switches
(`resourceUsage`), and peak RSS. Outcome: fn-linear's code (`ok`,
`E_TYPE`); for fn-scale the Go text's sha256, which must agree across
all samples, so the arms do the same work. Before each sample, the
paired protocol's conditions (§7 there): load averages, five busiest
processes, memory free %, pressure level, swap, power, thermal notes;
the load average again after. Recorded, never gated.

## 6. Statistics, fixed in advance

Per workload, over the 12 triples (Tukey hinges and extremes, as the
paired protocol; no significance test or interval claimed):

- Added cost: the paired ratio head/pre of wall time (also process and
  main-thread CPU). With arm (iii): head/uncollected (the trace) and
  uncollected/pre (the rest).
- Load sensitivity, per arm: wall time against the covariate, the
  one-minute load average read just before the sample. Theil-Sen slope
  (Theil 1950; Sen 1968) with intercept median(y − slope·x), the slope
  over the arm's median (fraction per unit of load), Kendall's tau-b
  (Kendall 1945); tau-b of off-CPU time against load; and the Theil-Sen
  fit and tau-b of each triple's head/pre ratio against that triple's
  mean load (does the added factor itself move with load?).
- Low-load reference L: the median pre wall time over the 4 measured
  pre samples with the lowest load.

## 7. Attribution, per workload (a formula, not a judgment)

With T the failed run's time, B its bound, M = B / 3 (measuredMs) and r
the median head/pre ratio (hinges q1, q3):

- Pre-equivalent time: T / r (range T / q3 to T / q1): the
  pre-tranche-2 compiler's estimated time under the failed run's
  conditions, assuming the paired ratio carries over to them.
- Verdict: `passed` if T ≤ B (controls). Otherwise `loadSufficient` if
  T / q3 > B (the pre compiler is estimated over the bound under those
  conditions too: the added cost is not necessary for the failure);
  `addedNecessary` if T / q1 ≤ B (without the added cost it is estimated
  within); else `undetermined`.
- Factors: T / M = existing × added × residual, with added = r,
  existing = L / M (the pre compiler at low load, fresh process, against
  the 2026-10-09 measurement), residual = T / (r · L) (the failed run's
  load plus everything not reproduced here). Shares: each factor's log
  over log(T / M).
- Corroboration of the residual: the pre arm's fit at the failed run's
  loads (4.52, 6.23) over its fit at L's load, flagged as extrapolated
  past the largest load sampled. Reported, not used in the verdict.

Prior evidence, cited not re-measured: pre-tranche-2 commits already
failed these bounds under load: `over` 2357/1620 at b107049 (§18.110),
`partialFirst` 969/930 alone at b107049 (§18.113), 950/930 at dde534a
(§18.129), 942/930 (docs/findings.md). All are ancestors of 823f628.

## 8. Outputs

.build/evidence/r0-t2-attr-<time>/samples.jsonl (one line per sample
with conditions, raw command output, stdout, stderr), then
attribution.json (header: commits, builds' digests, trace counts, node
and purs versions, start and end conditions lines, driver peak RSS;
each workload's statistics and attribution; every sample), or
failure.json with the stage. Nothing is written under test/fixtures;
the controller decides what to commit.

## 9. Expected cost

Inputs under 5 s. Three cold purs builds, about 10-40 s each (a full
compile took 5.7 s idle at 523 modules on 2026-10-17; 180 s limit),
plus two corpus trace runs, about 5-15 s each: 1-3 minutes. Samples: the
failed run's ten times sum to about 12.6 s per arm and round under load
4.5-6; add about 0.5-0.8 s per sample for process start, module load
and conditions: about 45-66 s per round, 10-14 minutes for 13 rounds.
Expected 12-17 minutes when lightly loaded, about 25 under the failed
run's load.

## 10. Threats to validity

- Process context. The tests run the eight forms in one process
  (`generic` fourth in fn-scale's); each sample here is a cold process
  with one workload, JIT warm-up inside the bracket. Absolute times are
  not the tests'; the verdict uses only T and the ratio r, and
  `existing` absorbs the context difference (labelled as such).
- Transfer. The verdict assumes head/pre measured here holds at the
  failed run's conditions. The ratio's own relation to load is reported;
  if the sampled loads stay below 4.5-6.2, the corroboration is
  extrapolated and flagged.
- One failed observation. T is a single sample with unknown noise; the
  verdict says what the pre compiler would do under that sample's
  conditions, not under the failed run's conditions in general.
- Head is not 354ce6e. The failures were at 354ce6e; head adds the
  prerequisites batch (11 src files: Check's Trace, ReadBack, Decide,
  Effects and Function, and Domain/Type/Traverse). The attribution is
  for head, the activation candidate; 354ce6e is not built.
- Pre's boundary. Anything that slowed the compiler before 823f628
  counts as existing, as do the machine and process-context differences
  from the 2026-10-09 measurement; `existing` does not separate them.
- The covariate. load1 lags (an exponentially damped average), counts
  this run's own worker, and does not see core placement (Apple silicon
  performance or efficiency cores) or frequency; off-CPU time and
  context switches are reported beside it, power and thermal notes per
  sample. A burst during one arm widens the spread; nothing is dropped.
- Order. Each arm holds each place equally often; carry-over from the
  previous workload's last sample and the fixed workload order remain.
- Memory pressure and swap inflate wall time by paging; recorded per
  sample, not controlled. The driver keeps the two trace-checked
  compilers and the corpus in memory while workers run; its peak RSS is
  recorded.
- Builds are plain purs (no source maps), as the paired protocol's;
  `npm run perf` loads output/ from `npm run build`. Equal across arms.
- The uncollected arm also drops `finish` and the second `numbering`,
  part of collection's cost as the removal edits define it.
- Linear workloads compare outcome codes only; scale workloads compare
  the Go text. Twelve triples on one machine; no interval claimed.

## 11. What remains unrun

The measurement, the three builds, `npm run perf` and verify have not
run. test/r0-t2-attr.test.mjs has run alone (`node --test`).
