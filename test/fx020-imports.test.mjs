import test from 'node:test';
import assert from 'node:assert/strict';
import { runGo, rejectedAt } from './support.mjs';
import { expectDiagnostic, db, state } from './fx-diagnostics-support.mjs';

// FX020 Task 3: aliases and imports in a function's own row.
const logs = 'effect Log { fn log(n: Int): Unit; fn info(n: Int): Unit; }; ';
const database = 'effect Database { fn query(id: Int): Int; }; ';
const printing = 'with handler Log { log(n) => Console.print(n), '
  + 'info(n) => Console.print(n + 100) } ';
const main = body => 'fn main(): Unit with Console = ' + body + ';';
const placement = "Imports and aliases are allowed only in a function's "
  + 'own row';

test('an import binds the bare name; trailing comma and rename work', () => {
  const source = logs + 'fn f(): Unit with Log { log, info as note, } = '
    + '{ log(1); note(2) }; ' + main(printing + '{ f() }');
  assert.equal(runGo(source), '1\n102\n');
});

test('an alias leaves the canonical name valid', () => {
  const source = database + 'fn f(): Int with Database as D = '
    + 'D.query(1) + Database.query(2); fn main(): Unit with Console = '
    + 'with handler Database { query(id) => id + 10 } { Console.print(f()) };';
  assert.equal(runGo(source), '23\n');
});

test('marks combine with imports: nofail Log { log }', () => {
  const source = logs + 'fn f(): Unit with nofail Log { log } = log(1); '
    + main(printing + '{ f() }');
  assert.equal(runGo(source), '1\n');
});

test('Console { print } and Fail(E) { fail } import built-ins', () => {
  const source = db + 'fn f(): Int with Fail(DbError) { fail } = '
    + 'fail(DbError); fn g(): Unit with Console { print } = print(1); '
    + 'fn main(): Unit with Console = { g(); '
    + 'Console.print(handle f() { fail(error: DbError) => 7 }) };';
  assert.equal(runGo(source), '1\n7\n');
});

test('an import shadows a global function', () => {
  const source = logs + 'fn log(n: Int): Int = n + 1; '
    + 'fn f(): Unit with Log { log } = log(1); ' + main(printing + '{ f() }');
  assert.equal(runGo(source), '1\n');
});

// Review Focus 1.
test('a parameter, a let and a lambda binder each shadow an import', () => {
  const run = (text, shown) => runGo(logs + 'fn ' + text
    + ' fn main(): Unit with Console = ' + printing
    + `{ Console.print(${shown}) };`);
  assert.equal(run('f(log: Int): Int with Log { log } = log + 1;', 'f(4)'),
    '5\n');
  assert.equal(run('f(): Int with Log { log } = { let log = 7; log + 1 };',
    'f()'), '8\n');
  assert.equal(run('f(): Int with Log { log } = (fn(log: Int) => log + 2)(5);',
    'f()'), '7\n');
});

test('a wrong-typed inner binder is a type error, not the import', () => {
  const source = logs + 'fn f(): Unit with Log { log } = '
    + '{ let log = 5; log(1) }; fn main(): Unit = ();';
  expectDiagnostic(source, {
    code: 'E_TYPE', message: 'Expected a function, found Int',
    at: ['log(1)', '1'], notes: []
  });
  const lambda = logs + 'fn f(): Unit with Log { log } = '
    + '(fn(log: Bool) => log(1))(true); fn main(): Unit = ();';
  expectDiagnostic(lambda, {
    code: 'E_TYPE', message: 'Expected a function, found Bool',
    at: ['log(1)', '1'], notes: []
  });
});

test('two Fail families each check their own payload', () => {
  const families = 'type E1 = E1(Int); type E2 = E2(Int); '
    + 'fn both(): Int with Fail(E1) { fail as f1 } + Fail(E2) '
    + '{ fail as f2 } = { f2(E2(2)); f1(E1(1)) }; '
    + 'fn main(): Unit with Console = Console.print(handle handle both() '
    + '{ fail(error: E1) => 10 } { fail(error: E2) => 20 });';
  assert.equal(runGo(families), '20\n');
  const wrong = families.replace('f1(E1(1))', 'f1(E2(1))');
  expectDiagnostic(wrong, {
    code: 'E_TYPE', message: 'Expected E1, found E2', at: ['E2(1)'],
    notes: []
  });
});

test('Fail.fail(e) infers its family even beside an import', () => {
  const source = 'type E1 = E1(Int); type E2 = E2(Int); '
    + 'fn both(): Int with Fail(E1) { fail } + Fail(E2) = '
    + '{ Fail.fail(E2(2)); fail(E1(1)) }; '
    + 'fn main(): Unit with Console = Console.print(handle handle both() '
    + '{ fail(error: E1) => 10 } { fail(error: E2) => 20 });';
  assert.equal(runGo(source), '20\n');
});

