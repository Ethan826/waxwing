import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';
import { compileWithin } from './regression-fx008.mjs';
import {
  clauseLiteralDepth, clauseLiteralProgram, lambdaProgram, literalDepth,
  literalProgram, nestedProgram, nestingDepth
} from './fx008-nesting.mjs';

// Routine half: the 2 s bound is in fx008-nesting.perf.test.mjs (npm run
// perf). The deep programs must still compile.
const baseDepth = 120;

const within = (depth, program = nestedProgram) => {
  checked(program(1));
  checked(program(depth));
};

test('a handler type nested 40 levels deep compiles', () => {
  within(nestingDepth);
});

// Base's working range: also catches a linear regression with a large
// constant factor.
test('a handler type nested 120 levels deep compiles', () => {
  within(baseDepth);
});

// A lambda parameter's annotation: each handler type outside a handler row
// gets a clause row (Task 3), which must stay one tree per level.
test('a lambda annotation nested 40 levels deep compiles', () => {
  within(nestingDepth, lambdaProgram);
});

test('a lambda annotation nested 120 levels deep compiles', () => {
  within(baseDepth, lambdaProgram);
});

// Task 7: a handler literal's type carries a clause row beside its inference
// row. About 30 literals nested through context rows stay linear.
test('30 handler literals nested through rows compile', () => {
  within(literalDepth, literalProgram);
});

// Task 2 c2: a clause performing `Cell(type of the previous literal)` keeps
// one tree per level (C holds no label arguments of its own). Measured
// through a child process, so a regression fails after 20 s, not never.
test('30 handler literals chained through their clauses compile', () => {
  const context = { compilerPath: 'output/Program.Compile/index.js' };
  compileWithin(context, clauseLiteralProgram(1), 20_000);
  const found = compileWithin(context, clauseLiteralProgram(clauseLiteralDepth),
    20_000);
  assert.equal(found.timedOut, false, 'timed out');
  assert.equal(found.diagnostic, null);
});
