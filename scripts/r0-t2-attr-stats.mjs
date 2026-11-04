// The statistics of the perf attribution measurement
// (docs/plans/2026-11-04-perf-attribution-protocol.md §6). Pure;
// test/r0-t2-attr.test.mjs checks it. Published estimators only:
// Tukey's hinges (r0-t2-perf-stats.mjs `spread`), the Theil-Sen slope
// (Theil 1950; Sen 1968) with the usual intercept, the median of
// y - slope × x, and Kendall's tau-b (Kendall 1945, for ties). No
// significance test or confidence interval is claimed.
import { median, spread } from './r0-t2-perf-stats.mjs';
import { armNames, minPairs, verdictPair } from './r0-t2-attr-plan.mjs';

// Theil-Sen: the median of the slopes over every pair of points with
// distinct x; null when no such pair exists.
export const theilSen = points => {
  const slopes = [];
  for (let i = 0; i < points.length; i += 1)
    for (let j = i + 1; j < points.length; j += 1)
      if (points[j].x !== points[i].x)
        slopes.push((points[j].y - points[i].y)
          / (points[j].x - points[i].x));
  if (slopes.length === 0) return null;
  const slope = median(slopes);
  return { slope, intercept: median(points.map(point =>
    point.y - slope * point.x)), n: points.length };
};

export const fitted = (fit, x) => fit.intercept + fit.slope * x;

// Kendall's tau-b: (concordant - discordant) over the square root of the
// pairs untied in x times those untied in y; null when either is zero.
export const kendallTau = points => {
  let concordant = 0, discordant = 0, untiedX = 0, untiedY = 0;
  for (let i = 0; i < points.length; i += 1)
    for (let j = i + 1; j < points.length; j += 1) {
      const sign = Math.sign(points[j].x - points[i].x)
        * Math.sign(points[j].y - points[i].y);
      if (points[j].x !== points[i].x) untiedX += 1;
      if (points[j].y !== points[i].y) untiedY += 1;
      if (sign > 0) concordant += 1;
      if (sign < 0) discordant += 1;
    }
  return untiedX === 0 || untiedY === 0 ? null
    : (concordant - discordant) / Math.sqrt(untiedX * untiedY);
};

// The covariate, fixed in advance: the one-minute load average read
// just before the sample's process started.
export const loadOf = unit => unit.conditions?.loadavg?.[0];
export const offCpuMs = result => result.wallMs - result.threadCpuMs;

// One workload's measured units: from every measured sample of its file
// that succeeded, the workload's own entry, with the sample's round, arm
// and conditions.
export const unitsOf = (samples, workload) => samples
  .filter(sample => sample.file === workload.file && !sample.warmup
    && sample.result)
  .map(sample => ({ round: sample.round, arm: sample.arm,
    conditions: sample.conditions,
    result: sample.result.entries[workload.name] }));

// The rounds in which both arms have a unit, in round order.
export const pairsOf = (units, over, under) => {
  const of = arm => new Map(units.filter(unit => unit.arm === arm)
    .map(unit => [unit.round, unit]));
  const [left, right] = [of(over), of(under)];
  return [...left.keys()].filter(round => right.has(round))
    .sort((a, b) => a - b)
    .map(round => ({ round, over: left.get(round), under: right.get(round) }));
};

// Paired ratios, each `over` over `under` in the same round; `added` is
// the verdict's.
export const ratioNames = { added: [verdictPair.over, verdictPair.under],
  head: ['head', 'pre'], batch: ['head', 'failed'],
  trace: ['head', 'uncollected'], rest: ['uncollected', 'pre'] };
export const metrics = ['wallMs', 'cpuMs', 'threadCpuMs'];

const ratioOf = (units, [over, under], metric) => {
  const pairs = pairsOf(units, over, under);
  return { n: pairs.length, ...spread(pairs.map(pair =>
    pair.over.result[metric] / pair.under.result[metric])) };
};

const pointsOf = (units, valueOf) => units.filter(unit =>
  Number.isFinite(loadOf(unit))).map(unit => ({ x: loadOf(unit),
  y: valueOf(unit.result) }));

