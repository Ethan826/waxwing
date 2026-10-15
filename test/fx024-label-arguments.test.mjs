import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejectedAt, runGo } from './support.mjs';

// FX024: a type written as an effect label's argument has no ambient row,
// in a signature as in a field, an operation, a handler's label or a
// `handle` clause, so an unannotated arrow or a bare `Handler(L)` there is
// `pure`. Before, in a signature it took the signature's ambient row, which
// is also that row's own tail: a caller with a label the callee lacks
// bound the tail, and so the payload's row, to its whole row, and the
// payload it wrote (its ambient alone) no longer matched.
const log = 'effect Log { fn log(n: Int): Unit; }; ';
const state = 'effect State(s) { fn get(): s; fn put(x: s): Unit; }; ';
const arrow = 'Fail({ k: (Int) -> Int })';
const main = ' fn main(): Int = 0;';

test('an arrow in a record payload is caught by main (z2)', () => {
  assert.equal(runGo(`fn w(): Int with ${arrow} = 1; `
    + 'fn main(): Unit with Console = Console.print(handle w() '
    + '{ fail(e: { k: (Int) -> Int }) => 2 });'), '1\n');
});

test('a raised function is called by its handler (x1)', () => {
  assert.equal(runGo(`fn w(): Int with ${arrow} = `
    + 'Fail.fail({ k: fn(n) => n + 7 }); fn main(): Unit with Console = '
    + 'Console.print(handle w() { fail(e: { k: (Int) -> Int }) => '
    + 'e.k(1) });'), '8\n');
});

test('main returning Int handles it under its own Console (z1)', () => {
  checked(`fn w(): Int with ${arrow} = Fail.fail({ k: fn(n) => n + 7 }); `
    + 'fn main(): Int with Console = handle w() '
    + '{ fail(e: { k: (Int) -> Int }) => e.k(1) };');
});

test('a caller with an extra label passes the payload on (z4)', () => {
  checked(`fn w(): Int with ${arrow} = 1; `
    + `fn v(): Int with Console + ${arrow} = w();${main}`);
});

test('a parameterised payload type passes too (z6)', () => {
  checked('type K(a) = K(a); fn w(): Int with Fail(K((Int) -> Int)) = 1; '
    + 'fn v(): Int with Console + Fail(K((Int) -> Int)) = w();' + main);
});

test('a handler in a record payload passes (FX024 repro)', () => {
  checked(`${log}fn bad(): Int with Fail({ h: Handler(Log) }) = 1; `
    + 'fn mid(): Int with Fail({ h: Handler(Log) }) + Console = bad();'
    + main);
});

test('a handler in a declared payload passes (data analog)', () => {
  checked(`${log}type W(a) = W(a); `
    + 'fn bad(): Int with Fail(W(Handler(Log))) = 1; '
    + 'fn mid(): Int with Fail(W(Handler(Log))) + Console = bad();' + main);
});

test('an arrow in another effect\'s argument passes', () => {
  checked(`${state}fn w(): Int with State((Int) -> Int) = 1; `
    + 'fn v(): Int with Console + State((Int) -> Int) = w();' + main);
});

// An ambient callback is no pure function: the existing row-equality
// text (spec §6), at the call as before.
test('the payload\'s arrow is pure, as in a handle clause', () => {
  const source = `fn w(f: (Int) -> Int): Int with ${arrow} = `
    + `Fail.fail({ k: f });${main}`;
  assert.equal(rejectedAt(source, 'E_EFFECT', 'Fail.fail({ k: f }').message,
    '... and pure cannot be made equal: both end in ...');
});

test('a pure callback may be raised', () => {
  checked(`fn w(f: (Int) -> Int with pure): Int with ${arrow} = `
    + `Fail.fail({ k: f });${main}`);
});
