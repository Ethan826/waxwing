import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisons, denominatorsCheck, median, pairs, parseWorkerOutput,
  schedule, sidesOf, spread, summarize, warmups }
  from '../scripts/r0-t2-perf-stats.mjs';
import { ceilingOf, measurementFile, partFigure }
  from '../scripts/r0-t2-perf-file.mjs';
import { parseMemoryFree, parsePower, parsePressure, parseSwap,
  parseThermal, parseTop, sampleConditions }
  from '../scripts/r0-t2-perf-conditions.mjs';
import { dirtyPaths } from '../scripts/r0-t2-perf-builds.mjs';
import { maxBuffer, runSample } from '../scripts/r0-t2-perf-run.mjs';
import { arms } from '../scripts/r0-t2-perf-worker.mjs';
import { evaluate } from './r0-t2-activation-gate.mjs';
import { changed, header, line, pin, samplesOf }
  from './r0-t2-perf-samples.mjs';
import { met } from './r0-t2-activation-gate-met.mjs';

// The pure parts of the paired performance measurement
// (docs/plans/2026-11-04-performance-protocol.md): the schedule, the
// statistics and their checks, the worker line, the conditions parsers,
// the clean-tree rule, one sample's recording with an injected spawn,
// and the measurement file read by the activation gate's criterion 6
// itself. Fixture-level: no process is measured and no build is loaded.

test('the schedule is counterbalanced, 6 and 6 in every comparison', () => {
  const order = schedule();
  assert.equal(order.length, (warmups + pairs) * comparisons.length * 2);
  assert.deepEqual(order.slice(0, 2).map(entry => [entry.arm, entry.build]),
    [['compile', 'uncollected'], ['compile', 'collecting']]);
  for (let at = 0; at < order.length; at += 2) {
    const [first, second] = [order[at], order[at + 1]];
    assert.equal(first.comparison, second.comparison);
    assert.equal(first.round, second.round);
    assert.deepEqual([first.side, second.side], sidesOf(first.round));
  }
  for (const { name } of comparisons) {
    const firsts = order.filter((entry, at) => at % 2 === 0
      && entry.comparison === name);
    const measured = firsts.filter(entry => !entry.warmup);
    assert.equal(measured.length, 12, name);
    for (const side of ['with', 'without'])
      assert.equal(measured.filter(entry => entry.side === side).length, 6,
        `${name} ${side}`);
    assert.equal(firsts[0].side, 'without', name);
  }
});

test('the comparisons name the worker\'s arms and the two builds', () => {
  const used = comparisons.flatMap(found => [found.without, found.with]);
  assert.ok(used.every(side => side.arm in arms), JSON.stringify(used));
  assert.deepEqual([...new Set(used.map(side => side.arm))].sort(),
    Object.keys(arms).sort());
  assert.ok(used.every(side =>
    ['collecting', 'uncollected'].includes(side.build)));
  assert.deepEqual(comparisons.filter(found =>
    found.with.build !== found.without.build).map(found => found.name),
  ['traceCompile', 'traceRecheck']);
});

test('median, Tukey hinges and the proposal\'s rounding', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.deepEqual(spread([5, 1, 3]),
    { n: 3, median: 3, q1: 2, q3: 4, min: 1, max: 5 });
  assert.deepEqual(spread([4, 1, 3, 2]),
    { n: 4, median: 2.5, q1: 1.5, q3: 3.5, min: 1, max: 4 });
  assert.equal(spread([]), null);
  assert.deepEqual([1.15, 1.151, 1.2, 1.0, 0.999, 1.3 - 1e-12]
    .map(ceilingOf), [1.15, 1.2, 1.2, 1, 1, 1.3]);
});

test('the worker line: the last line, every metric a measurement', () => {
  assert.equal(parseWorkerOutput(`noise\n${line()}\n`).cpuMs, 9);
  for (const bad of [{ cpuMs: -1 }, { wallMs: 'x' }, { maxRssMiB: null },
    { maxRssAfterPrepareMiB: undefined }, { heapUsedAfterMiB: -1 },
    { counts: { declarations: 1.5 } }])
    assert.throws(() => parseWorkerOutput(line(bad)), JSON.stringify(bad));
  assert.throws(() => parseWorkerOutput('\n'));
  assert.throws(() => parseWorkerOutput('not json'));
});

test('the counts are checked against both denominators', () => {
  assert.equal(denominatorsCheck({ declarations: 3 }, pin), undefined);
  assert.equal(denominatorsCheck(
    { candidates: 2832, corpusCandidates: 2823 }, pin), true);
  assert.equal(denominatorsCheck(
    { candidates: 2832, corpusCandidates: 2822 }, pin), false);
});

test('statistics: paired ratios and increments over measured pairs', () => {
  const found = summarize(comparisons[0], samplesOf(1.25));
  assert.deepEqual([found.pairs, found.complete], [pairs, true]);
  assert.equal(found.cpuMs.ratio.median, 1.25);
  assert.equal(found.maxRssMiB.ratio.median, 1.1);
  assert.equal(found.maxRssMiB.difference.median, 40);
  assert.equal(found.cpuMs.without.min, 100 + warmups);
  assert.equal(found.runRssIncrementMiB.with.median, 5);
  assert.equal(found.heapIncrementMiB.difference.median, 0);
});

