import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { armNames, orderOf, orders, parseWorkerOutput, permutations,
  preCommit, rounds, schedule, warmups, workloads }
  from '../scripts/r0-t2-attr-plan.mjs';
import { kendallTau, summarize, theilSen }
  from '../scripts/r0-t2-attr-stats.mjs';
import { attribute, attributionFile } from '../scripts/r0-t2-attr-file.mjs';
import { inputsOf, recipesOf } from '../scripts/r0-t2-attr-builds.mjs';
import { maxBuffer, runSample } from '../scripts/r0-t2-attr-run.mjs';
import { kinds } from '../scripts/r0-t2-attr-worker.mjs';
import { removalEdits, removeCollection }
  from '../scripts/r0-t2-trace-removal.mjs';
import { forms } from './fn-linear-sources.mjs';
import { changed, line, samplesOf } from './r0-t2-attr-samples.mjs';

// The pure parts of the perf attribution measurement
// (docs/plans/2026-11-04-perf-attribution-protocol.md): the schedule,
// the workloads' recorded figures, the worker line, the estimators,
// the attribution and its checks, one sample's recording with an
// injected spawn, the arms' recipes, the inputs and the linear kind's
// phase chaining. Fixture-level: no process is measured, no build made.

test('the schedule runs each order twice, each arm in each place 4 times',
  () => {
    assert.equal(orders.length, 6);
    assert.equal(new Set(orders.map(order => order.join())).size, 6);
    assert.deepEqual(orderOf(0), armNames);
    const order = schedule();
    assert.equal(order.length,
      (warmups + rounds) * workloads.length * armNames.length);
    for (const workload of workloads) {
      const own = order.filter(entry => entry.workload === workload.name
        && !entry.warmup);
      const byRound = Object.values(Object.groupBy(own,
        entry => entry.round)).map(group => group.map(entry => entry.arm));
      assert.equal(byRound.length, rounds);
      const counts = Object.groupBy(byRound, arms => arms.join());
      assert.ok(Object.values(counts).every(group => group.length === 2));
      for (const arm of armNames)
        for (let place = 0; place < armNames.length; place += 1)
          assert.equal(byRound.filter(arms => arms[place] === arm).length,
            4, `${workload.name} ${arm} ${place}`);
      for (const [a, b] of permutations(armNames).map(p => p.slice(0, 2)))
        assert.equal(byRound.filter(arms => arms.indexOf(a)
          < arms.indexOf(b)).length, 6, `${a} before ${b}`);
    }
  });

test('the bounds are the tests\' own and the failed run\'s figures', () => {
  const text = name => readFileSync(new URL(name, import.meta.url), 'utf8');
  const linear = text('fn-linear-timing.perf.test.mjs');
  const declared = /const measuredMs = (\{[^}]*\})/.exec(linear)[1]
    .replace(/(\w+):/g, '"$1":');
  const measured = JSON.parse(declared);
  for (const workload of workloads.filter(found => found.kind === 'linear'))
    assert.equal(workload.measuredMs, measured[workload.key], workload.name);
  assert.deepEqual(Object.keys(measured), Object.keys(forms));
  const scale = text('fn-scale.perf.test.mjs');
  for (const workload of workloads.filter(found => found.kind === 'scale')) {
    const at = scale.indexOf(`'${workload.title}'`);
    assert.ok(at > 0, workload.name);
    const bound = /3 \* (\d+)\);/.exec(scale.slice(at));
    assert.equal(Number(bound[1]), workload.measuredMs, workload.name);
  }
  assert.deepEqual(workloads.map(found => [found.boundMs, found.observedMs]),
    [[1200, 1359], [1620, 2331], [1545, 1336], [525, 335], [930, 1155],
      [675, 598], [1110, 1276], [750, 621], [3750, 1709], [1650, 1900]]);
  assert.equal(preCommit.length, 40);
});

test('a worker line is a measurement or a failure, never a zero', () => {
  assert.equal(parseWorkerOutput(`noise\n${line()}\n`).wallMs, 100);
  const bad = [line({ wallMs: -1 }), line({ threadCpuMs: null }),
    line({ involuntarySwitches: 1.5 }), line({ outcome: 3 }),
    line({ digest: 7 }), ''];
  for (const text of bad) assert.throws(() => parseWorkerOutput(text));
});

