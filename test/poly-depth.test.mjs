import test from 'node:test';
import assert from 'node:assert/strict';
import * as unifier from '../output/Features.Check.Unify/index.js';

// P001 Task 4 fix 1 (ruling R7): an inferred type deeper than the bound is
// E_NESTING at the expression whose type first exceeds it, never a stack
// overflow. Check only; the CLI compiles no polymorphic program until Task 7.
const limit = 1000;

test('the inferred type limit is 1000', () => {
  assert.equal(unifier.inferredTypeLimit, limit);
});
