// The pure parts of the paired performance measurement
// (docs/plans/2026-11-04-performance-protocol.md; dossier §18.159
// criterion 6; BACKLOG R035): the fixed schedule, the worker's result
// line, the statistics and the measurement file in the shape the
// activation gate reads (test/r0-t2-activation-gate.mjs, criterion 6).
// Nothing here runs a process or reads a file; scripts/r0-t2-perf-run.mjs
// does, and test/r0-t2-perf.test.mjs checks these functions.

// Fixed before any run (protocol §4): one warm-up pair discarded from
// the statistics (kept in the raw log), then twelve measured pairs.
export const warmups = 1;
export const pairs = 12;

// Each comparison names its two arms; which runs first alternates by
// round (`sidesOf`). The part says which gate part it feeds.
export const comparisons = [
  { name: 'traceCompile', part: 'readBack', without: 'uncollected compile',
    with: 'collecting compile' },
  { name: 'traceRecheck', part: 'readBack', without: 'uncollected recheck',
    with: 'collecting recheck' },
  { name: 'onlineReadBack', part: 'readBack', without: 'recheck alone',
    with: 'recheck and read-back' },
  { name: 'validator', part: 'validator', without: 'certify',
    with: 'validate' }
];

export const parts = ['readBack', 'validator'];
export const metrics = ['cpuMs', 'wallMs', 'maxRssMiB'];
// The gate's metric for each statistic it reads.
export const gateMetrics = { compileTime: 'cpuMs', peakMemory: 'maxRssMiB' };

// Counterbalanced order (the controller's ruling, 2026-11-04): in an
// even round `without` runs first, in an odd round `with`. Round 0 is
// the warm-up, so of the twelve measured rounds (1 to 12) six run
// `with` first (the odd ones) and six `without` first (the controller's
// ruling: N = 12, so the split is exact).
export const sidesOf = round => round % 2 === 0 ? ['without', 'with']
  : ['with', 'without'];

// Every sample in run order: rounds outermost, then the comparisons in
// their fixed order, the two arms in `sidesOf(round)`'s order.
export const schedule = (list = comparisons, warm = warmups,
  count = pairs) => {
  const order = [];
  for (let round = 0; round < warm + count; round += 1)
    for (const comparison of list)
      for (const side of sidesOf(round))
        order.push({ round, warmup: round < warm,
          comparison: comparison.name, side, arm: comparison[side] });
  return order;
};

// The validator arms' counts against Task 13's pin
// (test/fixtures/r0/t2-honest.json): the inputs are the two
// denominators only if the candidates match both. Undefined for arms
// that count no candidates.
export const denominatorsCheck = (counts, pin) =>
  counts?.candidates === undefined ? undefined
    : counts.candidates === pin['effect pin'].candidates
      && counts.corpusCandidates === pin['corpus loader'].candidates;

const isCount = value => Number.isInteger(value) && value >= 0;

// The worker's last stdout line, checked: every metric a finite number
// that is not negative, and integer counts. Throws on anything else, so
// a malformed line is a failed sample, never a zero.
export const parseWorkerOutput = stdout => {
  const lines = String(stdout).split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('worker printed nothing');
  const found = JSON.parse(lines[lines.length - 1]);
  for (const metric of [...metrics, 'userMs', 'systemMs'])
    if (!Number.isFinite(found[metric]) || found[metric] < 0)
      throw new Error(`worker ${metric} is not a measurement: ${
        JSON.stringify(found[metric])}`);
  const counts = found.counts ?? {};
  if (typeof counts !== 'object'
    || !Object.values(counts).every(isCount))
    throw new Error(`worker counts malformed: ${JSON.stringify(counts)}`);
  return found;
};

// Median: the middle value, or the mean of the two middle values.
export const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Spread: Tukey's hinges (the medians of the lower and upper halves,
// the middle value in both when the count is odd), with the extremes.
export const spread = values => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.ceil(sorted.length / 2);
  return { n: sorted.length, median: median(sorted),
    q1: median(sorted.slice(0, half)),
    q3: median(sorted.slice(sorted.length - half)),
    min: sorted[0], max: sorted[sorted.length - 1] };
};

