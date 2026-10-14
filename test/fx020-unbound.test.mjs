import test from 'node:test';
import assert from 'node:assert/strict';
import { Left } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { runGo, spanAt } from './support.mjs';

// FX020 Task 7: bare operation names do not resolve. The unbound-name
// error keeps its text and code; a hint lists the qualified forms of the
// effects that declare the name, built-ins first, then declaration order.
const log = 'effect Log { fn log(n: Int): Unit; }; ';
const audit = 'effect Audit { fn log(n: Int): Unit; }; ';
const trace = 'effect Trace { fn log(n: Int): Unit; }; ';

const refused = (source, text, message, nth = 0) => {
  const result = compile(source);
  assert.ok(result instanceof Left, 'bare operation compiled');
  const diagnostic = wire(result.value0);
  assert.equal(diagnostic.code, 'E_UNBOUND');
  assert.equal(diagnostic.message, message);
  assert.deepEqual(diagnostic.span, spanAt(source, text, nth));
  assert.deepEqual(diagnostic.related, []);
};

test('a bare log(1) names Log.log', () => refused(
  log + 'fn main(): Unit with Log = log(1);', 'log(1)',
  'Unbound function log; use Log.log, or import it with Log { log }'));

test('a bare print(1) names Console.print', () => refused(
  'fn main(): Unit with Console = print(1);', 'print(1)',
  'Unbound function print; use Console.print, '
  + 'or import it with Console { print }'));

test('a bare fail(E) imports Fail with its argument', () => refused(
  'type E = E; fn main(): Int = fail(E);', 'fail(E)',
  'Unbound function fail; use Fail.fail, or import it with '
  + 'Fail(E) { fail }'));

test('a bare name used as a value gets the same hint', () => refused(
  log + 'fn main(): Unit = { let f = log; () };', 'log',
  'Unbound local log; use Log.log, or import it with Log { log }', 1));

test('two effects declaring the name list both', () => refused(
  audit + log + 'fn main(): Unit with Log = log(1);', 'log(1)',
  'Unbound function log; use Audit.log or Log.log, '
  + 'or import one with Audit { log } or Log { log }'));

test('three effects list in declaration order', () => refused(
  audit + log + trace + 'fn main(): Unit = log(1);', 'log(1)',
  'Unbound function log; use Audit.log, Log.log or Trace.log, '
  + 'or import one with Audit { log }, Log { log } or Trace { log }'));

test('built-ins come first', () => refused(
  'effect Cell { fn print(n: Int): Unit; }; '
  + 'fn main(): Unit = print(1);', 'print(1)',
  'Unbound function print; use Console.print or Cell.print, '
  + 'or import one with Console { print } or Cell { print }'));

test('no effect declares the name, no hint', () => refused(
  log + 'fn main(): Unit = other(1);', 'other(1)',
  'Unbound function other'));

test('a parameterised effect is imported with its parameters', () => refused(
  'effect Box(t) { fn put(x: t): Unit; }; fn main(): Unit = put(1);',
  'put(1)', 'Unbound function put; use Box.put, or import it with '
  + 'Box(t) { put }'));

test('several parameters keep their order', () => refused(
  'effect Pair(a, b) { fn put(x: a): Unit; }; '
  + 'fn main(): Unit = put(1);', 'put(1)',
  'Unbound function put; use Pair.put, or import it with '
  + 'Pair(a, b) { put }'));

test('a parameterised candidate among several', () => refused(
  'effect Log { fn fail(n: Int): Unit; }; type E = E; '
  + 'fn main(): Int = fail(E);', 'fail(E)',
  'Unbound function fail; use Fail.fail or Log.fail, '
  + 'or import one with Fail(E) { fail } or Log { fail }'));

test('a hint never resolves the name', () => {
  assert.ok(compile(log + 'fn main(): Unit = log(1);') instanceof Left);
});

test('an import still binds the bare name', () => {
  assert.equal(runGo(log + 'fn f(): Unit with Log { log } = log(1); '
    + 'fn main(): Unit with Console = '
    + 'with handler Log { log(n) => Console.print(n) } { f() };'), '1\n');
});

test('a function named log wins over an operation named log', () => {
  assert.equal(runGo('effect Log { fn log(n: Int): Unit; }; '
    + 'fn log(n: Int): Int = n + 1; '
    + 'fn main(): Unit with Console = '
    + 'with handler Log { log(n) => Console.print(n + 10) } '
    + '{ Console.print(log(1)); Log.log(2) };'), '2\n12\n');
});

test('both operations of two effects are reachable', () => {
  assert.equal(runGo(audit + log + 'fn main(): Unit with Console = '
    + 'with handler Audit { log(n) => Console.print(n) } '
    + 'with handler Log { log(n) => Console.print(n + 100) } '
    + '{ Log.log(1); Audit.log(2) };'), '101\n2\n');
});
