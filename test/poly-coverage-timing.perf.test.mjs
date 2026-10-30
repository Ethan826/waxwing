// Absolute time bounds moved out of poly-coverage.test.mjs. They run only under
// `npm run perf` (scripts/perf.mjs); the routine half is
// poly-coverage-timing.serial.test.mjs.
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
const secondsLimit = 5;
const millisecondsPerSecond = 1000;
const chain = prelude + Array.from({ length: chainLength }, (_, index) =>
  `type T${index}(a) = A${index}(T${index + 1}(a));`).join(' ')
  + ` type T${chainLength}(a) = Z(a); type U(a) = Dead(T0(a)) | Live;`;

const timed = work => {
  const started = performance.now();
  const result = work();
  const seconds = (performance.now() - started) / millisecondsPerSecond;
  assert.ok(seconds < secondsLimit, `coverage took ${seconds} s`);
  return result;
};

test('coverage expands a 3,000-application chain in bounded time', () => {
  const live = 'match u { Live => 0 }';
  timed(() => checkedPoly(`${chain} fn f(u: U(Void)): Int = ${live};${main}`));
  for (const argument of ['Int', 'a']) {
    const source = `${chain} fn f(u: U(${argument})): Int = ${live};${main}`;
    const diagnostic = timed(() =>
      checkRejectedAt(source, 'E_NON_EXHAUSTIVE', live));
    assert.equal(diagnostic.message, 'Missing pattern: Dead(_)');
  }
});
