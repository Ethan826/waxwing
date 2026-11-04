// What the perf attribution measurement runs, fixed before any run
// (docs/plans/2026-11-04-perf-attribution-protocol.md §2-§4; dossier
// §18.161, performance paragraph): the four arms, the two test files'
// workloads in their tests' order with the failed run's figures, the
// Williams-square schedule and the worker's result line. Pure: nothing
// here runs a process or reads a file; test/r0-t2-attr.test.mjs checks it.

// The pre-tranche-2 compiler: 823f628, "docs: Stage B authorized with
// rulings; executable tasks (§18.155)". Its src is 6c563e1a's (the last
// src change before it); its first descendant, e2352091 (tranche 2
// Task 5), is the first commit to change src under tranche 2, and
// d55253dd (Task 6) adds the trace.
export const preCommit = '823f6283635ccf8c2b37c1c04858e7e4a1d3ae1f';
// The commit the failed `npm run perf` ran at.
export const failedCommit = '354ce6e18d12ec3ddb06a6f5991750f3c9bd62cd';

// The arms, each one scratch build: `pre` is preCommit's src, `failed`
// failedCommit's, `head` the measured commit's, `uncollected` the head's
// with the trace removal edits (scripts/r0-t2-trace-removal.mjs). The
// verdict reads `failed` over `pre`; the other two are reported beside.
export const armNames = ['pre', 'failed', 'head', 'uncollected'];
export const verdictPair = { over: 'failed', under: 'pre' };

// The failed run (dossier §18.160-§18.161; r0-t2-d1
// .build/evidence/2026-11-04-perf/summary.md): its commit and the load
// averages bracketing the whole `npm run perf` (before its first file,
// after its last), not any one file's.
export const perfRun = { commit: '354ce6e', loadBefore: 4.52,
  loadAfter: 6.23 };

// Each bound is 3 × measuredMs in its test file; observedMs is the
// failed run's time. Reported, never changed. Within a file the
// workloads are in the order its tests run them, in one process.
const linear = (form, measuredMs, observedMs) => ({ name: `linear ${form}`,
  file: 'linear', key: form, test: 'test/fn-linear-timing.perf.test.mjs',
  measuredMs, boundMs: 3 * measuredMs, observedMs });
const scale = (key, title, measuredMs, observedMs) => ({
  name: `scale ${key}`, file: 'scale', key, title,
  test: 'test/fn-scale.perf.test.mjs', measuredMs,
  boundMs: 3 * measuredMs, observedMs });

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
  scale('chain', 'a chain of 1,000 partial applications builds within 10 s',
    75, 140),
  scale('curried', 'a 1,000-long written arrow type builds within 10 s', 75,
    123),
  scale('generic', 'a 5,000-parameter function type through generics'
    + ' builds in 10 s', 550, 1900)
];

// The two process kinds, each one test file's workloads in its order.
export const fileNames = ['linear', 'scale'];
export const workloadsOf = file =>
  workloads.filter(workload => workload.file === file);

// The tests' sizes: fn-linear's width, fn-scale's programs.
export const linearWidth = 20000;
export const scaleSizes = { chain: 1000, curried: 1000, generic: 5000 };

export const warmups = 1;
export const rounds = 12;
// The fewest measured verdict pairs (failed and pre both succeeded) a
// workload needs for a verdict; fewer leaves it unmeasured.
export const minPairs = 9;

// A Williams square (Williams 1949) for `n` arms: row 0 is 0, 1, n-1,
// 2, n-2, …; row i adds i mod n. For even n each arm holds each
// position once and each ordered adjacent pair occurs once.
export const williams = n => {
  const first = Array.from({ length: n }, (_, at) => at % 2 === 1
    ? (at + 1) / 2 : (n - at / 2) % n);
  return Array.from({ length: n }, (_, row) =>
    first.map(value => (value + row) % n));
};

export const orders = williams(armNames.length)
  .map(row => row.map(at => armNames[at]));

// The warm-up round runs order 0; measured round k (1 to 12) runs order
// (k - 1) mod 4, so each order runs three times, each arm holds each
// position three times, and of any two arms each runs first in six.
export const orderOf = (round, warm = warmups) =>
  orders[round < warm ? 0 : (round - warm) % orders.length];

// Every sample in run order: rounds outermost, then the two files, the
// four arms in `orderOf(round)`.
export const schedule = (files = fileNames, warm = warmups,
  count = rounds) => {
  const order = [];
  for (let round = 0; round < warm + count; round += 1)
    for (const file of files)
      for (const arm of orderOf(round, warm))
        order.push({ round, warmup: round < warm, file, arm });
  return order;
};

// Per workload, measurements a worker reports (finite, not negative)
// and context switches across its bracket (integers, not negative).
export const reported = ['wallMs', 'cpuMs', 'userMs', 'systemMs',
  'threadCpuMs'];
export const switches = ['involuntarySwitches', 'voluntarySwitches'];

const isCount = value => Number.isInteger(value) && value >= 0;

const checkEntry = (name, entry) => {
  if (typeof entry !== 'object' || entry === null)
    throw new Error(`worker reported no ${name}`);
  for (const metric of reported)
    if (!Number.isFinite(entry[metric]) || entry[metric] < 0)
      throw new Error(`worker ${name} ${metric} is not a measurement: ${
        JSON.stringify(entry[metric])}`);
  for (const count of switches)
    if (!isCount(entry[count]))
      throw new Error(`worker ${name} ${count} is not a count: ${
        JSON.stringify(entry[count])}`);
  if (typeof entry.outcome !== 'string')
    throw new Error(`worker ${name} outcome missing`);
  if (entry.digest !== null && typeof entry.digest !== 'string')
    throw new Error(`worker ${name} digest malformed`);
};

// The worker's last stdout line for `file`, checked: one entry per
// workload of the file, and the process's peak RSS. Throws on anything
// else, so a malformed line is a failed sample, never a zero.
export const parseWorkerOutput = (stdout, file) => {
  const lines = String(stdout).split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('worker printed nothing');
  const found = JSON.parse(lines[lines.length - 1]);
  for (const workload of workloadsOf(file))
    checkEntry(workload.name, found.entries?.[workload.name]);
  if (!Number.isFinite(found.maxRssMiB) || found.maxRssMiB < 0)
    throw new Error('worker maxRssMiB is not a measurement');
  return found;
};
