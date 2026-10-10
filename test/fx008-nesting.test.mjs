import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';
import { lambdaProgram, nestedProgram, nestingDepth } from './fx008-nesting.mjs';

test('a handler type nested 40 levels deep is accepted', () => {
  assert.ok(checked(nestedProgram(nestingDepth)).length > 0);
});

test('a lambda annotation nested 40 levels deep is accepted', () => {
  assert.ok(checked(lambdaProgram(nestingDepth)).length > 0);
});
