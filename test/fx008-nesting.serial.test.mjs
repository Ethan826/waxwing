import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';
import { nestedProgram, nestingDepth } from './fx008-nesting.mjs';

// Bound: generous, not tight. With review C1's defect depth 20 took 2.1 s
// and depth 22 ran out of memory (doubling per level); linear compiles of
// depth 40 measured <= 73 ms cold under 2×ncpu load. A warm-up compile
// keeps JIT start-up out of the measurement.
const bound = 2000;
const baseDepth = 120;

const within = depth => {
  checked(nestedProgram(1));
  const started = performance.now();
  checked(nestedProgram(depth));
  const elapsed = performance.now() - started;
  assert.ok(elapsed < bound, `took ${elapsed} ms, bound ${bound} ms`);
};

test('a handler type nested 40 levels deep compiles within the bound', () => {
  within(nestingDepth);
});

// Base's working range: also catches a linear regression with a large
// constant factor.
test('a handler type nested 120 levels deep compiles within the bound', () => {
  within(baseDepth);
});
