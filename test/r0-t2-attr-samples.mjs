// Synthetic worker results and samples for test/r0-t2-attr.test.mjs
// (fixture-level: invented figures, no process measured).
import { schedule, workloadsOf } from '../scripts/r0-t2-attr-plan.mjs';

export const entry = (overrides = {}) => ({ wallMs: 100, cpuMs: 110,
  userMs: 100, systemMs: 10, threadCpuMs: 90, involuntarySwitches: 3,
  voluntarySwitches: 5, outcome: 'ok', digest: null, ...overrides });

// A worker line for `file`, every workload given `overrides`.
export const line = (file, overrides = {}) => JSON.stringify({
  entries: Object.fromEntries(workloadsOf(file).map(workload =>
    [workload.name, entry(overrides)])), maxRssMiB: 400, loadAfter: [2] });

// Synthetic samples of the linear file: the pre arm takes
// `base + perLoad × load` ms at load 1 + round / 2 (round 0 at 0.5),
// `failed` `factor` times that, `head` `batch` times `failed`, and
// `uncollected` head / `trace`. `loadOfRound` overrides the load.
export const samplesOf = ({ factor = 1.2, batch = 1.05, trace = 1.1,
  base = 100, perLoad = 10, loadOfRound = round => round === 0 ? 0.5
    : 1 + round / 2, ratioOf = () => 1 } = {}) =>
  schedule(['linear']).map(sample => {
    const load = loadOfRound(sample.round);
    const pre = base + perLoad * load;
    const failed = pre * factor * ratioOf(sample.round, load);
    const wallMs = { pre, failed, head: failed * batch,
      uncollected: failed * batch / trace }[sample.arm];
    return { ...sample, buildDir: sample.arm,
      conditions: { loadavg: [load, load, load] },
      result: { maxRssMiB: 400, entries: Object.fromEntries(
        workloadsOf('linear').map(workload => [workload.name,
          entry({ wallMs, cpuMs: wallMs, threadCpuMs: wallMs * 0.9,
            outcome: workload.key === 'mismatch' ? 'E_TYPE' : 'ok' })])) } };
  });

// The samples with `change` applied to the measured ones `pick` selects.
export const changed = (samples, pick, change) => samples.map(sample =>
  !sample.warmup && pick(sample) ? change(sample) : sample);

// One workload's entry in a sample, changed.
export const withEntry = (sample, name, overrides) => ({ ...sample,
  result: { ...sample.result, entries: { ...sample.result.entries,
    [name]: { ...sample.result.entries[name], ...overrides } } } });
