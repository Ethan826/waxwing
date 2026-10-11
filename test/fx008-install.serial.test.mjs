import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';

// Task 8 review I1: installations in one declaration must stay near the
// cost of the entries they add. Checking 1,000 sequential `with`s under one
// handler took 3.97 s before installations (66f1eca), 11.6 s with the first
// version of Task 8 (every round walked C's and R's long tail chains), and
// 5.2 to 6.3 s now (the extra entries alone cost 5.1 s). The bound sits
// between the old regression and the present cost, a warm-up check keeps
// JIT start-up out, and only `check` is timed.
const bound = 9500;
const count = 1000;

const program = size => 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; '
  + 'fn main(): Unit with Console = with handler Log { log(n) => print(n) } { '
  + Array.from({ length: size },
    () => 'with handler Tick { tick() => log(1) } { tick() }; ').join('')
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
