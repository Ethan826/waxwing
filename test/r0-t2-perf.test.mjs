import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisons, denominatorsCheck, measurementFile, median, pairs,
  parseWorkerOutput, partFigure, schedule, sidesOf, spread, summarize,
  warmups }
  from '../scripts/r0-t2-perf-stats.mjs';
import { parseMemoryFree, parsePressure, parseSwap, parseTop,
  sampleConditions } from '../scripts/r0-t2-perf-conditions.mjs';
import { runSample } from '../scripts/r0-t2-perf-run.mjs';
import { evaluate } from './r0-t2-activation-gate.mjs';
import { met } from './r0-t2-activation-gate-met.mjs';

// The pure parts of the paired performance measurement
// (docs/plans/2026-11-04-performance-protocol.md): the schedule, the
// statistics, the worker line, the conditions parsers, one sample's
// recording with an injected spawn, and the measurement file read by
// the activation gate's criterion 6 itself. Fixture-level: no process
// is measured and no build is loaded.

test('the schedule is counterbalanced, warm-ups first, fixed', () => {
  const order = schedule();
  assert.equal(order.length, (warmups + pairs) * comparisons.length * 2);
  assert.deepEqual(order.slice(0, 4).map(entry => entry.arm),
    ['uncollected compile', 'collecting compile',
      'uncollected recheck', 'collecting recheck']);
  assert.ok(order.filter(entry => entry.warmup)
    .every(entry => entry.round < warmups));
  for (let at = 0; at < order.length; at += 2) {
    const [first, second] = [order[at], order[at + 1]];
    assert.equal(first.comparison, second.comparison);
    assert.equal(first.round, second.round);
    assert.deepEqual([first.side, second.side], sidesOf(first.round));
  }
  // Measured pairs per comparison: six with `with` first, six with
  // `without` first; the warm-up (round 0) runs `without` first.
  const firsts = order.filter((entry, at) => at % 2 === 0
    && entry.comparison === 'validator');
  const measured = firsts.filter(entry => !entry.warmup);
  assert.equal(measured.filter(entry => entry.side === 'with').length, 6);
  assert.equal(measured.filter(entry => entry.side === 'without').length,
    6);
  assert.equal(measured.length, 12);
  assert.equal(firsts[0].side, 'without');
  assert.equal(order[comparisons.length * 2].side, 'with');
});

test('median and Tukey hinges', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.deepEqual(spread([5, 1, 3]),
    { n: 3, median: 3, q1: 2, q3: 4, min: 1, max: 5 });
  assert.deepEqual(spread([4, 1, 3, 2]),
    { n: 4, median: 2.5, q1: 1.5, q3: 3.5, min: 1, max: 4 });
  assert.equal(spread([]), null);
});

const line = (overrides = {}) => JSON.stringify({ wallMs: 10, cpuMs: 9,
  userMs: 8, systemMs: 1, maxRssMiB: 400, counts: { declarations: 3 },
  ...overrides });

test('the worker line: the last line, every metric a measurement', () => {
  assert.equal(parseWorkerOutput(`noise\n${line()}\n`).cpuMs, 9);
  for (const bad of [{ cpuMs: -1 }, { wallMs: 'x' }, { maxRssMiB: null },
    { counts: { declarations: 1.5 } }])
    assert.throws(() => parseWorkerOutput(line(bad)), JSON.stringify(bad));
  assert.throws(() => parseWorkerOutput('\n'));
  assert.throws(() => parseWorkerOutput('not json'));
});

const pin = { 'effect pin': { candidates: 2832 },
  'corpus loader': { candidates: 2823 } };

test('the counts are checked against both denominators', () => {
  assert.equal(denominatorsCheck({ declarations: 3 }, pin), undefined);
  assert.equal(denominatorsCheck(
    { candidates: 2832, corpusCandidates: 2823 }, pin), true);
  assert.equal(denominatorsCheck(
    { candidates: 2832, corpusCandidates: 2822 }, pin), false);
});

// Synthetic samples: `with` costs `factor` times `without` in CPU and
// 1.1 times in memory, every round, warm-ups at ten times.
const samplesOf = (factor, count = pairs) => schedule(comparisons,
  warmups, count).map(entry => {
  const base = entry.warmup ? 10 : 100 + entry.round;
  const scale = entry.side === 'with' ? factor : 1;
  return { ...entry, conditions: { loadavg: [2, 2, 2], memoryFree: 30,
    pressure: 'warn' }, result: { wallMs: base * scale,
    cpuMs: base * scale, userMs: base, systemMs: 0,
    maxRssMiB: entry.side === 'with' ? 440 : 400, counts: {} } };
});

const header = { start: 'conditions [r0-t2-perf] commit abc',
  end: 'conditions [r0-t2-perf] commit abc' };

