// Routine half: the 5 s bounds are in poly-termination-timing.perf.test.mjs
// (npm run perf); an absolute elapsed-time bound, so a budget, not a kill.
import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from './poly-termination-support.mjs';

const longest = 20000;
const direct = work => work();

test('components are stack-safe on a 20,000-node chain and cycle', () => {
  const chain = Array.from({ length: longest }, (_, index) =>
    index + 1 < longest ? [index + 1] : []);
  assert.equal(new Set(direct(() => components(chain))).size, longest);
  const cycle = Array.from({ length: longest }, (_, index) =>
    [(index + 1) % longest]);
  assert.equal(new Set(direct(() => components(cycle))).size, 1);
});
