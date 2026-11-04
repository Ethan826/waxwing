// The attribution of each failed bound and the measurement file
// (docs/plans/2026-11-04-perf-attribution-protocol.md §6-§7). Pure;
// test/r0-t2-attr.test.mjs checks it. The bounds and the failed run's
// times are reported as recorded (r0-t2-attr-plan.mjs `workloads`):
// nothing here changes a bound or calls a workload passing.
import { fitted, summarize } from './r0-t2-attr-stats.mjs';
import { armNames, perfRun, rounds, warmups, workloads }
  from './r0-t2-attr-plan.mjs';

export const verdicts = {
  passed: 'within its bound in the failed run (a control)',
  loadSufficient: 'the pre-tranche-2 compiler is estimated over the bound'
    + ' under that run\'s conditions too: added cost not necessary',
  addedNecessary: 'the pre-tranche-2 compiler is estimated within the'
    + ' bound under that run\'s conditions: added cost necessary',
  undetermined: 'the estimate for the pre-tranche-2 compiler straddles'
    + ' the bound',
  unmeasured: 'the workload is incomplete; no attribution'
};

const share = (factor, total) => total > 1 && factor > 0
  ? Math.log(factor) / Math.log(total) : null;

// One workload's attribution, from its wall-time summary.
// - preEquivalent: the failed run's time divided by the paired ratio
//   head/pre (median; the low and high ends divide by q3 and q1): the
//   pre-tranche-2 compiler's estimated time under that run's conditions,
//   assuming the ratio carries over to them.
// - factors: observed / measuredMs = existing × added × residual, where
//   added is the median ratio, existing the pre arm's low-load wall time
//   over measuredMs, residual what remains: the failed run's load and
//   everything this measurement does not reproduce. shares: each factor's
//   log over the total's log.
// - loadPredicted: the pre arm's Theil-Sen fit at the failed run's load
//   before and after, over the fit at the low-load reference; flagged as
//   extrapolated past the largest load sampled. Corroboration only.
export const attribute = (workload, summary) => {
  const { observedMs, boundMs, measuredMs } = workload;
  const added = summary.wallMs.ratios.added;
  const low = summary.lowLoad;
  if (!summary.complete || added === null || low === null)
    return { verdict: 'unmeasured', reading: verdicts.unmeasured };
  const preEquivalent = { median: observedMs / added.median,
    low: observedMs / added.q3, high: observedMs / added.q1 };
  const verdict = observedMs <= boundMs ? 'passed'
    : preEquivalent.low > boundMs ? 'loadSufficient'
      : preEquivalent.high <= boundMs ? 'addedNecessary' : 'undetermined';
  const factors = { total: observedMs / measuredMs, existing:
    low.wallMs / measuredMs, added: added.median,
  residual: observedMs / (added.median * low.wallMs) };
  const fit = summary.sensitivity.pre.fit;
  const atLow = fit === null ? null : fitted(fit, low.load);
  const loadPredicted = fit === null || !(atLow > 0) ? null : {
    before: fitted(fit, perfRun.loadBefore) / atLow,
    after: fitted(fit, perfRun.loadAfter) / atLow,
    extrapolated: perfRun.loadAfter > summary.sensitivity.pre.load.max };
  return { observedMs, boundMs, measuredMs, overBound: observedMs / boundMs,
    preEquivalent, verdict, reading: verdicts[verdict], factors,
    shares: Object.fromEntries(['existing', 'added', 'residual'].map(name =>
      [name, share(factors[name], factors.total)])),
    trace: summary.wallMs.ratios.trace, loadPredicted };
};

// The measurement file: the header, each workload's statistics and
// attribution, and every sample, warm-ups included. `expected` maps a
// workload's name to the outcome every arm must give (the inputs').
export const attributionFile = (header, samples, expected,
  list = workloads, count = rounds) => {
  const results = list.map(workload => {
    const summary = summarize(workload, samples, expected[workload.name],
      count);
    return { ...summary, attribution: attribute(workload, summary) };
  });
  return { protocol: 'docs/plans/2026-11-04-perf-attribution-protocol.md',
    ruling: 'dossier §18.161: attribute without an idle computer, retries'
      + ' for green or bound changes', header, perfRun,
    schedule: { warmups, rounds: count, arms: armNames,
      order: 'six orders of the three arms, each twice' },
    complete: results.every(found => found.complete), workloads: results,
    samples };
};
