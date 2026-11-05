import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { armNames, failedCommit, orderOf, orders, parseWorkerOutput,
  preCommit, rounds, schedule, warmups, williams, workloads }
  from '../scripts/r0-t2-attr-plan.mjs';
import { kendallTau, summarize, theilSen }
  from '../scripts/r0-t2-attr-stats.mjs';
import { attribute, attributionFile, downgradesOf, placeOf, tauScreen }
  from '../scripts/r0-t2-attr-file.mjs';
import { forms } from './fn-linear-sources.mjs';
import { changed, line, samplesOf, withEntry }
  from './r0-t2-attr-samples.mjs';

// The pure parts of the perf attribution measurement
// (docs/plans/2026-11-04-perf-attribution-protocol.md): the schedule,
// the workloads' recorded figures, the worker line, the estimators and
// the attribution. Fixture-level: no process is measured, no build made.
// The driver, builds and worker: test/r0-t2-attr-run.test.mjs.

const adjacent = rows => rows.flatMap(row =>
  row.slice(1).map((arm, at) => `${row[at]}>${arm}`));

test('a Williams square: balanced places, first runs and carry-over', () => {
  for (const n of [4, 6]) {
    const square = williams(n);
    for (let place = 0; place < n; place += 1)
      assert.equal(new Set(square.map(row => row[place])).size, n);
    assert.equal(new Set(adjacent(square)).size, n * (n - 1));
  }
  assert.deepEqual(orderOf(0), orders[0]);
  const order = schedule();
  assert.equal(order.length, (warmups + rounds) * 2 * armNames.length);
  for (const file of ['linear', 'scale']) {
    const own = order.filter(entry => entry.file === file && !entry.warmup);
    const byRound = Object.values(Object.groupBy(own,
      entry => entry.round)).map(group => group.map(entry => entry.arm));
    assert.equal(byRound.length, rounds);
    const counts = Object.groupBy(byRound, arms => arms.join());
    assert.equal(Object.keys(counts).length, 4);
    assert.ok(Object.values(counts).every(group => group.length === 3));
    for (const arm of armNames)
      for (let place = 0; place < armNames.length; place += 1)
        assert.equal(byRound.filter(arms => arms[place] === arm).length, 3);
    for (const a of armNames)
      for (const b of armNames.filter(other => other !== a))
        assert.equal(byRound.filter(arms => arms.indexOf(a)
          < arms.indexOf(b)).length, 6, `${a} before ${b}`);
    const pairs = Object.groupBy(adjacent(byRound), pair => pair);
    assert.ok(Object.values(pairs).every(group => group.length === 3));
  }
});

test('the bounds are the tests\' own and the failed run\'s figures', () => {
  const text = name => readFileSync(new URL(name, import.meta.url), 'utf8');
  const declared = /const measuredMs = (\{[^}]*\})/
    .exec(text('fn-linear-timing.perf.test.mjs'))[1]
    .replace(/(\w+):/g, '"$1":');
  const measured = JSON.parse(declared);
  const linear = workloads.filter(found => found.file === 'linear');
  assert.deepEqual(linear.map(found => found.key), Object.keys(forms));
  assert.deepEqual(Object.keys(measured), Object.keys(forms));
  for (const workload of linear)
    assert.equal(workload.measuredMs, measured[workload.key]);
  const scale = text('fn-scale.perf.test.mjs');
  const titles = workloads.filter(found => found.file === 'scale')
    .map(workload => {
      const at = scale.indexOf(`'${workload.title}'`);
      assert.ok(at > 0, workload.name);
      const bound = /3 \* (\d+)\);/.exec(scale.slice(at));
      assert.equal(Number(bound[1]), workload.measuredMs, workload.name);
      return at;
    });
  assert.deepEqual(titles, [...titles].sort((a, b) => a - b));
  assert.deepEqual(workloads.map(found => [found.boundMs, found.observedMs]),
    [[1200, 1359], [1620, 2331], [1545, 1336], [525, 335], [930, 1155],
      [675, 598], [1110, 1276], [750, 621], [3750, 1709], [225, 140],
      [225, 123], [1650, 1900]]);
  assert.deepEqual([preCommit.length, failedCommit.length], [40, 40]);
});

test('a worker line is a measurement or a failure, never a zero', () => {
  const parsed = parseWorkerOutput(`noise\n${line('scale')}\n`, 'scale');
  assert.equal(parsed.entries['scale generic'].wallMs, 100);
  const partial = JSON.parse(line('scale'));
  delete partial.entries['scale chain'];
  const bad = [line('scale', { wallMs: -1 }),
    line('scale', { threadCpuMs: null }),
    line('scale', { involuntarySwitches: 1.5 }),
    line('scale', { outcome: 3 }), line('scale', { digest: 7 }),
    JSON.stringify(partial), line('linear'), ''];
  for (const text of bad)
    assert.throws(() => parseWorkerOutput(text, 'scale'));
});

