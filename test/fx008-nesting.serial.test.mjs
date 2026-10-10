import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';
import { nestedProgram, nestingDepth } from './fx008-nesting.mjs';

// Bound: 3 times the median (16.3 ms) of the first, cold, compile in 5
// fresh processes, measured on the implementer's machine with the fix for
// review C1. Before it, depth 22 ran out of memory.
const medianMs = 16.3;
const bound = 3 * medianMs;

test('a handler type nested 40 levels deep compiles within the bound', () => {
  const started = performance.now();
  checked(nestedProgram(nestingDepth));
  const elapsed = performance.now() - started;
  assert.ok(elapsed < bound, `took ${elapsed} ms, bound ${bound} ms`);
});