test('an imported fail passed as a value is the family operation', () => {
  const use = 'type E = E(Int); fn apply(f: E -> Int with Fail(E)): Int '
    + 'with Fail(E) = f(E(3)); ';
  const source = use + 'fn run(): Int with Fail(E) { fail } = apply(fail); '
    + 'fn main(): Unit with Console = Console.print(handle run() '
    + '{ fail(error: E) => match error { E(n) => n } });';
  assert.equal(runGo(source), '3\n');
  const wrong = 'type E = E(Int); fn run(): Int with Fail(E) { fail } = '
    + 'fail(1); fn main(): Int = 1;';
  expectDiagnostic(wrong, {
    code: 'E_TYPE', message: 'Expected E, found Int', at: ['1'], notes: []
  });
});

test('an import through a parameterised effect works', () => {
  const source = state + 'fn f(): Int with State(Int) { get } = get() + 1; '
    + 'fn main(): Unit with Console = Console.print(with handler State(Int) '
    + '{ get() => 41, put(value) => () } { f() });';
  assert.equal(runGo(source), '42\n');
});

test('a parameterised import means the row\'s instantiation', () => {
  const source = state + 'fn f(): Unit with State(Int) { put } = put(true); '
    + 'fn main(): Unit = ();';
  expectDiagnostic(source, {
    code: 'E_TYPE', message: 'Expected State(Int), found State(Bool)',
    at: ['put(true)'],
    notes: [[
      'fn f(): Unit with State(Int) { put } = put(true);',
      'fn f(): Unit with State(Int) { put } = put(true);',
      'the innermost State(Int) is here']]
  });
});

test('two imports of one name give one error, at the second', () => {
  const source = logs + 'fn f(): Unit with Log { log as note, info as note }'
    + ' = note(1); fn main(): Unit = ();';
  expectDiagnostic(source, {
    code: 'E_SYNTAX', message: 'note is imported twice in this signature',
    at: ['info as note', 'note', 8],
    notes: [['log as note', 'note', 'first imported here', 4]]
  });
});

test('an alias equal to a declared effect, even absent, is refused', () => {
  const source = logs + database + 'fn f(): Int with Database as Log = 1; '
    + 'fn main(): Unit = ();';
  expectDiagnostic(source, {
    code: 'E_SYNTAX', message: 'Log is already an effect name',
    at: ['as Log', 'Log'],
    notes: [['effect Log', 'Log', 'declared here', 7]]
  });
});

test('an alias equal to an earlier alias is refused', () => {
  const source = logs + database + 'fn f(): Int with Database as D + Log as D'
    + ' = 1; fn main(): Unit = ();';
  expectDiagnostic(source, {
    code: 'E_SYNTAX', message: 'D is already an effect name',
    at: ['Log as D', 'D', 7],
    notes: [['Database as D', 'D', 'first bound here', 12]]
  });
});

test('an alias equal to a built-in effect has no declared note', () => {
  for (const name of ['Console', 'Fail']) {
    const source = logs + `fn f(): Unit with Log as ${name} = (); `
      + 'fn main(): Unit = ();';
    expectDiagnostic(source, {
      code: 'E_SYNTAX', message: `${name} is already an effect name`,
      at: [`as ${name}`, name], notes: []
    });
  }
});

test('an unknown import is the existing operation error', () => {
  const source = logs + 'fn f(): Unit with Log { log, nope } = (); '
    + 'fn main(): Unit = ();';
  const found = expectDiagnostic(source, {
    code: 'E_HANDLER', message: 'nope is not an operation of Log',
    at: ['{ log, nope }', 'nope'], notes: []
  });
  assert.equal(found.related.length, 0);
});

test('aliases and imports outside a function row are refused', () => {
  const cases = [
    ['fn f(g: Int -> Int with Log as L): Int = 1; fn main(): Int = 1;',
      'as L', 'L'],
    ['fn f(g: Int -> Int with Log { log }): Int = 1; fn main(): Int = 1;',
      '{ log }', '{'],
    ['fn f(h: Handler(nofail Log as L)): Int = 1; fn main(): Int = 1;',
      'as L', 'L'],
    ['fn f(h: Handler(Log as L)): Int = 1; fn main(): Int = 1;',
      'as L', 'L'],
    ['fn f(h: Handler(Log { log })): Int = 1; fn main(): Int = 1;',
      '{ log }', '{'],
    ['fn f(h: Handler(Log with Log as L)): Int = 1; fn main(): Int = 1;',
      'as L', 'L'],
    ['fn f(h: Handler(Log with Log { log })): Int = 1; fn main(): Int = 1;',
      '{ log }', '{'],
    ['fn main(): Int = (fn(g: Int -> Int with Log as L) => 1)(1);',
      'as L', 'L'],
    ['fn f(): Int -> Int with Log as L = 1; fn main(): Int = 1;',
      'as L', 'L'],
    ['effect Op { fn go(): Int with Log as L; }; fn main(): Int = 1;',
      'as L', 'L'],
    ['type T = T(Int -> Int with Log as L); fn main(): Int = 1;',
      'as L', 'L']
  ];
  for (const [body, container, inner] of cases) {
    expectDiagnostic(logs + body, {
      code: 'E_SYNTAX', message: placement, at: [container, inner],
      notes: []
    });
  }
});
