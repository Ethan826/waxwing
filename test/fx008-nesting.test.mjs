import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';
import { nestedProgram, nestingDepth } from './fx008-nesting.mjs';

test('a handler type nested 40 levels deep is accepted', () => {
  assert.ok(checked(nestedProgram(nestingDepth)).length > 0);
});
