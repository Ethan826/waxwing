// Routine half; the 5 s time bound is in fn-syntax-timing.perf.test.mjs
// (npm run perf).
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolved } from './phases.mjs';
import { shape } from './fn-shape.mjs';

// FN001 Task 3: function types, lambdas, postfix application and pipes,
// through Parse (and Resolve where a type is compared). Names are
// test/fn-names.test.mjs.
const main = ' fn main(): Int = 0;';

// The callee of a chain is one level deeper however long the chain is, so
// a long chain (plan Task 8: 1,000 partial applications) is one node.
const chainLength = 1000;

test(`a chain of ${chainLength} postfix groups resolves to one Apply`, () => {
  const groups = Array.from({ length: chainLength }, (_, k) => `(${k})`);
  const program = resolved(`fn g(x: Int): Int = x; fn f(x: Int): Int = `
    + `g(0)${groups.join('')};${main}`);
  const body = program.functions[1].body;
  assert.equal(shape(body.value1), 'Call(0, [Integer(0)])');
  assert.equal(body.value2.length, chainLength);
  assert.equal(shape(body.value2.at(-1)), `Integer(${chainLength - 1})`);
});
