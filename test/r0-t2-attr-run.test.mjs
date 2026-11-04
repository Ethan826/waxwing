import test from 'node:test';
import assert from 'node:assert/strict';
import { armNames, failedCommit, preCommit, workloadsOf }
  from '../scripts/r0-t2-attr-plan.mjs';
import { digestProblems, inputsOf, recipesOf }
  from '../scripts/r0-t2-attr-builds.mjs';
import { blockerPattern, blockers, maxBuffer, runSample, startCheck }
  from '../scripts/r0-t2-attr-run.mjs';
import { bracket, kinds, measure, sha }
  from '../scripts/r0-t2-attr-worker.mjs';
import { removalEdits, removeCollection }
  from '../scripts/r0-t2-trace-removal.mjs';
import { forms } from './fn-linear-sources.mjs';
import { chain, curried, generic } from './fn-scale-programs.mjs';
import { source as mixed } from './fn-scale-mixed.mjs';
import { line } from './r0-t2-attr-samples.mjs';

// The perf attribution measurement's driver, builds and worker
// (docs/plans/2026-11-04-perf-attribution-protocol.md), with injected
// spawn, clock and modules: no process is measured, no build made.

test('one sample: conditions kept, failures recorded, never retried', () => {
  const entry = { round: 1, warmup: false, file: 'scale', arm: 'failed' };
  const context = { buildOf: arm => `out-${arm}`, inputs: 'inputs.json',
    env: { PATH: '/bin' } };
  const quiet = () => ({ loadavg: [1], raw: { top: 'x' } });
  const spawned = [];
  const spawnOf = ran => (...args) => { spawned.push(args); return ran; };
  const ok = runSample(entry, context,
    spawnOf({ status: 0, stdout: line('scale'), stderr: '' }), quiet);
  assert.equal(ok.sample.result.entries['scale mixed'].wallMs, 100);
  assert.equal(ok.sample.conditions.raw, undefined);
  assert.equal(ok.log.raw.top, 'x');
  assert.deepEqual(spawned[0][1].slice(1),
    ['out-failed', 'scale', 'inputs.json']);
  assert.deepEqual([spawned[0][2].env, spawned[0][2].maxBuffer],
    [context.env, maxBuffer]);
  const outcomes = [[{ error: { code: 'ETIMEDOUT' } }, /^timed out/],
    [{ status: 1, stdout: '', stderr: 'boom' }, /^exit 1$/],
    [{ status: 0, stdout: 'garbage', stderr: '' }, /JSON/],
    [{ status: 0, stdout: line('linear'), stderr: '' }, /no scale mixed/]];
  for (const [ran, pattern] of outcomes) {
    const { sample } = runSample(entry, context, spawnOf(ran), quiet);
    assert.match(sample.failure, pattern);
    assert.equal(sample.result, undefined);
  }
  assert.equal(spawned.length, 1 + outcomes.length);
});

test('the driver refuses without the lock or beside another run', () => {
  const none = () => [];
  assert.throws(() => startCheck(undefined, () => true, none), /lock/);
  assert.throws(() => startCheck('/l', () => false, none), /lock/);
  assert.throws(() => startCheck('/l', () => true, () => ['12']), /12/);
  assert.equal(startCheck('/l', () => true, none), undefined);
  const pgrep = stdout => (command, args) => {
    assert.deepEqual([command, args], ['pgrep', ['-f', blockerPattern]]);
    return { status: stdout === '' ? 1 : 0, stdout };
  };
  assert.deepEqual(blockers(pgrep('7\n12\n'), 7), ['12']);
  assert.deepEqual(blockers(pgrep(''), 7), []);
  assert.throws(() => blockers(() => ({ status: 2, stdout: '' }), 7));
  const pattern = new RegExp(blockerPattern);
  assert.ok(pattern.test('node scripts/verify.mjs'));
  assert.ok(pattern.test('/opt/bin/node scripts/perf.mjs'));
  assert.ok(pattern.test('node scripts/r0-t2-perf-run.mjs /s --out x'));
  assert.ok(!pattern.test('zsh -c node scripts/verify.mjs'));
  assert.ok(!pattern.test('node scripts/perfx.mjs'));
});

