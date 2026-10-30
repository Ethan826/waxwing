// Routine half: the 5 s bounds are in poly-coverage-timing.perf.test.mjs
// (npm run perf).
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRejectedAt, checkedPoly } from './phases.mjs';
import { prelude } from './poly-coverage-support.mjs';

const main = ' fn main(): Int = 0;';

// A chain of parameterized types, each applied to the next: expanding
// `U(Void)` and `U(Int)` numbers 3,000 applications each, and whether
// `Dead` needs an arm depends on the argument at the chain's far end, so
// only inhabitation per application settles it.
const chainLength = 3000;
const chain = prelude + Array.from({ length: chainLength }, (_, index) =>
  `type T${index}(a) = A${index}(T${index + 1}(a));`).join(' ')
  + ` type T${chainLength}(a) = Z(a); type U(a) = Dead(T0(a)) | Live;`;

const timed = work => work();

test('coverage expands a 3,000-application chain', () => {
  const live = 'match u { Live => 0 }';
  timed(() => checkedPoly(`${chain} fn f(u: U(Void)): Int = ${live};${main}`));
  for (const argument of ['Int', 'a']) {
    const source = `${chain} fn f(u: U(${argument})): Int = ${live};${main}`;
    const diagnostic = timed(() =>
      checkRejectedAt(source, 'E_NON_EXHAUSTIVE', live));
    assert.equal(diagnostic.message, 'Missing pattern: Dead(_)');
  }
});