test('Theil-Sen and tau-b on known points', () => {
  const exact = [1, 2, 3, 4].map(x => ({ x, y: 2 * x + 1 }));
  assert.deepEqual(theilSen(exact), { slope: 2, intercept: 1, n: 4 });
  const outlier = [...exact, { x: 5, y: 1000 }];
  assert.equal(theilSen(outlier).slope, 2);
  assert.equal(theilSen([{ x: 1, y: 1 }, { x: 1, y: 2 }]), null);
  assert.equal(kendallTau(exact), 1);
  assert.equal(kendallTau(exact.map(({ x, y }) => ({ x, y: -y }))), -1);
  const tied = [[1, 1], [2, 1], [3, 2]].map(([x, y]) => ({ x, y }));
  assert.ok(Math.abs(kendallTau(tied) - 2 / Math.sqrt(6)) < 1e-12);
  assert.equal(kendallTau(exact.map(({ x }) => ({ x, y: 1 }))), null);
});

test('the paired ratios, the load fit and the low-load reference', () => {
  const [workload] = workloads;
  const summary = summarize(workload, samplesOf(), 'ok');
  assert.equal(summary.complete, true, summary.problems.join('; '));
  assert.equal(summary.triples, rounds);
  const { added, trace, rest } = summary.wallMs.ratios;
  assert.ok(Math.abs(added.median - 1.2) < 1e-9);
  assert.ok(Math.abs(trace.median - 1.1) < 1e-9);
  assert.ok(Math.abs(rest.median - 1.2 / 1.1) < 1e-9);
  assert.ok(Math.abs(summary.sensitivity.pre.fit.slope - 10) < 1e-9);
  assert.equal(summary.sensitivity.pre.tau, 1);
  assert.equal(summary.lowLoad.n, 4);
  assert.ok(Math.abs(summary.lowLoad.load - 2.25) < 1e-9);
  assert.ok(Math.abs(summary.offCpuMs.pre.median
    - summary.wallMs.arms.pre.median * 0.1) < 1e-9);
});

const attributed = (observedMs, boundMs, measuredMs = boundMs / 3,
  factor = 1.2) => {
  const workload = { ...workloads[0], observedMs, boundMs, measuredMs };
  return attribute(workload, summarize(workload, samplesOf({ factor }),
    'ok'));
};

test('the verdict compares the pre-equivalent time with the bound', () => {
  assert.equal(attributed(1000, 1200).verdict, 'passed');
  assert.equal(attributed(1500, 1200).verdict, 'loadSufficient');
  assert.equal(attributed(1300, 1200).verdict, 'addedNecessary');
  const varied = { ...workloads[0], observedMs: 1500, boundMs: 1200,
    measuredMs: 400 };
  const spreadOut = samplesOf({ factor: 1.2 }).map(sample =>
    sample.arm === 'head' && sample.round % 2 === 0 ? { ...sample,
      result: { ...sample.result, wallMs: sample.result.wallMs * 1.1 } }
      : sample);
  const straddling = attribute(varied, summarize(varied, spreadOut, 'ok'));
  assert.ok(straddling.preEquivalent.low <= 1200
    && straddling.preEquivalent.high > 1200);
  assert.equal(straddling.verdict, 'undetermined');
  assert.equal(attributed(1500, 1200, 400, 0.9).verdict, 'loadSufficient');
});

test('the factors multiply to the observed growth, failing bounds kept', () => {
  const found = attributed(1500, 1200, 400);
  const { total, existing, added, residual } = found.factors;
  assert.ok(Math.abs(existing * added * residual - total) < 1e-9);
  assert.equal(total, 1500 / 400);
  assert.equal(found.boundMs, 1200);
  assert.equal(found.overBound, 1.25);
  const shares = found.shares.existing + found.shares.added
    + found.shares.residual;
  assert.ok(Math.abs(shares - 1) < 1e-9);
  assert.ok(found.loadPredicted.after > found.loadPredicted.before);
  assert.equal(found.loadPredicted.extrapolated, false);
});

