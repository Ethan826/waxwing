// What the perf attribution measurement runs, fixed before any run
// (docs/plans/2026-11-04-perf-attribution-protocol.md §2-§4; dossier
// §18.161, performance paragraph): the three arms, the ten workloads
// with the failed run's figures, the counterbalanced schedule and the
// worker's result line. Pure: nothing here runs a process or reads a
// file; test/r0-t2-attr.test.mjs checks it.

// The pre-tranche-2 compiler: 823f628, "docs: Stage B authorized with
// rulings; executable tasks (§18.155)". Its src is 6c563e1a's (the last
// src change before it); its first descendant, e2352091 (tranche 2
// Task 5), is the first commit to change src under tranche 2, and
// d55253dd (Task 6) adds the trace.
export const preCommit = '823f6283635ccf8c2b37c1c04858e7e4a1d3ae1f';

// The arms, each one scratch build: `pre` is preCommit's src, `head` the
// measured commit's, `uncollected` the head's with the trace removal
// edits (scripts/r0-t2-trace-removal.mjs).
export const armNames = ['pre', 'head', 'uncollected'];

// The single `npm run perf` that failed (dossier §18.160-§18.161;
// r0-t2-d1 .build/evidence/2026-11-04-perf/summary.md): its commit and
// the load average before and after it.
export const perfRun = { commit: '354ce6e', loadBefore: 4.52,
  loadAfter: 6.23 };

const linearFile = 'test/fn-linear-timing.perf.test.mjs';
const scaleFile = 'test/fn-scale.perf.test.mjs';

// The fn-linear bounds are 3 × measuredMs (fn-linear-timing.perf.test.mjs);
// observedMs is that run's time. Reported, never changed.
const linear = (form, measuredMs, observedMs) => ({ name: `linear ${form}`,
  kind: 'linear', key: form, file: linearFile, measuredMs,
  boundMs: 3 * measuredMs, observedMs });
// fn-scale's Waxwing phases (`compile`), bounded at 3 × measuredMs.
const scale = (key, title, measuredMs, observedMs) => ({
  name: `scale ${key}`, kind: 'scale', key, title, file: scaleFile,
  measuredMs, boundMs: 3 * measuredMs, observedMs });

export const workloads = [
  linear('value', 400, 1359),
  linear('over', 540, 2331),
  linear('lambda', 515, 1336),
  linear('mismatch', 175, 335),
  linear('partialFirst', 310, 1155),
  linear('partialAll', 225, 598),
  linear('parenthesized', 370, 1276),
  linear('pipe', 250, 621),
  scale('mixed', 'a 5,000-parameter function used as a value builds within'
    + ' 10 s', 1250, 1709),
  scale('generic', 'a 5,000-parameter function type through generics'
    + ' builds in 10 s', 550, 1900)
];

// The fn-linear width and the fn-scale parameter count of the tests.
export const linearWidth = 20000;
export const scaleParameters = 5000;

export const warmups = 1;
export const rounds = 12;

// Every order of `items`, lexicographic by position.
export const permutations = items => items.length <= 1 ? [items]
  : items.flatMap((item, at) => permutations(
    [...items.slice(0, at), ...items.slice(at + 1)])
    .map(rest => [item, ...rest]));

export const orders = permutations(armNames);

// The warm-up round runs the first order; measured round k (1 to 12)
// runs order (k - 1) mod 6, so each of the six orders runs twice, each
// arm holds each position four times, and of any two arms each runs
// first in six rounds.
export const orderOf = (round, warm = warmups) =>
  orders[round < warm ? 0 : (round - warm) % orders.length];

// Every sample in run order: rounds outermost, then the workloads in
// their fixed order, the three arms in `orderOf(round)`.
export const schedule = (list = workloads, warm = warmups,
  count = rounds) => {
  const order = [];
  for (let round = 0; round < warm + count; round += 1)
    for (const workload of list)
      for (const arm of orderOf(round, warm))
        order.push({ round, warmup: round < warm, workload: workload.name,
          arm });
  return order;
};

// Measurements a worker reports: finite, not negative.
export const reported = ['wallMs', 'cpuMs', 'userMs', 'systemMs',
  'threadCpuMs', 'maxRssMiB'];
// Context switches across `run`: integers, not negative.
export const switches = ['involuntarySwitches', 'voluntarySwitches'];

const isCount = value => Number.isInteger(value) && value >= 0;

// The worker's last stdout line, checked; throws on anything else, so a
// malformed line is a failed sample, never a zero.
export const parseWorkerOutput = stdout => {
  const lines = String(stdout).split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('worker printed nothing');
  const found = JSON.parse(lines[lines.length - 1]);
  for (const metric of reported)
    if (!Number.isFinite(found[metric]) || found[metric] < 0)
      throw new Error(`worker ${metric} is not a measurement: ${
        JSON.stringify(found[metric])}`);
  for (const name of switches)
    if (!isCount(found[name]))
      throw new Error(`worker ${name} is not a count: ${
        JSON.stringify(found[name])}`);
  if (typeof found.outcome !== 'string')
    throw new Error(`worker outcome missing: ${
      JSON.stringify(found.outcome)}`);
  if (found.digest !== null && typeof found.digest !== 'string')
    throw new Error(`worker digest malformed: ${
      JSON.stringify(found.digest)}`);
  return found;
};
