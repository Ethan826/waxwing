// Synthetic worker results and samples for test/r0-t2-perf.test.mjs
// (fixture-level: invented figures, no process measured).
import { comparisons, pairs, schedule, warmups }
  from '../scripts/r0-t2-perf-stats.mjs';

export const result = (overrides = {}) => ({ wallMs: 10, cpuMs: 9,
  userMs: 8, systemMs: 1, maxRssMiB: 400, maxRssAfterPrepareMiB: 390,
  heapUsedBeforeMiB: 100, heapUsedAfterMiB: 120,
  counts: { declarations: 3 }, ...overrides });
export const line = overrides => JSON.stringify(result(overrides));

export const pin = { 'effect pin': { candidates: 2832 },
  'corpus loader': { candidates: 2823 } };

// Synthetic samples: `with` costs `factor` times `without` in CPU and
// 1.1 times in memory, every round, warm-ups at a tenth.
export const samplesOf = (factor, count = pairs) => schedule(comparisons,
  warmups, count).map(entry => {
  const base = entry.warmup ? 10 : 100 + entry.round;
  const scale = entry.side === 'with' ? factor : 1;
  const rss = entry.side === 'with' ? 440 : 400;
  return { ...entry, buildDir: entry.build, conditions: { loadavg: [2],
    memoryFree: 30, pressure: 'warn', power: 'AC Power 100%' },
  result: result({ wallMs: base * scale, cpuMs: base * scale,
    maxRssMiB: rss, maxRssAfterPrepareMiB: rss - 5, counts: { n: 1 } }) };
});
export const header = { start: 'conditions [r0-t2-perf] commit abc',
  commit: 'abc0000000000000000000000000000000000000',
  end: 'conditions [r0-t2-perf] commit abc' };
export const changed = (samples, name, change) => samples.map(sample =>
  sample.comparison === name && !sample.warmup ? change(sample) : sample);
