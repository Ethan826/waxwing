import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { commitOf, commandTimeoutMs, conditionsLine, hostFacts, loadOf,
  makeRunner, powerOf, untrackedOf } from '../scripts/verify-conditions.mjs';
import { concurrencyVariable, memoryFreeOf, parallelTestArgs, scheduleLine,
  testConcurrency } from '../scripts/verify-schedule.mjs';

const fixedTime = new Date('2026-10-29T12:00:00.000Z');
const ok = stdout => ({ status: 0, stdout });
const host = (overrides = {}) => ({
  platform: 'darwin',
  loadavg: () => [1.5, 1, 1],
  run: command => command === 'git'
    ? ok('abc1234\n') : ok("Now drawing from 'AC Power'\n -Internal"),
  readText: () => { throw new Error('unused'); },
  listDirectory: () => { throw new Error('unused'); },
  now: () => fixedTime,
  ...overrides
});

test('every value present on darwin', () => {
  assert.equal(conditionsLine('parallel', host()),
    'conditions [parallel] commit abc1234 time 2026-10-29T12:00:00.000Z'
    + " load1 1.50 power AC Power");
});

test('battery power on darwin is read from pmset', () => {
  const battery = host({ run: command => command === 'git'
    ? ok('abc1234\n') : ok("Now drawing from 'Battery Power'\n") });
  assert.equal(powerOf(battery), 'Battery Power');
});

test('commit unavailable when git fails or is missing', () => {
  assert.match(commitOf(host({ run: () => ({ error: 'spawn git ENOENT' }) })),
    /^unavailable \(spawn git ENOENT\)$/);
  assert.match(commitOf(host({ run: () => ({ status: 128, stdout: '' }) })),
    /^unavailable \(git exited 128\)$/);
});

test('load is unavailable on win32 and for non-numbers', () => {
  assert.match(loadOf(host({ platform: 'win32', loadavg: () => [0, 0, 0] })),
    /^unavailable \(.*win32\)$/);
  assert.match(loadOf(host({ loadavg: () => [Number.NaN] })),
    /^unavailable/);
  assert.equal(loadOf(host({ platform: 'linux', loadavg: () => [0, 0, 0] })),
    '0.00');
});

test('darwin power is unavailable when pmset fails or is unrecognized', () => {
  assert.match(powerOf(host({ run: () => ({ error: 'spawn pmset ENOENT' }) })),
    /^unavailable \(spawn pmset ENOENT\)$/);
  assert.match(powerOf(host({ run: () => ok('garbage') })),
    /^unavailable \(pmset output not recognized\)$/);
  assert.match(powerOf(host({ run: () => ({ status: 1, stdout:
    "Now drawing from 'AC Power'" }) })), /^unavailable/);
});

const supplies = table => ({
  platform: 'linux',
  listDirectory: () => Object.keys(table),
  readText: file => {
    const found = table[file.split('/')[4]]?.[file.split('/')[5]];
    if (found === undefined) throw new Error(`no ${file}`);
    return `${found}\n`;
  }
});

test('linux power comes from /sys/class/power_supply', () => {
  assert.equal(powerOf(host(supplies({ AC: { type: 'Mains', online: '1' },
    BAT0: { type: 'Battery' } }))), 'AC Power');
  assert.equal(powerOf(host(supplies({ AC: { type: 'Mains', online: '0' },
    BAT0: { type: 'Battery' } }))), 'Battery Power');
});

