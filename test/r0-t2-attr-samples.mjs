// Synthetic worker results and samples for test/r0-t2-attr.test.mjs
// (fixture-level: invented figures, no process measured).
import { schedule, workloads } from '../scripts/r0-t2-attr-plan.mjs';

export const result = (overrides = {}) => ({ wallMs: 100, cpuMs: 110,
  userMs: 100, systemMs: 10, threadCpuMs: 90, maxRssMiB: 400,
  involuntarySwitches: 3, voluntarySwitches: 5, loadAfter: [2, 2, 2],
  outcome: 'ok', digest: null, ...overrides });
export const line = overrides => JSON.stringify(result(overrides));

// Synthetic samples of the first workload: the pre arm takes
// `base + perLoad × load` ms at load 1 + round / 2 (round 0 at 0.5),
// `head` `factor` times that, `uncollected` `trace`-free:
// head / uncollected = `trace`.
export const samplesOf = ({ factor = 1.2, trace = 1.1, base = 100,
  perLoad = 10, workload = workloads[0] } = {}) =>
  schedule([workload]).map(entry => {
    const load = entry.round === 0 ? 0.5 : 1 + entry.round / 2;
    const pre = base + perLoad * load;
    const wallMs = { pre, head: pre * factor,
      uncollected: pre * factor / trace }[entry.arm];
    return { ...entry, buildDir: entry.arm,
      conditions: { loadavg: [load, load, load] },
      result: result({ wallMs, cpuMs: wallMs, threadCpuMs: wallMs * 0.9 }) };
  });

// The samples with `change` applied to the measured ones that `pick`
// selects.
export const changed = (samples, pick, change) => samples.map(sample =>
  !sample.warmup && pick(sample) ? change(sample) : sample);
