import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { perfFiles, runPerf, splitTestNames, switchedOff }
  from '../scripts/perf.mjs';

// scripts/perf.mjs: every file runs after a failure, each failure is
// reported, the exit status is 1, nothing retries. The fixtures under
// test/fixtures/perf are one passing, one failing and one passing file.
const fixtures = 'test/fixtures/perf';

test('perf runs every file after a failure and exits 1', () => {
  // Under `node --test` the environment makes a nested `node --test` report
  // as a subtest, so the child runs as a top-level run.
  const { NODE_TEST_CONTEXT: unused, ...env } = process.env;
  const run = spawnSync('node', ['scripts/perf.mjs', '--dir', fixtures],
    { encoding: 'utf8', env });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /^conditions \[perf\]/);
  const order = ['a', 'b', 'c'].map(name =>
    run.stdout.indexOf(`perf: ${fixtures}/${name}.perf.test.mjs`));
  assert.ok(order.every(at => at >= 0) && order[0] < order[1]
    && order[1] < order[2], 'all three files ran, in order');
  assert.match(run.stdout, /FAILED test\/fixtures\/perf\/b\.perf/);
  assert.match(run.stdout, /2 of 3 files passed/);
});

test('perf attempts each file once, with no retry', () => {
  const seen = [];
  const failed = runPerf(['x', 'y', 'z'], file => {
    seen.push(file);
    return file === 'y' ? 1 : 0;
  }, () => {});
  assert.deepEqual(seen, ['x', 'y', 'z']);
  assert.deepEqual(failed, ['y']);
});

test('a timed-out file is a failure and the run continues', () => {
  const seen = [];
  const failed = runPerf(['x', 'y'], file => {
    seen.push(file);
    return file === 'x' ? 'timed out' : 0;
  }, () => {});
  assert.deepEqual(seen, ['x', 'y']);
  assert.deepEqual(failed, ['x']);
});

test('a skipped, todo or only test in a perf file is a failure', () => {
  // Assembled, so the repository's disabled-test scan does not see them.
  const off = word => `${word}('a', () => {});`;
  const options = word => `test('a', { ${word}: true }, () => {});`;
  for (const text of [off(['test', 'skip'].join('.')),
    off(['it', 'todo'].join('.')), options('skip'),
    off(['describe', 'only'].join('.'))])
    assert.equal(switchedOff(text), true, text);
  assert.equal(switchedOff("test('a', () => {});"), false);
  const texts = { x: off(['test', 'skip'].join('.')),
    y: 'test("b", () => {});' };
  const lines = [];
  const failed = runPerf(['x', 'y'], () => 0, line => lines.push(line),
    file => texts[file]);
  assert.deepEqual(failed, ['x']);
  assert.ok(lines.some(line => line.includes('switched-off test')));
  for (const file of perfFiles('test'))
    assert.equal(switchedOff(readFileSync(file, 'utf8')), false, file);
});

test('perf and verify split file names by suffix', () => {
  const names = ['a.test.mjs', 'b.serial.test.mjs', 'c.perf.test.mjs',
    'd.mjs', 'e.perf.mjs'];
  assert.deepEqual(splitTestNames(names), { perf: ['c.perf.test.mjs'],
    routine: ['a.test.mjs', 'b.serial.test.mjs'] });
  assert.deepEqual(perfFiles(fixtures).map(file => file.slice(fixtures.length
    + 1)), ['a.perf.test.mjs', 'b.perf.test.mjs', 'c.perf.test.mjs']);
});
