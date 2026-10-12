import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';
import { compileWithin } from './regression-fx008.mjs';
import {
  clauseLiteralDepth, clauseLiteralProgram, lambdaProgram, literalDepth,
  literalProgram, nestedProgram, nestingDepth
} from './fx008-nesting.mjs';

test('a handler type nested 40 levels deep is accepted', () => {
  assert.ok(checked(nestedProgram(nestingDepth)).length > 0);
});

test('a lambda annotation nested 40 levels deep is accepted', () => {
  assert.ok(checked(lambdaProgram(nestingDepth)).length > 0);
});

test('handler literals nested through rows are accepted', () => {
  assert.ok(checked(literalProgram(literalDepth)).length > 0);
});

// A child process with a timeout, so a regression fails instead of hanging.
test('handler literals whose clauses perform the previous literal are accepted', () => {
  const context = { compilerPath: 'output/Program.Compile/index.js' };
  const found = compileWithin(context, clauseLiteralProgram(clauseLiteralDepth),
    20_000);
  assert.equal(found.timedOut, false, 'timed out');
  assert.equal(found.diagnostic, null);
});
