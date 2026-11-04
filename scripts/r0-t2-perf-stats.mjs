// The pure parts of the paired performance measurement
// (docs/plans/2026-11-04-performance-protocol.md; dossier §18.159
// criterion 6; BACKLOG R035): the fixed schedule, the worker's result
// line and the statistics. The measurement file's shape is in
// scripts/r0-t2-perf-file.mjs. Nothing here runs a process or reads a
// file; test/r0-t2-perf.test.mjs checks these functions.

// Fixed before any run (protocol §4): one warm-up pair discarded from
// the statistics (kept in the raw log), then twelve measured pairs.
export const warmups = 1;
export const pairs = 12;

// Each comparison names its two arms, each an arm of
// scripts/r0-t2-perf-worker.mjs with the scratch build it loads; which
// runs first alternates by round (`sidesOf`). The part says which gate
// part it feeds; `unpaired` names counts the two arms may differ in.
export const comparisons = [
  { name: 'traceCompile', part: 'readBack',
    without: { arm: 'compile', build: 'uncollected' },
    with: { arm: 'compile', build: 'collecting' } },
  { name: 'traceRecheck', part: 'readBack',
    without: { arm: 'recheck', build: 'uncollected' },
    with: { arm: 'recheck', build: 'collecting' } },
  { name: 'onlineReadBack', part: 'readBack',
    without: { arm: 'recheck alone', build: 'collecting' },
    with: { arm: 'recheck and read-back', build: 'collecting' } },
  { name: 'validator', part: 'validator', unpaired: ['accepted'],
    without: { arm: 'certify', build: 'collecting' },
    with: { arm: 'validate', build: 'collecting' } }
];

export const parts = ['readBack', 'validator'];
// Measurements a worker reports, each finite and not negative.
export const reported = ['wallMs', 'cpuMs', 'userMs', 'systemMs',
  'maxRssMiB', 'maxRssAfterPrepareMiB', 'heapUsedBeforeMiB',
  'heapUsedAfterMiB'];
// Paired as ratios (with over without) and differences.
export const ratioMetrics = ['cpuMs', 'wallMs', 'maxRssMiB'];
// Paired as differences only: what `run` added over `prepare`'s peak
// (zero when `run` stayed below it, so a lower bound), and heap growth
// across `run` (garbage collection can make it negative).
export const increments = {
  runRssIncrementMiB: result =>
    result.maxRssMiB - result.maxRssAfterPrepareMiB,
  heapIncrementMiB: result =>
    result.heapUsedAfterMiB - result.heapUsedBeforeMiB
};

// Counterbalanced order (the controller's ruling, 2026-11-04): in an
// even round `without` runs first, in an odd round `with`. Round 0 is
// the warm-up, so of the twelve measured rounds (1 to 12) six run
// `with` first (the odd ones) and six `without` first.
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
          comparison: comparison.name, side, ...comparison[side] });
  return order;
};

// The candidate counts against Task 13's pin
// (test/fixtures/r0/t2-honest.json): the inputs are the two
// denominators only if the candidates match both. Undefined for arms
// that count no candidates.
export const denominatorsCheck = (counts, pin) =>
  counts?.candidates === undefined ? undefined
    : counts.candidates === pin['effect pin'].candidates
      && counts.corpusCandidates === pin['corpus loader'].candidates;

const isCount = value => Number.isInteger(value) && value >= 0;

// The worker's last stdout line, checked: every measurement a finite
// number that is not negative, and integer counts. Throws on anything
// else, so a malformed line is a failed sample, never a zero.
export const parseWorkerOutput = stdout => {
  const lines = String(stdout).split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('worker printed nothing');
  const found = JSON.parse(lines[lines.length - 1]);
  for (const metric of reported)
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

// A pair's problems: its builds must differ exactly when the
// comparison's do (the trace pairs), and every count both arms report
// must agree, except the comparison's `unpaired` ones.
export const pairProblems = (comparison, pair) => {
  const differ = comparison.with.build !== comparison.without.build;
  const builds = (pair.with.buildDir !== pair.without.buildDir) === differ
    ? [] : [`round ${pair.round}: builds ${differ ? 'equal' : 'differ'}`];
  const left = pair.without.result.counts;
  const right = pair.with.result.counts;
  const counts = Object.keys(left).filter(key => key in right
    && !(comparison.unpaired ?? []).includes(key)
    && left[key] !== right[key]).map(key => `round ${pair.round}: ${key} `
      + `${left[key]} without, ${right[key]} with`);
  return [...builds, ...counts];
};

const paired = (measured, valueOf) => ({
  difference: spread(measured.map(pair =>
    valueOf(pair.with.result) - valueOf(pair.without.result))),
  without: spread(measured.map(pair => valueOf(pair.without.result))),
  with: spread(measured.map(pair => valueOf(pair.with.result)))
});

// One comparison's statistics: per ratio metric, the paired ratio and
// difference, each as median and spread, and each arm's own values;
// per increment, the difference and the arms. `complete` holds only
// when every scheduled sample succeeded and every check passed.
export const summarize = (comparison, samples, count = pairs) => {
  const own = samples.filter(sample =>
    sample.comparison === comparison.name);
  const measured = pairsOf(samples, comparison.name);
  const problems = [
    ...own.filter(sample => !sample.result).map(sample =>
      `round ${sample.round} ${sample.side}: ${sample.failure}`),
    ...own.filter(sample => sample.countsCheck === false).map(sample =>
      `round ${sample.round} ${sample.side}: counts differ from the pin`),
    ...measured.flatMap(pair => pairProblems(comparison, pair)),
    ...(measured.length === count ? []
      : [`${measured.length} of ${count} pairs measured`])];
  const ratios = Object.fromEntries(ratioMetrics.map(metric => [metric, {
    ratio: spread(measured.map(pair =>
      pair.with.result[metric] / pair.without.result[metric])),
    ...paired(measured, result => result[metric]) }]));
  const added = Object.fromEntries(Object.entries(increments)
    .map(([name, valueOf]) => [name, paired(measured, valueOf)]));
  return { name: comparison.name, part: comparison.part,
    without: comparison.without, with: comparison.with,
    pairs: measured.length, complete: problems.length === 0, problems,
    counts: own.find(sample => sample.result)?.result.counts ?? null,
    ...ratios, ...added };
};