test('a failure, a wrong outcome or a changed output leaves it unmeasured',
  () => {
    const [workload] = workloads;
    const cases = [
      [sample => sample.round === 3 && sample.arm === 'pre',
        sample => ({ ...sample, result: undefined, failure: 'exit 1' }),
        /round 3 pre: exit 1/],
      [sample => sample.round === 4 && sample.arm === 'head',
        sample => ({ ...sample, result: { ...sample.result,
          outcome: 'E_TYPE' } }), /outcome E_TYPE, expected ok/],
      [sample => sample.round === 5 && sample.arm === 'uncollected',
        sample => ({ ...sample, result: { ...sample.result, digest: 'x' } }),
        /2 distinct outputs/]];
    for (const [pick, change, pattern] of cases) {
      const samples = changed(samplesOf(), pick, change);
      const summary = summarize(workload, samples, 'ok');
      assert.equal(summary.complete, false);
      assert.match(summary.problems.join('; '), pattern);
      assert.equal(attribute(workload, summary).verdict, 'unmeasured');
    }
    const file = attributionFile({}, samplesOf(), { [workload.name]: 'ok' },
      [workload]);
    assert.equal(file.complete, true);
    assert.equal(file.samples.length, (warmups + rounds) * 3);
  });

test('one sample: conditions kept, failures recorded, never retried', () => {
  const entry = { round: 1, warmup: false, workload: 'linear over',
    arm: 'pre' };
  const context = { buildOf: arm => `out-${arm}`, inputs: 'inputs.json',
    env: { PATH: '/bin' } };
  const quiet = () => ({ loadavg: [1], raw: { top: 'x' } });
  const spawned = [];
  const spawnOf = ran => (...args) => { spawned.push(args); return ran; };
  const ok = runSample(entry, context,
    spawnOf({ status: 0, stdout: line(), stderr: '' }), quiet);
  assert.equal(ok.sample.result.wallMs, 100);
  assert.equal(ok.sample.conditions.raw, undefined);
  assert.equal(ok.log.raw.top, 'x');
  assert.deepEqual(spawned[0][1].slice(1),
    ['out-pre', 'linear over', 'inputs.json']);
  assert.deepEqual([spawned[0][2].env, spawned[0][2].maxBuffer],
    [context.env, maxBuffer]);
  const outcomes = [[{ error: { code: 'ETIMEDOUT' } }, /^timed out/],
    [{ status: 1, stdout: '', stderr: 'boom' }, /^exit 1$/],
    [{ status: 0, stdout: 'garbage', stderr: '' }, /JSON/]];
  for (const [ran, pattern] of outcomes) {
    const { sample } = runSample(entry, context, spawnOf(ran), quiet);
    assert.match(sample.failure, pattern);
    assert.equal(sample.result, undefined);
  }
  assert.equal(spawned.length, 1 + outcomes.length);
});

test('the arms\' recipes and the inputs are the tests\' workloads',
  async () => {
    const recipes = recipesOf('abc');
    assert.deepEqual(Object.keys(recipes), armNames);
    assert.deepEqual(Object.values(recipes).map(found => found.commit),
      [preCommit, 'abc', 'abc']);
    assert.equal(recipes.uncollected.edit, removeCollection);
    assert.equal(recipes.uncollected.edits, removalEdits);
    assert.deepEqual([recipes.pre.edits, recipes.head.edits], [[], []]);
    const inputs = await inputsOf();
    assert.deepEqual(Object.keys(inputs.workloads),
      workloads.map(found => found.name));
    assert.equal(inputs.workloads['linear over'].source, forms.over(20000));
    assert.equal(inputs.workloads['linear mismatch'].expected, 'E_TYPE');
    assert.ok(Object.values(inputs.workloads).every(found =>
      found.source.length > 100000));
  });

test('the linear kind chains phases as throughSpecialize does', () => {
  class Right { constructor(value) { this.value0 = value; } }
  class Left { constructor(value) { this.value0 = value; } }
  const seen = [];
  const phase = name => value => {
    seen.push(name);
    return name === 'check' ? new Left(`${value}>${name}`)
      : new Right(`${value}>${name}`);
  };
  const state = { source: 's', Right, parse: source => new Right(source),
    phases: ['resolve', 'check', 'specialize'].map(phase),
    wire: value => ({ code: `E(${value})` }) };
  const result = kinds.linear.run(state);
  assert.deepEqual(seen, ['resolve', 'check']);
  assert.deepEqual(kinds.linear.outcome(state, result),
    { outcome: 'E(s>resolve>check)', digest: null });
  const accepted = { ...state, phases: [phase('resolve')] };
  assert.equal(kinds.linear.outcome(accepted, kinds.linear.run(accepted))
    .outcome, 'ok');
});