test('Theil-Sen and tau-b on known points', () => {
  const exact = [1, 2, 3, 4].map(x => ({ x, y: 2 * x + 1 }));
  assert.deepEqual(theilSen(exact), { slope: 2, intercept: 1, n: 4 });
  assert.equal(theilSen([...exact, { x: 5, y: 1000 }]).slope, 2);
  assert.equal(theilSen([{ x: 1, y: 1 }, { x: 1, y: 2 }]), null);
  assert.equal(kendallTau(exact), 1);
  assert.equal(kendallTau(exact.map(({ x, y }) => ({ x, y: -y }))), -1);
  const tied = [[1, 1], [2, 1], [3, 2]].map(([x, y]) => ({ x, y }));
  assert.ok(Math.abs(kendallTau(tied) - 2 / Math.sqrt(6)) < 1e-12);
  assert.equal(kendallTau(exact.map(({ x }) => ({ x, y: 1 }))), null);
});

const near = (actual, wanted) => assert.ok(Math.abs(actual - wanted) < 1e-9,
  `${actual} is not ${wanted}`);
const [value] = workloads;

test('the paired ratios, the load fit and the low-load reference', () => {
  const summary = summarize(value, samplesOf(), 'ok');
  assert.equal(summary.usable, true);
  assert.equal(summary.verdictPairs, rounds);
  const { added, head, batch, trace, rest } = summary.wallMs.ratios;
  near(added.median, 1.2);
  near(head.median, 1.26);
  near(batch.median, 1.05);
  near(trace.median, 1.1);
  near(rest.median, 1.26 / 1.1);
  near(summary.sensitivity.pre.fit.slope, 10);
  assert.equal(summary.sensitivity.pre.tau, 1);
  assert.deepEqual([summary.lowLoad.n, summary.lowLoad.load], [4, 2.25]);
  near(summary.offCpuMs.pre.median, summary.wallMs.arms.pre.median * 0.1);
  assert.equal(summary.addedAgainstLoad.tau, null);
});

const attributed = (observedMs, boundMs, options = {}) => {
  const workload = { ...value, observedMs, boundMs, measuredMs: boundMs / 3 };
  return attribute(workload, summarize(workload, samplesOf(options), 'ok'));
};

test('the verdict: the pre-equivalent time against the bound', () => {
  assert.equal(attributed(1000, 1200).verdict, 'passed');
  assert.equal(attributed(1500, 1200).verdict, 'addedNotNecessary');
  assert.equal(attributed(1300, 1200).verdict, 'addedNecessary');
  const straddling = attributed(1500, 1200,
    { ratioOf: round => round % 2 === 0 ? 1.1 : 1 });
  assert.ok(straddling.preEquivalent.low <= 1200
    && straddling.preEquivalent.high > 1200);
  assert.equal(straddling.verdict, 'undetermined');
  assert.equal(attributed(1500, 1200, { factor: 0.9 }).verdict,
    'addedNotNecessary');
  assert.match(attributed(1500, 1200).reading, /single sample/);
  assert.equal(attributed(1500, 1200).kind, 'attribution, not qualification');
});

test('a ratio that moves with load downgrades the verdict', () => {
  const moving = attributed(1500, 1200,
    { factor: 1.0, ratioOf: round => 1 + round / 100 });
  assert.equal(moving.baseVerdict, 'addedNotNecessary');
  assert.equal(moving.verdict, 'undetermined');
  assert.match(moving.downgrade.join(), /\|tau\| 1\.000 over 0\.45/);
  assert.equal(tauScreen, 0.45);
});