test('statistics: paired ratios over measured pairs only', () => {
  const found = summarize(comparisons[0], samplesOf(1.25));
  assert.equal(found.pairs, pairs);
  assert.equal(found.complete, true);
  assert.equal(found.cpuMs.ratio.median, 1.25);
  assert.equal(found.maxRssMiB.ratio.median, 1.1);
  assert.equal(found.maxRssMiB.difference.median, 40);
  assert.equal(found.cpuMs.without.min, 100 + warmups);
});

test('a failed sample leaves its comparison without a figure', () => {
  const samples = samplesOf(1.25);
  const at = samples.findIndex(sample => !sample.warmup
    && sample.comparison === 'validator');
  const { result, ...failed } = samples[at];
  samples[at] = { ...failed, failure: 'exit 1' };
  const file = measurementFile(header, samples);
  assert.equal(file.validator.compileTime.measured, null);
  assert.equal(file.readBack.compileTime.measured, 1.25);
  const checked = samplesOf(1.25).map(sample =>
    sample.comparison === 'validator' ? { ...sample, countsCheck: false }
      : sample);
  assert.equal(measurementFile(header, checked).validator.peakMemory
    .measured, null);
  assert.equal(partFigure([], 'cpuMs'), null);
});

const gateSix = file => {
  const evidence = met();
  evidence.files['perf.json'] = JSON.parse(JSON.stringify(file));
  return evaluate(evidence).find(found => found.id === 6);
};

test('the activation gate reads the measurement file', () => {
  const file = measurementFile(header, samplesOf(1.25));
  assert.equal(typeof file.conditions, 'string');
  assert.equal(gateSix(file).met, true, gateSix(file).state.join('\n'));
  assert.equal(gateSix(measurementFile(header, samplesOf(3))).met, false);
  const samples = samplesOf(1.25);
  samples[samples.length - 1] = { ...samples[samples.length - 1],
    result: undefined, failure: 'timed out' };
  assert.equal(gateSix(measurementFile(header, samples)).met, false);
});

test('conditions parsers', () => {
  const ps = ' 87798 416.7 604784 purs\n  358  50.4 1020880 /S/fseventsd\n'
    + '  1 0.0 10 launchd\n';
  assert.deepEqual(parseTop(ps, 2), [
    { pid: 87798, cpuPercent: 416.7, rssMiB: 591, command: 'purs' },
    { pid: 358, cpuPercent: 50.4, rssMiB: 997, command: 'fseventsd' }]);
  assert.equal(parseMemoryFree('31\n'), 31);
  assert.match(parseMemoryFree('101'), /^unavailable/);
  assert.equal(parsePressure('2\n'), 'warn');
  assert.match(parsePressure('3'), /^unavailable/);
  assert.deepEqual(parseSwap('total = 16384.00M  used = 15866.50M  free '
    + '= 517.50M  (encrypted)'),
  { totalMiB: 16384, usedMiB: 15866.5, freeMiB: 517.5 });
  assert.match(parseSwap('nothing'), /^unavailable/);
});

test('conditions are recorded even when a command fails', () => {
  const machine = { loadavg: () => [1.234, 2, 3],
    now: () => new Date('2026-11-04T00:00:00Z'),
    run: command => command === 'ps' ? { error: 'timed out' }
      : { status: 0, stdout: '2\n' } };
  const found = sampleConditions(machine);
  assert.deepEqual(found.loadavg, [1.23, 2, 3]);
  assert.match(found.top, /^unavailable \(timed out\)/);
  assert.equal(found.pressure, 'warn');
  assert.equal(found.raw.top, 'timed out');
});

test('one sample: run once, every outcome kept', () => {
  const entry = schedule()[0];
  const quiet = () => ({ loadavg: [1, 1, 1], raw: { top: 'x' } });
  const spawned = [];
  const spawnOf = ran => (...args) => { spawned.push(args); return ran; };
  const ok = runSample(entry, () => 'out', pin,
    spawnOf({ status: 0, stdout: line(), stderr: '' }), quiet);
  assert.equal(ok.sample.result.cpuMs, 9);
  assert.equal(ok.sample.conditions.raw, undefined);
  assert.equal(ok.log.raw.top, 'x');
  const outcomes = [[{ error: { code: 'ETIMEDOUT' } }, /^timed out/],
    [{ status: 1, stdout: '', stderr: 'boom' }, /^exit 1$/],
    [{ status: 0, stdout: 'garbage', stderr: '' }, /JSON/]];
  for (const [ran, pattern] of outcomes) {
    const { sample } = runSample(entry, () => 'out', pin, spawnOf(ran),
      quiet);
    assert.match(sample.failure, pattern);
    assert.equal(sample.result, undefined);
  }
  assert.equal(spawned.length, 1 + outcomes.length);
  assert.equal(spawned[0][1][2], entry.arm);
});