// The measured pairs of one comparison: rounds after the warm-ups in
// which both arms succeeded, in round order.
export const pairsOf = (samples, name) => {
  const rounds = new Map();
  for (const sample of samples)
    if (sample.comparison === name && !sample.warmup) {
      const round = rounds.get(sample.round) ?? {};
      round[sample.side] = sample;
      rounds.set(sample.round, round);
    }
  return [...rounds.entries()].sort(([a], [b]) => a - b)
    .map(([round, both]) => ({ round, ...both }))
    .filter(pair => pair.without?.result && pair.with?.result);
};

const ratioOf = metric => pair =>
  pair.with.result[metric] / pair.without.result[metric];
const deltaOf = metric => pair =>
  pair.with.result[metric] - pair.without.result[metric];
const armOf = (side, metric) => pair => pair[side].result[metric];

// One comparison's statistics: per metric, the paired ratio (with over
// without) and the paired difference, each as median and spread, and
// each arm's own values. `complete` holds only when every scheduled
// sample succeeded and the counts check passed.
export const summarize = (comparison, samples, count = pairs) => {
  const own = samples.filter(sample =>
    sample.comparison === comparison.name);
  const failed = own.filter(sample => !sample.result);
  const measured = pairsOf(samples, comparison.name);
  const checked = own.every(sample => sample.countsCheck !== false);
  const stats = Object.fromEntries(metrics.map(metric => [metric, {
    ratio: spread(measured.map(ratioOf(metric))),
    difference: spread(measured.map(deltaOf(metric))),
    without: spread(measured.map(armOf('without', metric))),
    with: spread(measured.map(armOf('with', metric)))
  }]));
  return { name: comparison.name, part: comparison.part,
    without: comparison.without, with: comparison.with,
    pairs: measured.length,
    complete: failed.length === 0 && measured.length === count && checked,
    failed: failed.map(sample => `${sample.round} ${sample.side}: ${
      sample.failure}`),
    counts: own.find(sample => sample.result)?.result.counts ?? null,
    ...stats };
};

// A gate part's figure for one metric: the largest median paired ratio
// over its comparisons, or null (the gate reads it unmet) when any of
// them is incomplete.
export const partFigure = (summaries, metric) => {
  if (summaries.length === 0 || summaries.some(found => !found.complete))
    return null;
  return Math.max(...summaries.map(found => found[metric].ratio.median));
};

// The load, memory and power seen over the run, as the gate's one
// `conditions` string; the per-sample record stays in `samples`.
export const conditionsText = (header, samples) => {
  const range = values => {
    const found = spread(values.filter(Number.isFinite));
    return found === null ? 'unavailable'
      : `${found.min}-${found.max} (median ${found.median})`;
  };
  const seen = samples.map(sample => sample.conditions ?? {});
  const levels = [...new Set(seen.map(found => found.pressure))].sort();
  return `${header.start}; shared machine, in use; ${samples.length} `
    + `samples; load1 ${range(seen.map(found => found.loadavg?.[0]))}; `
    + `memory free % ${range(seen.map(found => found.memoryFree))}; `
    + `pressure ${levels.join(', ')}; end ${header.end}`;
};

// The measurement file: what the gate reads (`conditions`, and for each
// part `compileTime` and `peakMemory` with a `measured` number), the
// statistics behind each figure, and every sample, warm-ups included.
// No budget is written here: budgets come only from the gate status.
export const measurementFile = (header, samples, list = comparisons,
  count = pairs) => {
  const summaries = list.map(found => summarize(found, samples, count));
  const part = name => {
    const own = summaries.filter(found => found.part === name);
    return Object.fromEntries([
      ...Object.entries(gateMetrics).map(([gate, metric]) => [gate,
        { measured: partFigure(own, metric), unit: 'ratio',
          statistic: `largest median paired ${metric} ratio (with over `
            + `without) over ${own.map(found => found.name).join(', ')}` }]),
      ['comparisons', own]]);
  };
  return { protocol: 'docs/plans/2026-11-04-performance-protocol.md',
    conditions: conditionsText(header, samples), header,
    schedule: { warmups, pairs: count, order: 'counterbalanced: even '
      + 'rounds without first, odd rounds with first' },
    ...Object.fromEntries(parts.map(name => [name, part(name)])),
    samples };
};
