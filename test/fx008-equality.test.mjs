// FX008 Task 4: marks compare by equality in types (P3), and handler types
// open at a function's use (design §3.4, P5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, runGo } from './support.mjs';

const log = 'effect Log { fn log(n: Int): Unit; }; ';
// The argument `name` of the call `call`: its span is the diagnostic's.
const rejectedArgument = (source, call, name) => {
  const found = rejected(source, 'E_TYPE');
  const offset = source.indexOf(call) + call.indexOf(name);
  assert.deepEqual([found.span.start.offset, found.span.end.offset],
    [offset, offset + name.length]);
  return found;
};
const unmarked = source => source.replace(/nofail(?:\([a-z]+\))? (?=[A-Z])/g, '');

test('a fail-free handler parameter refuses a plain handler', () => {
  const source = log
    + 'fn run(h: Handler(nofail Log with pure)): Unit = with h { log(1) }; '
    + 'fn pass(h: Handler(Log with pure)): Unit = run(h); '
    + 'fn main(): Int = 0;';
  const found = rejectedArgument(source, 'run(h)', 'h');
  assert.equal(found.message, 'Expected Handler(nofail Log), found Handler(Log)');
});

test('handler types open at declaration use', () => {
  const source = log + 'fn run(h: Handler(Log with pure)): Unit = with h { log(1) }; '
    + 'fn mk(): Handler(nofail Log with pure) = handler Log { log(n) => () }; '
    + 'fn main(): Int = { run(mk()); 0 };';
  assert.equal(runGo(source), '0\n');
  assert.equal(checked(source), checked(unmarked(source)));
});

test('callback rows are invariant in marks', () => {
  const source = log + 'fn need(k: Unit -> Unit with nofail Log): Unit = (); '
    + 'fn give(k: Unit -> Unit with Log): Unit = need(k); '
    + 'fn main(): Int = 0;';
  const found = rejectedArgument(source, 'need(k)', 'k');
  assert.equal(found.message,
    'Expected Unit -> Unit with nofail Log, found Unit -> Unit');
});

test('a lambda passed to a nofail callback compiles', () => {
  const source = log + 'fn need(k: Unit -> Unit with nofail Log): Unit = (); '
    + 'fn go(): Unit with nofail Log = need(fn(u: Unit) => log(1)); '
    + 'fn main(): Int = 0;';
  assert.equal(checked(source), checked(unmarked(source)));
});

const tick = 'effect Tick { fn tick(): Unit; }; ';

test('handler types with clause rows of different marks differ', () => {
  const source = log + tick
    + 'fn inner(h: Handler(Log with Tick)): Unit with Tick = with h { log(1) }; '
    + 'fn outer(h: Handler(Log with nofail Tick)): Unit with Tick = inner(h); '
    + 'fn main(): Int = 0;';
  const found = rejectedArgument(source, 'inner(h)', 'h');
  assert.equal(found.message,
    'Expected Handler(Log), found Handler(Log with nofail Tick)');
});

test('a clause row mark clash through a lambda annotation names the row', () => {
  const source = log + tick + 'fn go(h: Handler(Log with Tick)): Unit = '
    + '{ let f = fn(g: Handler(Log with nofail Tick)) => (); f(h) }; '
    + 'fn main(): Int = 0;';
  const found = rejectedArgument(source, 'f(h)', 'h');
  assert.equal(found.message,
    'Expected Handler(Log with nofail Tick), found Handler(Log)');
});

test('a result written M stays closed against a nofail parameter', () => {
  const source = log
    + 'fn run(h: Handler(nofail Log with pure)): Unit = with h { log(1) }; '
    + 'fn mk(): Handler(Log with pure) = handler Log { log(n) => () }; '
    + 'fn main(): Int = { run(mk()); 0 };';
  const found = rejectedArgument(source, 'run(mk())', 'mk()');
  assert.equal(found.message, 'Expected Handler(nofail Log), found Handler(Log)');
});
