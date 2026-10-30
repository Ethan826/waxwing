import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';

// Task 8 review I1: installations in one declaration must check. This is
// the routine half: the absolute bound and the doubling ratio are in
// fx008-install.perf.test.mjs (npm run perf), with their history.
const count = 1000;

const program = size => 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; '
  + 'fn main(): Unit with Console = with handler Log { log(n) => '
  + 'Console.print(n) } { '
  + Array.from({ length: size },
    () => 'with handler Tick { tick() => Log.log(1) } '
      + '{ Tick.tick() }; ').join('')
  + '() };';

const resolved = size => resolve(parse(program(size)).value0).value0;

test('1,000 installations in one declaration check', () => {
  assert.equal(check(resolved(20)).constructor.name, 'Right');
  const source = resolved(count);
  const result = check(source);
  assert.equal(result.constructor.name, 'Right');
});

// BACKLOG T008: the settling cost is linear in the installations. The
// doubling ratio is checked in fx008-install.perf.test.mjs; here, both sizes
// must check.
const runs = 3;

const checkedRepeatedly = source => {
  for (let run = 0; run < runs; run++) {
    assert.equal(check(source).constructor.name, 'Right');
  }
};

test('doubling the installations check at both sizes', () => {
  assert.equal(check(resolved(20)).constructor.name, 'Right');
  checkedRepeatedly(resolved(count));
  checkedRepeatedly(resolved(2 * count));
});
