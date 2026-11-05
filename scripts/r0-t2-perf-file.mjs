// The measurement file of the paired performance measurement
// (docs/plans/2026-11-04-performance-protocol.md §6, §8, §11), in the
// shape the activation gate reads (test/r0-t2-activation-gate.mjs,
// criterion 6), and the rounding of a budget proposal. Pure; checked by
// test/r0-t2-perf.test.mjs. No budget is written: budgets come only
// from the gate status, on the author's approval.
import { comparisons, pairs, parts, spread, summarize, warmups }
  from './r0-t2-perf-stats.mjs';

// The gate's metric for each statistic it reads.
export const gateMetrics = { compileTime: 'cpuMs', peakMemory: 'maxRssMiB' };

// A gate part's figure for one metric: the largest median paired ratio
// over its comparisons (ratios with different denominators: each
// comparison's own figure is kept beside it), or null (the gate reads
// it unmet) when any of them is incomplete.
export const partFigure = (summaries, metric) => {
  if (summaries.length === 0 || summaries.some(found => !found.complete))
    return null;
  return Math.max(...summaries.map(found => found[metric].ratio.median));
};

export const step = 0.05;
const tolerance = 1e-9;

// A proposed ceiling (protocol §11): ceil(x / 0.05) × 0.05, where an x
// within 1e-9 of a multiple counts as that multiple (so 1.15, held as
// 1.1499999…, stays 1.15), to two decimals.
export const ceilingOf = value =>
  Number((Math.ceil(value / step - tolerance) * step).toFixed(2));

// The load, memory and power seen over the run, as the gate's one
// `conditions` string; the per-sample record stays in `samples`.
export const conditionsText = (header, samples) => {
  const range = values => {
    const found = spread(values.filter(Number.isFinite));
    return found === null ? 'unavailable'
      : `${found.min}-${found.max} (median ${found.median})`;
  };
  const seen = samples.map(sample => sample.conditions ?? {});
  const kinds = key => [...new Set(seen.map(found =>
    typeof found[key] === 'string' ? found[key]
      : JSON.stringify(found[key])))].sort().join(', ');
  return `${header.start}; shared machine, in use; ${samples.length} `
    + `samples; load1 ${range(seen.map(found => found.loadavg?.[0]))}; `
    + `memory free % ${range(seen.map(found => found.memoryFree))}; `
    + `pressure ${kinds('pressure')}; power ${kinds('power')}; `
    + `end ${header.end}`;
};

// Each comparison's own figures for the gate's metrics: the median and
// upper hinge of its paired ratios.
const figuresOf = summary => Object.fromEntries(Object.entries(gateMetrics)
  .map(([gate, metric]) => [gate, { median: summary[metric].ratio?.median
    ?? null, q3: summary[metric].ratio?.q3 ?? null }]));

// The measurement file: what the gate reads (`conditions`, and for each
// part `compileTime` and `peakMemory` with a `measured` number), the
// statistics behind each figure, and every sample, warm-ups included.
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
      ['figures', Object.fromEntries(own.map(found =>
        [found.name, figuresOf(found)]))],
      ['comparisons', own]]);
  };
  return { protocol: 'docs/plans/2026-11-04-performance-protocol.md',
    commit: header.commit,
    conditions: conditionsText(header, samples), header,
    schedule: { warmups, pairs: count, order: 'counterbalanced: even '
      + 'rounds without first, odd rounds with first' },
    ...Object.fromEntries(parts.map(name => [name, part(name)])),
    samples };
};
