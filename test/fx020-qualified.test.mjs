import test from 'node:test';
import assert from 'node:assert/strict';
import { Left, Right } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { runGo, rejected, rejectedAt } from './support.mjs';
import { expectDiagnostic, log, database as nullary, db } from
  './fx-diagnostics-support.mjs';

// FX020 Task 2: `Effect.op(args)` and `Effect.op` resolve by declaration
// to the nodes the bare names resolve to; bare names still work.
const goOf = source => {
  const result = compile(source);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0;
};
const database = 'effect Database { fn query(id: Int): Int; }; ';
const twice = database + 'fn twice(f: Int -> Int with Database, n: Int): '
  + 'Int with Database = f(f(n)); ';
const handled = 'with handler Database { query(id) => id + 1 } ';

test('Log.log(1) performs', () => {
  assert.equal(runGo(log + 'fn main(): Unit with Console = with handler Log '
    + '{ log(n) => print(n) } { Log.log(1) };'), '1\n');
});

test('Console.print(1) prints', () => {
  assert.equal(runGo('fn main(): Unit with Console = Console.print(1);'),
    '1\n');
});

test('Fail.fail(E) is caught by handle', () => {
  assert.equal(runGo(db + 'fn main(): Int = handle Fail.fail(DbError) '
    + '{ fail(error: DbError) => 7 };'), '7\n');
});

test('a bare fail(E) still works through the legacy global', () => {
  assert.equal(runGo(db + 'fn main(): Int = handle fail(DbError) '
    + '{ fail(error: DbError) => 7 };'), '7\n');
});

test('qualified and bare forms emit identical Go', () => {
  const pairs = [
    [db + 'fn main(): Int = handle fail(DbError) '
      + '{ fail(error: DbError) => 7 };',
    db + 'fn main(): Int = handle Fail.fail(DbError) '
      + '{ fail(error: DbError) => 7 };'],
    ['fn main(): Unit with Console = print(1);',
      'fn main(): Unit with Console = Console.print(1);'],
    [log + 'fn main(): Unit = with handler Log { log(n) => () } { log(1) };',
      log + 'fn main(): Unit = with handler Log { log(n) => () } '
      + '{ Log.log(1) };'],
    [twice + 'fn main(): Int = ' + handled + '{ twice(query, 1) };',
      twice + 'fn main(): Int = ' + handled + '{ twice(Database.query, 1) };']
  ];
  for (const [bare, qualified] of pairs) {
    assert.equal(goOf(qualified), goOf(bare));
  }
});

test('map(Database.query, ids) passes a reference', () => {
  assert.equal(runGo(twice + 'fn main(): Unit with Console = '
    + handled + '{ print(twice(Database.query, 1)) };'), '3\n');
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
    + 'with handler Audit { log(n) => print(n + 10) } '
    + 'with handler Log { log(n) => print(n + 20) } { work() };'),
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
  const none = rejectedAt('fn main(): Int = fail();', 'E_ARITY', 'fail()');
  assert.equal(none.message, 'Wrong number of arguments');
  rejectedAt('fn main(): Int = Fail.fail(1, 2);', 'E_ARITY',
    'Fail.fail(1, 2)');
  rejectedAt('fn main(): Int = Fail.fail;', 'E_SYNTAX', 'Fail.fail');
});

test('a Fail span ends at its payload, as before', () => {
  const found = rejectedAt('fn f(): Int = fail(1); fn main(): Int = 1;',
    'E_EFFECT', 'fail(1');
  assert.ok(found.message.length > 0);
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
  assert.ok(compile('fn f(log: Int): Int = log.log(1); fn main(): Int = 1;')
    instanceof Left);
});
