import test from 'node:test';
import assert from 'node:assert/strict';
import { outcome } from './fx-oracle.mjs';

// FX020 Task 5: the reference interpreter reads qualified operations,
// signature aliases and imports, with Console and Fail as effects (design
// §1-§4). Bare operation names are unbound (Task 7). Each expected
// output is the one the compiled Go gives (test/fx020-*.test.mjs).
const seen = source => {
  const { stdout, stderr, status } = outcome(source);
  return { stdout, stderr, status };
};
const prints = (source, stdout) =>
  assert.deepEqual(seen(source), { stdout, stderr: '', status: 0 });
const logs = 'effect Log { fn log(n: Int): Unit; fn info(n: Int): Unit; }; ';
const printing = 'with handler Log { log(n) => Console.print(n), '
  + 'info(n) => Console.print(n + 100) } ';
const main = body => `fn main(): Unit with Console = ${body};`;
const database = 'effect Database { fn query(id: Int): Int; }; ';
const families = 'type E1 = E1(Int); type E2 = E2(Int); ';
const both = 'fn main(): Unit with Console = '
  + 'Console.print(handle handle both() '
  + '{ fail(error: E1) => 10 } { fail(error: E2) => 20 });';

test('Log.log, Console.print and Fail.fail are qualified calls', () => {
  prints(logs + main(`${printing}{ Log.log(1); Console.print(2) }`),
    '1\n2\n');
  prints('type E = E; fn main(): Int = handle Fail.fail(E) '
    + '{ fail(error: E) => 7 };', '7\n');
});

test('a qualified operation is a value', () => {
  const twice = database + 'fn twice(f: Int -> Int with Database, n: Int): '
    + 'Int with Database = f(f(n)); ';
  prints(twice + main('with handler Database { query(id) => id + 1 } '
    + '{ Console.print(twice(Database.query, 1)) }'), '3\n');
  prints('type E = E(Int); fn apply(f: E -> Int with Fail(E)): Int '
    + 'with Fail(E) = f(E(3)); fn main(): Int = handle apply(Fail.fail) '
    + '{ fail(error: E) => match error { E(n) => n } };', '3\n');
});

test('two effects declaring log reach their own handlers', () => {
  prints('effect Audit { fn log(n: Int): Unit; }; ' + logs
    + 'fn work(): Unit with Audit + Log = { Audit.log(1); Log.log(2) }; '
    + main('with handler Audit { log(n) => Console.print(n + 10) } '
      + `{ ${printing}{ work() } }`), '11\n2\n');
});

test('imports bind bare names, renamed, with a trailing comma', () => {
  prints(logs + 'fn f(): Unit with Log { log, info as note, } = '
    + `{ log(1); note(2) }; ${main(`${printing}{ f() }`)}`, '1\n102\n');
  prints(logs + 'fn f(): Unit with nofail Log { log } = log(1); '
    + main(`${printing}{ f() }`), '1\n');
});

test('an alias leaves the canonical name valid', () => {
  prints(database + 'fn f(): Int with Database as D = '
    + 'D.query(1) + Database.query(2); '
    + main('with handler Database { query(id) => id + 10 } '
      + '{ Console.print(f()) }'),
  '23\n');
  prints(logs + 'fn f(): Unit with Log as L { info as note } + Console '
    + '{ print as say } = { L.log(1); note(2); say(3) }; '
    + main(`${printing}{ f() }`), '1\n102\n3\n');
});

test('Console { print } and Fail(E) { fail } import built-ins', () => {
  prints('type E = E; fn f(): Int with Fail(E) { fail } = fail(E); '
    + 'fn g(): Unit with Console { print } = print(1); '
    + main('{ g(); Console.print(handle f() { fail(error: E) => 7 }) }'),
  '1\n7\n');
});

test('two Fail families import under two names; Fail.fail infers', () => {
  prints(families + 'fn both(): Int with Fail(E1) { fail as f1 } + Fail(E2) '
    + '{ fail as f2 } = { f2(E2(2)); f1(E1(1)) }; ' + both, '20\n');
  prints(families + 'fn both(): Int with Fail(E1) { fail } + Fail(E2) = '
    + '{ Fail.fail(E2(2)); fail(E1(1)) }; ' + both, '20\n');
});