// One arm's wall time against the load: the Theil-Sen fit, the slope
// over the arm's median wall (fraction per unit of load), tau, the same
// tau for off-CPU time, and the loads sampled.
export const sensitivityOf = units => {
  const wall = pointsOf(units, result => result.wallMs);
  const fit = theilSen(wall);
  return { fit, relativeSlope: fit === null ? null
    : fit.slope / median(wall.map(point => point.y)),
  tau: kendallTau(wall), offCpuTau: kendallTau(pointsOf(units, offCpuMs)),
  load: spread(wall.map(point => point.x)) };
};

// The pre arm's low-load wall time, in the tests' context: the median
// over the third of its units with the lowest load (ties by round).
export const lowLoadOf = units => {
  const sorted = units.filter(unit => Number.isFinite(loadOf(unit)))
    .sort((a, b) => loadOf(a) - loadOf(b) || a.round - b.round);
  const third = sorted.slice(0, Math.ceil(sorted.length / 3));
  return third.length === 0 ? null : {
    wallMs: median(third.map(unit => unit.result.wallMs)),
    load: median(third.map(unit => loadOf(unit))), n: third.length };
};

// The verdict pair's ratio against the pair's mean load (the two
// samples' loads), and the loads it spans.
export const addedAgainstLoadOf = units => {
  const points = pairsOf(units, verdictPair.over, verdictPair.under)
    .map(pair => ({ x: (loadOf(pair.over) + loadOf(pair.under)) / 2,
      y: pair.over.result.wallMs / pair.under.result.wallMs }))
    .filter(point => Number.isFinite(point.x));
  return { fit: theilSen(points), tau: kendallTau(points),
    load: spread(points.map(point => point.x)) };
};

// Every failed sample of the workload's file, listed; outcome and output
// problems in any arm, which void the verdict.
export const failuresOf = (samples, workload) => samples
  .filter(sample => sample.file === workload.file && !sample.result)
  .map(sample => `round ${sample.round}${sample.warmup ? ' (warm-up)' : ''}`
    + ` ${sample.arm}: ${sample.failure}`);

export const outputProblemsOf = (units, expected) => {
  const digests = new Set(units.map(unit => unit.result.digest));
  return [...units.filter(unit => unit.result.outcome !== expected)
    .map(unit => `round ${unit.round} ${unit.arm}: outcome `
      + `${unit.result.outcome}, expected ${expected}`),
  ...(digests.size <= 1 ? [] : [`${digests.size} distinct outputs`])];
};

// One workload's statistics. `usable` holds when no output problem was
// seen and at least minPairs verdict pairs were measured; a failure in
// the optional arms (head, uncollected) does not void it.
export const summarize = (workload, samples, expected,
  least = minPairs) => {
  const units = unitsOf(samples, workload);
  const byArm = (arm, valueOf) => spread(units.filter(unit =>
    unit.arm === arm).map(unit => valueOf(unit.result)));
  const outputProblems = outputProblemsOf(units, expected);
  const ratios = metric => Object.fromEntries(Object.entries(ratioNames)
    .map(([name, arms]) => [name, ratioOf(units, arms, metric)]));
  const verdictPairs = ratioOf(units, ratioNames.added, 'wallMs').n;
  return { name: workload.name, test: workload.test,
    usable: outputProblems.length === 0 && verdictPairs >= least,
    verdictPairs, minPairs: least, failures: failuresOf(samples, workload),
    outputProblems,
    ...Object.fromEntries(metrics.map(metric => [metric, {
      arms: Object.fromEntries(armNames.map(arm =>
        [arm, byArm(arm, result => result[metric])])),
      ratios: ratios(metric) }])),
    offCpuMs: Object.fromEntries(armNames.map(arm =>
      [arm, byArm(arm, offCpuMs)])),
    sensitivity: Object.fromEntries(armNames.map(arm => [arm,
      sensitivityOf(units.filter(unit => unit.arm === arm))])),
    addedAgainstLoad: addedAgainstLoadOf(units),
    lowLoad: lowLoadOf(units.filter(unit => unit.arm === 'pre')) };
};
