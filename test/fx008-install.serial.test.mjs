import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';

// Task 8 review I1: installations in one declaration must stay near the
// cost of the entries they add. Checking 1,000 sequential `with`s under one
// handler took 3.97 s before installations (66f1eca), 11.6 s with the first
// version of Task 8 (every round walked C's and R's long tail chains), and
// 5.2 to 6.3 s with it (the extra entries alone cost 5.1 s). A warm-up
// check keeps JIT start-up out, and only `check` is timed. Since T008
// (33f9854) the check is linear and takes about 0.5 s, so the bound is three
// times `MEASURED_MS`, the median of five runs of this check, one process
// each, on the author's laptop (2026-10-12, load average 3.3): 489 ms. It
// still separates the Task 8 regression by a wide margin, and the ratio test
// below guards linearity.
const MEASURED_MS = 489;
const slack = 3;
const bound = slack * MEASURED_MS;
const count = 1000;

const program = size => 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; '
  + 'fn main(): Unit with Console = with handler Log { log(n) => Console.print(n) } { '
  + Array.from({ length: size },
    () => 'with handler Tick { tick() => Log.log(1) } { Tick.tick() }; ').join('')
  + '() };';

const resolved = size => resolve(parse(program(size)).value0).value0;

test('1,000 installations in one declaration check within the bound', () => {
  assert.equal(check(resolved(20)).constructor.name, 'Right');
  const source = resolved(count);
  const started = performance.now();
  const result = check(source);
  const elapsed = performance.now() - started;
  assert.equal(result.constructor.name, 'Right');
  assert.ok(elapsed < bound, `took ${elapsed} ms, bound ${bound} ms`);
});

// BACKLOG T008: the settling cost is linear in the installations. Every
// consumption used to walk the target row's chain of alias hops, one lookup
// per hop, so doubling the installations multiplied the time by 4.27
// (best of 3; 7.9 s then 35 s as single runs at 9a62014). `MEASURED_RATIO` is
// the median over five
// runs of time(2,000) / time(1,000), each the best of `runs` timings, on the
// author's laptop (2026-10-12, load average 4.3); `MAX_RATIO` is 1.6 times
// that. A linear check doubles and quadratic work lands at 4 or more (4.27
// at 9a62014), so the bound sits between them. The warm-up keeps JIT
// start-up out of the first timing, and the best of three keeps a load
// spike out of either.
const MEASURED_RATIO = 2.0;
const MAX_RATIO = 3.2;
const runs = 3;

const bestOf = source => {
  let best = Infinity;
  for (let run = 0; run < runs; run++) {
    const started = performance.now();
    const result = check(source);
    best = Math.min(best, performance.now() - started);
    assert.equal(result.constructor.name, 'Right');
  }
  return best;
};

test('doubling the installations keeps the check time linear', t => {
  assert.equal(check(resolved(20)).constructor.name, 'Right');
  const small = bestOf(resolved(count));
  const large = bestOf(resolved(2 * count));
  t.diagnostic(`${Math.round(small)} ms, ${Math.round(large)} ms, `
    + `ratio ${large / small}, measured ${MEASURED_RATIO}`);
  assert.ok(large / small <= MAX_RATIO,
    `2,000 took ${large} ms against ${small} ms for 1,000, `
    + `bound ${MAX_RATIO}x`);
});