test('pair checks: builds, counts, the validator\'s accepted', () => {
  const sameBuild = changed(samplesOf(1.25), 'traceCompile', sample =>
    ({ ...sample, buildDir: 'one' }));
  assert.match(summarize(comparisons[0], sameBuild).problems[0],
    /builds equal/);
  const split = changed(samplesOf(1.25), 'onlineReadBack', sample =>
    ({ ...sample, buildDir: sample.side }));
  assert.match(summarize(comparisons[2], split).problems[0],
    /builds differ/);
  const count = (key, name) => changed(samplesOf(1.25), name, sample =>
    sample.side === 'with' ? { ...sample, result: { ...sample.result,
      counts: { n: 1, [key]: 2 } } } : { ...sample, result: {
      ...sample.result, counts: { n: 1, [key]: 1 } } });
  assert.equal(summarize(comparisons[3], count('accepted', 'validator'))
    .complete, true);
  assert.equal(summarize(comparisons[3], count('honest', 'validator'))
    .complete, false);
  assert.equal(summarize(comparisons[2], count('accepted',
    'onlineReadBack')).complete, false);
});

test('a failed or mis-counted sample leaves no figure', () => {
  const samples = samplesOf(1.25);
  const at = samples.findIndex(sample => !sample.warmup
    && sample.comparison === 'validator');
  const { result: dropped, ...failed } = samples[at];
  samples[at] = { ...failed, failure: 'exit 1' };
  const file = measurementFile(header, samples);
  assert.equal(file.validator.compileTime.measured, null);
  assert.equal(file.readBack.compileTime.measured, 1.25);
  assert.equal(file.readBack.figures.traceRecheck.compileTime.median, 1.25);
  for (const name of ['validator', 'onlineReadBack']) {
    const part = name === 'validator' ? 'validator' : 'readBack';
    const checked = changed(samplesOf(1.25), name, sample =>
      sample.side === 'with' ? { ...sample, countsCheck: false } : sample);
    assert.equal(measurementFile(header, checked)[part].peakMemory
      .measured, null, name);
  }
  assert.equal(partFigure([], 'cpuMs'), null);
});

const keysOf = value => value === null || typeof value !== 'object' ? []
  : Object.entries(value).flatMap(([key, inner]) =>
    [key, ...keysOf(inner)]);
const gateSix = file => {
  const evidence = met();
  evidence.files['perf.json'] = JSON.parse(JSON.stringify(file));
  return evaluate(evidence).find(found => found.id === 6);
};

test('the activation gate reads the file; it holds no budget', () => {
  const file = measurementFile(header, samplesOf(1.25));
  assert.equal(typeof file.conditions, 'string');
  assert.match(file.conditions, /power AC Power 100%/);
  assert.ok(!keysOf(file).some(key => /budget/i.test(key)));
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
  assert.equal(parsePower('Now drawing from \'AC Power\'\n -Internal'
    + 'Battery-0 (id=1)\t100%; charged;'), 'AC Power 100%');
  assert.match(parsePower(''), /^unavailable/);
  assert.deepEqual(parseThermal('Note: No thermal warning level has been '
    + 'recorded\n'), { lines: ['Note: No thermal warning level has been '
    + 'recorded'], cpuSpeedLimit: null });
  assert.equal(parseThermal('CPU_Speed_Limit \t= 80').cpuSpeedLimit, 80);
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

test('the tree to measure: tracked changes and routine untracked', () => {
  assert.deepEqual(dirtyPaths(' M src/A.purs\n?? docs/writing/x.md\n'
    + '?? test/new.mjs\n?? scripts/a.mjs\n?? src/B.purs\nA  docs/p.md\n'),
  [' M src/A.purs', '?? test/new.mjs', '?? scripts/a.mjs', '?? src/B.purs',
    'A  docs/p.md']);
  assert.deepEqual(dirtyPaths('?? docs/writing/x.md\n\n'), []);
});

test('one sample: run once, every outcome kept', () => {
  const entry = schedule()[0];
  const quiet = () => ({ loadavg: [1, 1, 1], raw: { top: 'x' } });
  const context = { buildOf: build => `out-${build}`, pin,
    inputs: 'inputs.json', env: { NODE_OPTIONS: 'x' } };
  const spawned = [];
  const spawnOf = ran => (...args) => { spawned.push(args); return ran; };
  const ok = runSample(entry, context,
    spawnOf({ status: 0, stdout: line(), stderr: '' }), quiet);
  assert.equal(ok.sample.result.cpuMs, 9);
  assert.equal(ok.sample.buildDir, 'out-uncollected');
  assert.equal(ok.sample.conditions.raw, undefined);
  assert.equal(ok.log.raw.top, 'x');
  assert.deepEqual(spawned[0][1].slice(1),
    ['out-uncollected', 'compile', 'inputs.json']);
  assert.deepEqual([spawned[0][2].env, spawned[0][2].maxBuffer],
    [context.env, maxBuffer]);
  const miscounted = runSample(entry, context, spawnOf({ status: 0,
    stdout: line({ counts: { candidates: 2831, corpusCandidates: 2823 } }),
    stderr: '' }), quiet);
  assert.equal(miscounted.sample.countsCheck, false);
  const outcomes = [[{ error: { code: 'ETIMEDOUT' } }, /^timed out/],
    [{ status: 1, stdout: '', stderr: 'boom' }, /^exit 1$/],
    [{ status: 0, stdout: 'garbage', stderr: '' }, /JSON/]];
  for (const [ran, pattern] of outcomes) {
    const { sample } = runSample(entry, context, spawnOf(ran), quiet);
    assert.match(sample.failure, pattern);
    assert.equal(sample.result, undefined);
  }
  assert.equal(spawned.length, 2 + outcomes.length);
});
