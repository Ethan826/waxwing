// The attribution of each bound and the measurement file
// (docs/plans/2026-11-04-perf-attribution-protocol.md §7-§8). Pure;
// test/r0-t2-attr.test.mjs checks it. This is attribution, not
// qualification: the bounds and the failed run's times are reported as
// recorded (r0-t2-attr-plan.mjs `workloads`), nothing here changes a
// bound, and no failed bound is called passing.
import { fitted, summarize } from './r0-t2-attr-stats.mjs';
import { armNames, minPairs, perfRun, rounds, warmups, workloads }
  from './r0-t2-attr-plan.mjs';

// The load-dependence screen, fixed before any run: |tau-b| of the
// verdict ratio against load above this (about the tabled two-sided 5%
// critical value of Kendall's tau for n = 12; a screen, not a test).
export const tauScreen = 0.45;

const assumptions = 'assuming the paired ratio failed/pre measured here'
  + ' carries over to the failed run\'s conditions, and T is that run\'s'
  + ' single sample';

export const readings = {
  passed: 'within its bound in the failed run (a control)',
  addedNotNecessary: 'the pre-tranche-2 compiler is estimated over the'
    + ` bound under the failed run's conditions too, ${assumptions}`,
  addedNecessary: 'the pre-tranche-2 compiler is estimated within the'
    + ` bound under the failed run's conditions, ${assumptions}`,
  undetermined: 'the estimate straddles the bound, or the ratio moves'
    + ` with load (see downgrade), ${assumptions}`,
  unmeasured: 'output problems or too few verdict pairs; no attribution'
};

export const existingReadings = {
  existingOverBound: 'the pre-tranche-2 compiler, at the lowest loads'
    + ' sampled and in the tests\' context, is over the bound already',
  loadOrUnreproducedNeeded: 'the pre-tranche-2 compiler, at the lowest'
    + ' loads sampled, is within the bound: load, or something this'
    + ' measurement does not reproduce, is needed to exceed it'
};

// Where x lies against the sampled range: below, within or above.
export const placeOf = (x, range) => range === null ? 'unsampled'
  : x < range.min ? 'below' : x > range.max ? 'above' : 'within';

const perfLoads = () => ({ before: perfRun.loadBefore,
  after: perfRun.loadAfter });

// Downgrades a not-passed verdict to undetermined when the ratio moves
// with load (protocol §7): |tau| over the screen; or, at a failed-run
// load that lies within the verdict pairs' sampled loads, the ratio's
// fit there would flip the verdict (addedNotNecessary when T / fitted
// is within the bound, addedNecessary when it is over). At a load
// outside the sampled range the fit is reported as extrapolated and
// the verdict is left alone. Returns the reasons and the fitted ratios.
export const downgradesOf = (base, observedMs, boundMs, againstLoad) => {
  const reasons = [];
  if (againstLoad.tau !== null && Math.abs(againstLoad.tau) > tauScreen)
    reasons.push(`|tau| ${Math.abs(againstLoad.tau).toFixed(3)} over `
      + `${tauScreen}`);
  const fittedAt = againstLoad.fit === null ? null : Object.fromEntries(
    Object.entries(perfLoads()).map(([when, load]) => {
      const ratio = fitted(againstLoad.fit, load);
      const place = placeOf(load, againstLoad.load);
      const flips = place === 'within' && ratio > 0
        && (base === 'addedNotNecessary' ? observedMs / ratio <= boundMs
          : base === 'addedNecessary' && observedMs / ratio > boundMs);
      if (flips)
        reasons.push(`fitted ratio ${ratio.toFixed(3)} at load ${load} `
          + `(${when}) gives T / fitted ${(observedMs / ratio).toFixed(0)}`
          + ` against the bound ${boundMs}`);
      return [when, { load, ratio, place,
        extrapolated: place !== 'within' }];
    }));
  return { reasons, fittedAt };
};

const baseVerdict = (observedMs, boundMs, preEquivalent) =>
  observedMs <= boundMs ? 'passed'
    : preEquivalent.low > boundMs ? 'addedNotNecessary'
      : preEquivalent.high <= boundMs ? 'addedNecessary' : 'undetermined';

// One workload's attribution, from its wall-time summary (protocol §7).
export const attribute = (workload, summary) => {
  const { observedMs: t, boundMs: b, measuredMs: m } = workload;
  const added = summary.wallMs.ratios.added;
  const low = summary.lowLoad;
  if (!summary.usable || added.median === undefined || low === null)
    return { verdict: 'unmeasured', reading: readings.unmeasured };
  const preEquivalent = { median: t / added.median, low: t / added.q3,
    high: t / added.q1 };
  const base = baseVerdict(t, b, preEquivalent);
  const screened = base === 'passed' || base === 'undetermined'
    ? { reasons: [], fittedAt: null }
    : downgradesOf(base, t, b, summary.addedAgainstLoad);
  const downgrade = screened.reasons;
  const verdict = downgrade.length === 0 ? base : 'undetermined';
  const existing = low.wallMs > b ? 'existingOverBound'
    : 'loadOrUnreproducedNeeded';
  const overrun = t <= b ? null : { overBound: t / b,
    remainder: t / (added.median * b),
    addedShare: Math.log(added.median) / Math.log(t / b),
    remainderShare: Math.log(t / (added.median * b)) / Math.log(t / b),
    note: 'log shares of log(T/B); the remainder is existing + load +'
      + ' unreproduced; a share can fall outside [0, 1]' };
  const fit = summary.sensitivity.pre.fit;
  const atLow = fit === null ? null : fitted(fit, low.load);
  const preLoad = summary.sensitivity.pre.load;
  const ratioLoad = summary.addedAgainstLoad.load;
  return { kind: 'attribution, not qualification', observedMs: t,
    boundMs: b, measuredMs: m, preEquivalent, baseVerdict: base, downgrade,
    fittedRatio: screened.fittedAt,
    verdict, reading: readings[verdict], existing,
    existingReading: existingReadings[existing], lowLoad: low, overrun,
    supporting: { total: t / m, existing: low.wallMs / m,
      added: added.median, residual: t / (added.median * low.wallMs) },
    loadPredicted: fit === null || !(atLow > 0) ? null
      : Object.fromEntries(Object.entries(perfLoads()).map(([when, load]) =>
        [when, { factor: fitted(fit, load) / atLow,
          place: placeOf(load, preLoad) }])),
    ratioPlaces: Object.fromEntries(Object.entries(perfLoads())
      .map(([when, load]) => [when, placeOf(load, ratioLoad)])),
    loadNote: 'correlational, conditional on the loads sampled '
      + `(${preLoad === null ? 'none' : `${preLoad.min}-${preLoad.max}`});`
      + ' no load was induced' };
};

// The measurement file: the header, each workload's statistics and
// attribution, and every sample, warm-ups included. `expected` maps a
// workload's name to the outcome every arm must give (the inputs').
export const attributionFile = (header, samples, expected,
  list = workloads, least = minPairs) => {
  const results = list.map(workload => {
    const summary = summarize(workload, samples, expected[workload.name],
      least);
    return { ...summary, attribution: attribute(workload, summary) };
  });
  return { protocol: 'docs/plans/2026-11-04-perf-attribution-protocol.md',
    ruling: 'dossier §18.161: attribute without an idle computer, retries'
      + ' for green or bound changes', kind: 'attribution, not'
      + ' qualification', header, perfRun,
    schedule: { warmups, rounds, arms: armNames, minPairs: least,
      order: 'Williams square of the four arms, each row three times' },
    usable: results.every(found => found.usable), workloads: results,
    samples };
};
