import test from 'node:test';
import assert from 'node:assert/strict';
import { commitOf, conditionsLine, hostFacts, loadOf, powerOf }
  from '../scripts/verify-conditions.mjs';

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
  assert.equal(line.match(/unavailable/g).length, 3);
  assert.ok(line.includes('2026-10-29T12:00:00.000Z'));
});

test('the real host gives a line with all four fields', () => {
  assert.match(conditionsLine('regression', hostFacts),
    /^conditions \[regression\] commit \S+ time \S+ load1 \S+ power /);
});