test('the fit screen: in range only, and only where it flips the verdict',
  () => {
    const rising = { tau: 0.1, fit: { slope: 0.1, intercept: 1 } };
    const out = downgradesOf('addedNotNecessary', 1500, 1200,
      { ...rising, load: { min: 1.5, max: 3 } });
    assert.deepEqual(out.reasons, []);
    assert.deepEqual([out.fittedAt.before.place, out.fittedAt.after
      .extrapolated], ['above', true]);
    const within = { ...rising, load: { min: 4, max: 7 } };
    const flipped = downgradesOf('addedNotNecessary', 1500, 1200, within);
    assert.equal(flipped.reasons.length, 2);
    assert.match(flipped.reasons[0],
      /fitted ratio 1\.452 at load 4\.52 \(before\) gives T \/ fitted 1033/);
    const flat = load => ({ tau: 0, fit: { slope: 0, intercept: load },
      load: { min: 4, max: 7 } });
    assert.deepEqual(downgradesOf('addedNotNecessary', 1500, 1200,
      flat(1.2)).reasons, []);
    assert.equal(downgradesOf('addedNecessary', 1300, 1200, flat(1.0))
      .reasons.length, 2);
    assert.deepEqual(downgradesOf('addedNecessary', 1300, 1200, flat(1.2))
      .reasons, []);
    assert.deepEqual(downgradesOf('addedNecessary', 1300, 1200, within)
      .reasons, []);
    assert.equal(downgradesOf('addedNotNecessary', 1500, 1200,
      { ...flat(1.2), tau: -0.5 }).reasons.length, 1);
  });

test('the existing axis, the overrun split and the supporting factors',
  () => {
    const found = attributed(1500, 1200);
    assert.equal(found.existing, 'loadOrUnreproducedNeeded');
    assert.equal(attributed(150, 100).existing, 'existingOverBound');
    near(found.overrun.overBound, 1.25);
    near(found.overrun.addedShare, Math.log(1.2) / Math.log(1.25));
    near(found.overrun.addedShare + found.overrun.remainderShare, 1);
    near(found.overrun.remainder, 1500 / (1.2 * 1200));
    const { total, existing, added, residual } = found.supporting;
    near(existing * added * residual, total);
    assert.equal(found.boundMs, 1200);
    assert.ok(attributed(1500, 1200, { factor: 0.9 }).overrun.addedShare < 0);
    assert.ok(attributed(1300, 1200, { factor: 1.5 }).overrun.addedShare > 1);
    assert.equal(attributed(1000, 1200).overrun, null);
  });

test('extrapolation is flagged below and above the loads sampled', () => {
  assert.deepEqual([placeOf(1, { min: 2, max: 3 }), placeOf(2, { min: 2,
    max: 3 }), placeOf(4, { min: 2, max: 3 }), placeOf(1, null)],
  ['below', 'within', 'above', 'unsampled']);
  const within = attributed(1500, 1200);
  assert.deepEqual([within.loadPredicted.before.place,
    within.loadPredicted.after.place], ['within', 'within']);
  assert.ok(within.loadPredicted.after.factor
    > within.loadPredicted.before.factor);
  const low = attributed(1500, 1200, { loadOfRound: round => 1 + round / 10 });
  assert.equal(low.loadPredicted.after.place, 'above');
  assert.equal(low.ratioPlaces.before, 'above');
  const high = attributed(1500, 1200, { loadOfRound: round => 7 + round });
  assert.equal(high.loadPredicted.before.place, 'below');
  assert.match(high.loadNote, /correlational.*no load was induced/);
});

test('failures: listed, counted, an optional arm never voids', () => {
  const at = (rounds, arm) => sample => rounds.includes(sample.round)
    && sample.arm === arm;
  const fail = sample => ({ ...sample, result: undefined, failure: 'exit 1' });
  const optional = summarize(value, changed(samplesOf(), at([3], 'head'),
    fail), 'ok');
  assert.equal(optional.usable, true);
  assert.deepEqual(optional.failures, ['round 3 head: exit 1']);
  assert.equal(optional.wallMs.ratios.head.n, 11);
  const few = summarize(value, changed(samplesOf(), at([1, 2, 3, 4],
    'failed'), fail), 'ok');
  assert.deepEqual([few.usable, few.verdictPairs], [false, 8]);
  assert.equal(attribute(value, few).verdict, 'unmeasured');
  const enough = summarize(value, changed(samplesOf(), at([1, 2, 3],
    'pre'), fail), 'ok');
  assert.deepEqual([enough.usable, enough.verdictPairs], [true, 9]);
  const outputs = [[{ outcome: 'E_TYPE' }, /outcome E_TYPE, expected ok/],
    [{ digest: 'x' }, /2 distinct outputs/]];
  for (const [overrides, pattern] of outputs) {
    const summary = summarize(value, changed(samplesOf(), at([5],
      'uncollected'), sample => withEntry(sample, value.name, overrides)),
    'ok');
    assert.equal(summary.usable, false);
    assert.match(summary.outputProblems.join(), pattern);
  }
  const file = attributionFile({}, samplesOf(), { [value.name]: 'ok' },
    [value]);
  assert.equal(file.usable, true);
  assert.equal(file.samples.length, (warmups + rounds) * 4);
});