test('linux power is unavailable without a mains supply or directory', () => {
  assert.match(powerOf(host(supplies({ BAT0: { type: 'Battery' } }))),
    /^unavailable \(no mains supply/);
  assert.match(powerOf(host({ platform: 'linux', listDirectory: () => {
    throw new Error('ENOENT'); } })), /^unavailable \(cannot read /);
});

test('other platforms have no power reader', () => {
  assert.match(powerOf(host({ platform: 'win32' })),
    /^unavailable \(no power source reader for win32\)$/);
  const line = conditionsLine('serial', host({ platform: 'win32',
    loadavg: () => [0, 0, 0], run: () => ({ error: 'no git' }) }));
  assert.equal(line.match(/unavailable/g).length, 4);
  assert.ok(line.includes('2026-10-29T12:00:00.000Z'));
});

test('the real host gives a line with all four fields', () => {
  assert.match(conditionsLine('regression', hostFacts),
    /^conditions \[regression\] commit \S+ time \S+ load1 \S+ power /);
});

const git = table => host({ run: (command, args) => command !== 'git'
  ? ok("Now drawing from 'AC Power'") : ok(table[args[0]]) });

test('commit identity carries tracked-change state', () => {
  assert.equal(commitOf(git({ describe: 'abc1234\n' })), 'abc1234');
  assert.equal(commitOf(git({ describe: 'abc1234-dirty\n' })),
    'abc1234-dirty');
});

test('untracked files are counted, with executable paths named', () => {
  const clean = git({ status: '' });
  assert.equal(untrackedOf(clean), '');
  assert.equal(untrackedOf(git({ status: ' M src/a.purs\n' })), '');
  const some = git({ status: '?? docs/x.md\n?? test/a.mjs\n'
    + '?? scripts/b.mjs\n?? tools/c.mjs\n?? src/d.purs\n M src/e.purs\n' });
  assert.equal(untrackedOf(some), ' untracked 5 (test/a.mjs, scripts/b.mjs,'
    + ' tools/c.mjs)');
  assert.equal(untrackedOf(git({ status: '?? notes.txt\n' })),
    ' untracked 1');
  assert.match(conditionsLine('p', git({ describe: 'abc1234\n',
    status: '?? test/a.mjs\n' })),
    / power AC Power untracked 1 \(test\/a\.mjs\)$/);
});

test('a failing status call is reported, not read as clean', () => {
  assert.equal(untrackedOf(host({ run: () => ({ error: 'timed out' }) })),
    ' untracked unavailable (timed out)');
  assert.match(untrackedOf(host({ run: () => ({ status: 128, stdout: '' }) })),
    /unavailable \(git exited 128\)/);
});

test('a timed-out command is reported as such by injection', () => {
  const seen = [];
  const run = makeRunner((command, args, options) => {
    seen.push(options.timeout);
    return { error: Object.assign(new Error('spawnSync git ETIMEDOUT'),
      { code: 'ETIMEDOUT' }) };
  });
  assert.deepEqual(run('git', []), { error: 'timed out' });
  assert.deepEqual(seen, [commandTimeoutMs]);
  assert.match(commitOf(host({ run })), /^unavailable \(timed out\)$/);
  assert.match(powerOf(host({ run })), /^unavailable \(timed out\)$/);
  const failed = makeRunner(() => ({ error: new Error('spawn git ENOENT') }));
  assert.deepEqual(failed('git', []), { error: 'spawn git ENOENT' });
});

const scheduled = (env, overrides = {}) => scheduleLine('parallel', env,
  host({ run: () => ok('System-wide memory free percentage: 46%\n'),
    ...overrides }));

test('the test concurrency is read strictly from its variable', () => {
  assert.equal(concurrencyVariable, 'WAXWING_VERIFY_TEST_CONCURRENCY');
  assert.equal(testConcurrency({}), undefined);
  assert.equal(testConcurrency({ [concurrencyVariable]: '' }), undefined);
  assert.equal(testConcurrency({ [concurrencyVariable]: '2' }), 2);
  for (const bad of ['0', '-1', '1.5', '2.0', '0x2', ' 2', '2 ', '1e1', 'x'])
    assert.throws(() => testConcurrency({ [concurrencyVariable]: bad }),
      /WAXWING_VERIFY_TEST_CONCURRENCY must be a positive integer/, bad);
});

test('the concurrency changes the schedule, never the files', () => {
  const files = ['test/a.test.mjs', 'test/b.test.mjs'];
  assert.deepEqual(parallelTestArgs(files, undefined), ['--test', ...files]);
  assert.deepEqual(parallelTestArgs(files, 2),
    ['--test', '--test-concurrency=2', ...files]);
});

test('verify schedules its parallel phase through the setting', () => {
  const source = readFileSync('scripts/verify.mjs', 'utf8');
  assert.ok(source.includes('parallelTestArgs(tests, concurrency)'));
  assert.ok(!source.includes("['--test', ...tests]"));
  assert.ok(source.indexOf('testConcurrency()')
    < source.indexOf("run('purs-tidy'"), 'validated before any work');
  for (const phase of ['parallel', 'serial', 'regression'])
    assert.ok(source.includes(`scheduleLine('${phase}'`), phase);
});

test('the schedule line records concurrency and memory', () => {
  assert.equal(scheduled({ [concurrencyVariable]: '2',
    WAXWING_REGRESSION_JOBS: '1' }), 'schedule [parallel] test-files 2'
    + ' regression-jobs 1 memory-free 46%');
  assert.match(scheduled({ WAXWING_REGRESSION_JOBS: '3' }),
    / test-files node-default regression-jobs 3 /);
});

test('memory is unavailable rather than guessed', () => {
  assert.equal(memoryFreeOf(host({ run: () => ({ error: 'timed out' }) })),
    'unavailable (timed out)');
  assert.equal(memoryFreeOf(host({ run: () => ok('garbage') })),
    'unavailable (memory_pressure output not recognized)');
  assert.equal(memoryFreeOf(host({ run: () => ({ status: 1, stdout:
    'System-wide memory free percentage: 46%' }) })),
    'unavailable (memory_pressure output not recognized)');
  assert.equal(memoryFreeOf(host({ platform: 'linux' })),
    'unavailable (no memory reader for linux)');
});

test('the real host gives a schedule line', () => {
  assert.match(scheduleLine('serial', {}, hostFacts),
    /^schedule \[serial\] test-files node-default regression-jobs \d+ /);
});
