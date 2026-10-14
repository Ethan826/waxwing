import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { runGo, rejected, rejectedAt } from './support.mjs';
import { expectDiagnostic, log, database as nullary, db } from
  './fx-diagnostics-support.mjs';

// FX020 Task 2: `Effect.op(args)` and `Effect.op` resolve by declaration.
// Bare operation names are unbound since Task 7 (test/fx020-unbound).
const database = 'effect Database { fn query(id: Int): Int; }; ';
const twice = database + 'fn twice(f: Int -> Int with Database, n: Int): '
  + 'Int with Database = f(f(n)); ';
const handled = 'with handler Database { query(id) => id + 1 } ';

test('Log.log(1) performs', () => {
  assert.equal(runGo(log + 'fn main(): Unit with Console = with handler Log '
    + '{ log(n) => Console.print(n) } { Log.log(1) };'), '1\n');
});

test('Console.print(1) prints', () => {
  assert.equal(runGo('fn main(): Unit with Console = Console.print(1);'),
    '1\n');
});

test('Fail.fail(E) is caught by handle', () => {
  assert.equal(runGo(db + 'fn main(): Int = handle Fail.fail(DbError) '
    + '{ fail(error: DbError) => 7 };'), '7\n');
});

test('map(Database.query, ids) passes a reference', () => {
  assert.equal(runGo(twice + 'fn main(): Unit with Console = '
    + handled + '{ Console.print(twice(Database.query, 1)) };'), '3\n');
});

test('Database.query in a with-Log function is an effect error', () => {
  const source = nullary + log + 'fn f(): Int with Log = '
    + 'Database.query(); fn main(): Int = 1;';
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: 'f performs Database, which its signature does not allow',
    at: ['Database.query()'],
    notes: [['with Log', 'with Log',
      'the signature of f does not allow Database']]
  });
});

test('Log.log(1) outside a Log row is an effect error over its call', () => {
  expectDiagnostic(log + 'fn f(): Unit = Log.log(1); fn main(): Unit = f();', {
    code: 'E_EFFECT', message: 'f performs Log, which its signature does '
      + 'not allow',
    at: ['Log.log(1)'],
    notes: [['fn f(): Unit = Log.log(1);', 'fn f(): Unit = Log.log(1);',
      'the signature of f has an ambient row']]
  });
});

test('two effects declaring log reach their own handlers', () => {
  const audit = 'effect Audit { fn log(n: Int): Unit; }; ';
  assert.equal(runGo(audit + log + 'fn work(): Unit with Audit + Log = '
    + '{ Audit.log(1); Log.log(2) }; fn main(): Unit with Console = '
    + 'with handler Audit { log(n) => Console.print(n + 10) } '
    + 'with handler Log { log(n) => Console.print(n + 20) } { work() };'),
  '11\n22\n');
});

test('an unknown qualifier is unbound over the whole name', () => {
  const call = rejectedAt('fn main(): Int = Nope.x(1);', 'E_UNBOUND',
    'Nope.x(1)');
  assert.equal(call.message, 'Unbound function Nope.x');
  const name = rejectedAt('fn main(): Int = Nope.x;', 'E_UNBOUND', 'Nope.x');
  assert.equal(name.message, 'Unbound local Nope.x');
});

test('an unknown operation of an effect is E_HANDLER', () => {
  const call = rejectedAt(log + 'fn main(): Unit = Log.nope(1);',
    'E_HANDLER', 'Log.nope(1)');
  assert.equal(call.message, 'nope is not an operation of Log');
  const built = rejectedAt('fn main(): Unit = Console.nope;', 'E_HANDLER',
    'Console.nope');
  assert.equal(built.message, 'nope is not an operation of Console');
  rejectedAt('fn main(): Int = Fail.nope(1);', 'E_HANDLER', 'Fail.nope(1)');
});

test('a nullary operation named without a call is E_ARITY', () => {
  const found = rejectedAt(nullary + 'fn main(): Int = Database.query;',
    'E_ARITY', 'Database.query');
  assert.equal(found.message, 'Expected Database.query()');
});

test('fail with the wrong shape is rejected where it is written', () => {
  const none = rejectedAt('fn main(): Int = Fail.fail();', 'E_ARITY',
    'Fail.fail()');
  assert.equal(none.message, 'Wrong number of arguments');
  rejectedAt('fn main(): Int = Fail.fail(1, 2);', 'E_ARITY',
    'Fail.fail(1, 2)');
  // Since Task 2b `Fail.fail` alone is a value (test/fx020-fail-ref).
  const value = rejectedAt('fn main(): Int = Fail.fail;', 'E_TYPE',
    'Fail.fail');
  assert.equal(value.message, 'Expected Int, found _ -> _');
});

test('a Fail span ends at its payload, as before', () => {
  const found = rejectedAt('fn f(): Int = Fail.fail(1); fn main(): Int = 1;',
    'E_EFFECT', 'Fail.fail(1');
  assert.equal(found.message, 'f performs Fail(Int), which its signature '
    + 'does not allow');
});

// Review Focus 5: `.` elsewhere gives a clear existing error and blocks
// nothing for later `r.field` on lowercase receivers.
test('1.5 and x.y keep a clear existing error', () => {
  const number = rejected('fn main(): Int = 1.5;', 'E_LEX');
  assert.equal(number.message, 'Unexpected character');
  assert.equal(number.span.start.offset, 18);
  const field = rejected('fn f(x: Int): Int = x.y; fn main(): Int = 1;',
    'E_SYNTAX');
  assert.equal(field.message, "Expected ';'");
  assert.equal(field.span.start.offset, 21);
});

test('... still lexes as one token', () => {
  const found = rejected('fn main(): Int = a...b;', 'E_SYNTAX');
  assert.equal(found.span.end.offset - found.span.start.offset, 3);
  const spread = 'type Job(a, ...effects) = Job(Int -> a with ...effects); ';
  assert.ok(compile(spread + 'fn main(): Int = 1;') instanceof Right);
});

test('a lowercase receiver is never read as a qualifier', () => {
  const source = 'fn f(log: Int): Int = log.log(1); fn main(): Int = 1;';
  const found = rejected(source, 'E_SYNTAX');
  assert.equal(found.message, "Expected ';'");
  assert.deepEqual(found.span.start.offset, source.indexOf('.'));
});
