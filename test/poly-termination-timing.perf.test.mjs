// Absolute time bounds moved out of poly-termination.test.mjs. They run
// only under `npm run perf` (scripts/perf.mjs); the routine half is
// poly-termination-timing.serial.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from './poly-termination-support.mjs';

const longest = 20000;
const secondsLimit = 5;
const timed = work => {
  const started = performance.now();
  const result = work();
  const seconds = (performance.now() - started) / 1000;
  assert.ok(seconds < secondsLimit, `took ${seconds} s`);
  return result;
};

test('components are stack-safe on a 20,000-node chain and cycle', () => {
  const chain = Array.from({ length: longest }, (_, index) =>
    index + 1 < longest ? [index + 1] : []);
  assert.equal(new Set(timed(() => components(chain))).size, longest);
  const cycle = Array.from({ length: longest }, (_, index) =>
    [(index + 1) % longest]);
  assert.equal(new Set(timed(() => components(cycle))).size, 1);
});