// The checker refuses this program; the interpreter states the rule too.
test('an imported fail raises only its own family', () => {
  const found = seen(families + 'fn both(): Int with Fail(E1) { fail as f1 } '
    + '+ Fail(E2) = f1(E2(2)); ' + both);
  assert.equal(found.status, -1);
  assert.equal(found.stderr, 'oracle error: E2 failed through Fail(E1)\n');
});

test('each performed operation reports how it was spelled', () => {
  const { events } = outcome(logs + 'fn f(): Unit with Log as L { info } = '
    + '{ L.log(1); info(2) }; ' + main('with handler Log { log(n) => '
    + 'Console.print(n), info(n) => () } { f(); Log.log(3) }'));
  for (const spelling of ['alias', 'import', 'qualified']) {
    assert.ok(events.has(`spelling-${spelling}`), spelling);
  }
  assert.ok(![...events].some(event => event === 'spelling-bare'));
});

test('an imported operation is a value', () => {
  prints('type E = E(Int); fn apply(f: E -> Int with Fail(E)): Int '
    + 'with Fail(E) = f(E(3)); '
    + 'fn run(): Int with Fail(E) { fail } = apply(fail); '
    + main('Console.print(handle run() { fail(error: E) => match error '
      + '{ E(n) => n } })'), '3\n');
});

test('an import through a parameterised effect', () => {
  prints('effect State(s) { fn get(): s; fn put(value: s): Unit; }; '
    + 'fn f(): Int with State(Int) { get } = get() + 1; '
    + main('Console.print(with handler State(Int) '
      + '{ get() => 41, put(value) => () } { f() })'), '42\n');
});

test('an import shadows a global function', () => {
  prints(logs + 'fn log(n: Int): Int = n + 1; '
    + 'fn f(): Unit with Log { log } = log(1); ' + main(`${printing}{ f() }`),
  '1\n');
});

test('a parameter, a let and a lambda binder each shadow an import', () => {
  const run = (text, shown) => seen(logs + 'fn ' + text
    + main(`${printing}{ Console.print(${shown}) }`)).stdout;
  assert.equal(run('f(log: Int): Int with Log { log } = log + 1; ', 'f(4)'),
    '5\n');
  assert.equal(run('f(): Int with Log { log } = { let log = 7; log + 1 }; ',
    'f()'), '8\n');
  assert.equal(run('f(): Int with Log { log } = (fn(log: Int) => log + 2)(5); ',
    'f()'), '7\n');
});

test('a wrong-typed inner binder never falls back to the import', () => {
  const found = seen(logs + 'fn f(): Unit with Log { log } = '
    + `{ let log = 5; log(1) }; ${main(`${printing}{ f() }`)}`);
  assert.equal(found.status, -1);
  assert.equal(found.stderr, 'oracle error: applied a non-function\n');
});

test('lambdas and clause bodies inherit the function\'s imports', () => {
  prints(logs + 'fn f(): Unit with Log { info as note } = '
    + '{ let g = fn(n: Int) => note(n); g(1) }; ' + main(`${printing}{ f() }`),
  '101\n');
  prints(logs + 'fn f(): Unit with Console { print as say } = '
    + 'with handler Log { log(n) => say(n), info(n) => () } { Log.log(4) }; '
    + main('f()'), '4\n');
});

test('imports are scoped to their own function', () => {
  const found = seen(logs + 'fn f(): Unit with Log { info as note } = '
    + 'note(1); fn g(): Unit with Log = note(2); '
    + main(`${printing}{ g() }`));
  assert.equal(found.status, -1);
  assert.equal(found.stderr, 'oracle error: unknown name note\n');
});

test('bare operation names are unknown, print and fail included', () => {
  for (const body of [`${printing}{ log(1) }`, 'print(1)', 'fail(E)']) {
    const found = seen('type E = E; ' + logs + main(body));
    assert.equal(found.status, -1);
    assert.match(found.stderr, /^oracle error: unknown name \w+\n$/);
  }
  const value = seen('type E = E; fn main(): Unit = { let f = fail; () };');
  assert.equal(value.stderr, 'oracle error: unknown name fail\n');
});