test('four recipes; the scale digests must agree across arms', () => {
  const recipes = recipesOf('abc');
  assert.deepEqual(Object.keys(recipes), armNames);
  assert.deepEqual(Object.values(recipes).map(found => found.commit),
    [preCommit, failedCommit, 'abc', 'abc']);
  assert.equal(recipes.uncollected.edit, removeCollection);
  assert.equal(recipes.uncollected.edits, removalEdits);
  const same = Object.fromEntries(armNames.map(arm => [arm, { a: 'x' }]));
  assert.deepEqual(digestProblems(same), []);
  assert.deepEqual(digestProblems({ ...same, head: { a: 'y' } }),
    ['a: Go output differs across arms']);
});

test('the inputs are the tests\' sources, in the tests\' order', async () => {
  const { files } = await inputsOf();
  for (const file of ['linear', 'scale'])
    assert.deepEqual(files[file].map(entry => entry.name),
      workloadsOf(file).map(workload => workload.name));
  const source = name => files.linear.concat(files.scale)
    .find(entry => entry.name === name);
  assert.equal(source('linear over').source, forms.over(20000));
  assert.equal(source('linear mismatch').expected, 'E_TYPE');
  assert.equal(source('scale mixed').source, mixed);
  assert.equal(source('scale chain').source, chain(1000).source);
  assert.equal(source('scale curried').source, curried(1000).source);
  assert.equal(source('scale generic').source, generic(5000).source);
});

class Right { constructor(value) { this.value0 = value; } }
class Left { constructor(value) { this.value0 = value; } }

test('the kinds: phases as throughSpecialize, wire inside the bracket',
  () => {
    const seen = [];
    const phase = name => value => {
      seen.push(name);
      return name === 'check' ? new Left(`${value}>${name}`)
        : new Right(`${value}>${name}`);
    };
    const state = { Right, parse: text => new Right(text),
      phases: ['resolve', 'check', 'specialize'].map(phase),
      wire: value => { seen.push('wire'); return { code: `E(${value})` }; } };
    assert.equal(kinds.linear.run(state, 's'), 'E(s>resolve>check)');
    assert.deepEqual(seen, ['resolve', 'check', 'wire']);
    assert.equal(kinds.linear.run({ ...state, phases: [phase('resolve')] },
      's'), 'ok');
    const scale = { Right };
    assert.deepEqual(kinds.scale.outcome(scale, new Right('package main')),
      { outcome: 'ok', digest: sha('package main') });
    assert.equal(sha('a').length, 64);
    assert.deepEqual(kinds.scale.outcome(scale, new Left('e')),
      { outcome: 'compile rejected', digest: null });
  });

// A fake clock: every reading advances the counters by one tick, and
// `run` advances wall time by `runTicks`.
const fakeClock = () => {
  const now = { wall: 0n, cpu: 0, thread: 0, switches: 0 };
  return { now, wall: () => now.wall,
    cpu: () => ({ user: (now.cpu += 1000), system: 0 }),
    thread: () => ({ user: (now.thread += 500), system: 0 }),
    usage: () => ({ involuntaryContextSwitches: (now.switches += 1),
      voluntaryContextSwitches: 0, maxRSS: 2048 }) };
};

test('the bracket holds run alone; measure prepares once, in order',
  async () => {
    const clock = fakeClock();
    const order = [];
    const kind = { prepare: async () => { clock.now.wall += 10_000_000n;
      order.push('prepare'); return {}; },
    run: (state, source) => { clock.now.wall += 3_000_000n;
      order.push(source); return source; },
    outcome: (state, result) => { clock.now.wall += 7_000_000n;
      return { outcome: result, digest: null }; } };
    const one = bracket(kind, {}, 'a', clock);
    assert.equal(one.wallMs, 3);
    assert.deepEqual([one.cpuMs, one.threadCpuMs, one.involuntarySwitches],
      [1, 0.5, 1]);
    assert.equal(one.outcome, 'a');
    const all = await measure(kind, null, [{ name: 'x', source: 'p' },
      { name: 'y', source: 'q' }], clock);
    assert.deepEqual(order, ['a', 'prepare', 'p', 'q']);
    assert.deepEqual(Object.keys(all.entries), ['x', 'y']);
    assert.equal(all.entries.y.wallMs, 3);
    assert.equal(all.maxRssMiB, 2);
  });
