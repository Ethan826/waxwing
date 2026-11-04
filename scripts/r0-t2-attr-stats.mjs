// The statistics of the perf attribution measurement
// (docs/plans/2026-11-04-perf-attribution-protocol.md §5-§6). Pure;
// test/r0-t2-attr.test.mjs checks it. Published estimators only:
// Tukey's hinges (r0-t2-perf-stats.mjs `spread`), the Theil-Sen slope
// (Theil 1950; Sen 1968) with the usual intercept, the median of
// y - slope × x, and Kendall's tau-b (Kendall 1945, for ties).
// No significance test or confidence interval is claimed.
import { median, spread } from './r0-t2-perf-stats.mjs';
import { armNames, rounds } from './r0-t2-attr-plan.mjs';

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
// just before the sample started.
export const loadOf = sample => sample.conditions?.loadavg?.[0];
export const offCpuMs = result => result.wallMs - result.threadCpuMs;

// The measured rounds of one workload in which all three arms succeeded,
// in round order, as { round, pre, head, uncollected }.
export const triplesOf = (samples, name) => {
  const byRound = new Map();
  for (const sample of samples)
    if (sample.workload === name && !sample.warmup) {
      const round = byRound.get(sample.round) ?? {};
      round[sample.arm] = sample;
      byRound.set(sample.round, round);
    }
  return [...byRound.entries()].sort(([a], [b]) => a - b)
    .map(([round, arms]) => ({ round, ...arms }))
    .filter(triple => armNames.every(arm => triple[arm]?.result));
};

// Paired ratios, each `over` the `under` arm in the same round.
export const ratioNames = { added: ['head', 'pre'],
  trace: ['head', 'uncollected'], rest: ['uncollected', 'pre'] };
export const metrics = ['wallMs', 'cpuMs', 'threadCpuMs'];

const ratiosOf = (triples, metric) => Object.fromEntries(
  Object.entries(ratioNames).map(([name, [over, under]]) => [name,
    spread(triples.map(triple => triple[over].result[metric]
      / triple[under].result[metric]))]));

const pointsOf = (samples, valueOf) => samples.filter(sample =>
  Number.isFinite(loadOf(sample))).map(sample => ({ x: loadOf(sample),
  y: valueOf(sample.result) }));

// One arm's wall time against the load: the Theil-Sen fit, the fit
// relative to the arm's median wall (fraction per unit of load), tau,
// and the same tau for its off-CPU time (wall minus main-thread CPU).
export const sensitivityOf = measured => {
  const wall = pointsOf(measured, result => result.wallMs);
  const fit = theilSen(wall);
  const middle = median(wall.map(point => point.y));
  return { fit, relativeSlope: fit === null ? null : fit.slope / middle,
    tau: kendallTau(wall),
    offCpuTau: kendallTau(pointsOf(measured, offCpuMs)),
    load: spread(wall.map(point => point.x)) };
};

// The pre arm's low-load wall time: the median over the third of its
// measured samples with the lowest load (ties by round), and their load.
export const lowLoadOf = measured => {
  const sorted = measured.filter(sample => Number.isFinite(loadOf(sample)))
    .sort((a, b) => loadOf(a) - loadOf(b) || a.round - b.round);
  const third = sorted.slice(0, Math.ceil(sorted.length / 3));
  return third.length === 0 ? null : {
    wallMs: median(third.map(sample => sample.result.wallMs)),
    load: median(third.map(sample => loadOf(sample))), n: third.length };
};

// A workload's problems: failed samples, an outcome other than the
// expected one, Go output digests that differ across samples, and fewer
// complete triples than scheduled.
export const problemsOf = (workload, own, triples, expected,
  count = rounds) => {
  const succeeded = own.filter(sample => sample.result);
  const digests = new Set(succeeded.map(sample => sample.result.digest));
  return [
    ...own.filter(sample => !sample.result).map(sample =>
      `round ${sample.round} ${sample.arm}: ${sample.failure}`),
    ...succeeded.filter(sample => sample.result.outcome !== expected)
      .map(sample => `round ${sample.round} ${sample.arm}: outcome `
        + `${sample.result.outcome}, expected ${expected}`),
    ...(digests.size <= 1 ? [] : [`${digests.size} distinct outputs`
      + ' across samples']),
    ...(triples.length === count ? []
      : [`${triples.length} of ${count} triples measured`])];
};

// One workload's statistics: per metric each arm's spread and the three
// paired ratios; off-CPU time per arm; each arm's load sensitivity; the
// added ratio against the round's load; the pre arm's low-load time.
export const summarize = (workload, samples, expected, count = rounds) => {
  const own = samples.filter(sample => sample.workload === workload.name);
  const triples = triplesOf(samples, workload.name);
  const problems = problemsOf(workload, own, triples, expected, count);
  const measuredOf = arm => own.filter(sample => sample.arm === arm
    && !sample.warmup && sample.result);
  const byArm = valueOf => Object.fromEntries(armNames.map(arm => [arm,
    spread(triples.map(triple => valueOf(triple[arm].result)))]));
  const addedPoints = triples.map(triple => ({
    x: (loadOf(triple.pre) + loadOf(triple.head)) / 2,
    y: triple.head.result.wallMs / triple.pre.result.wallMs }))
    .filter(point => Number.isFinite(point.x));
  return { name: workload.name, file: workload.file,
    complete: problems.length === 0, problems, triples: triples.length,
    ...Object.fromEntries(metrics.map(metric => [metric, {
      arms: byArm(result => result[metric]),
      ratios: ratiosOf(triples, metric) }])),
    offCpuMs: byArm(offCpuMs),
    sensitivity: Object.fromEntries(armNames.map(arm =>
      [arm, sensitivityOf(measuredOf(arm))])),
    addedAgainstLoad: { fit: theilSen(addedPoints),
      tau: kendallTau(addedPoints) },
    lowLoad: lowLoadOf(measuredOf('pre')) };
};
