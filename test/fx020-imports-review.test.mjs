import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { runGo } from './support.mjs';
import { expectDiagnostic, state } from './fx-diagnostics-support.mjs';

// FX020 Task 3 review round 1: more aliases-and-imports behaviour.
const logs = 'effect Log { fn log(n: Int): Unit; fn info(n: Int): Unit; }; ';
const printing = 'with handler Log { log(n) => Console.print(n), '
  + 'info(n) => Console.print(n + 100) } ';
const main = body => 'fn main(): Unit with Console = ' + body + ';';

const goOf = source => {
  const result = compile(source);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0;
};

// Review round 1 (R12): an imported fail(x) is the node Fail.fail(x) is.
test('an imported fail(x) reports and emits as Fail.fail(x) does', () => {
  const head = 'type E = E(Int); fn f(): Int with Fail(E)';
  const tail = '; fn main(): Int = handle f() { fail(error: E) => 0 };';
  const deferred = (call, imports) => head + imports
    + ` = { defer ${call}; 1 }` + tail;
  const shape = call => ({
    code: 'E_EFFECT',
    message: 'defer must not fail, but it performs Fail(E)',
    at: [`defer ${call}`],
    notes: [[`defer ${call}`, call.slice(0, -1),
      'Fail(E) is raised here']]
  });
  expectDiagnostic(deferred('fail(E(1))', ' { fail }'), shape('fail(E(1))'));
  expectDiagnostic(deferred('Fail.fail(E(1))', ''),
    shape('Fail.fail(E(1))'));
  const run = (call, imports) => head + imports + ` = ${call}` + tail;
  assert.equal(goOf(run('fail(E(1))', ' { fail }')),
    goOf(run('Fail.fail(E(1))', '')));
});

// Review round 1 (R11): pinned behaviour of a duplicated user effect label.
test('an import from a second State label binds the first', () => {
  const second = state + 'fn f(): Bool with State(Int) { get } + '
    + 'State(Bool) { get as g2 } = g2(); fn main(): Unit = ();';
  expectDiagnostic(second, {
    code: 'E_TYPE', message: 'Expected Bool, found Int', at: ['g2()'],
    notes: []
  });
  const both = state + 'fn f(): Int with State(Int) { get as outer } + '
    + 'State(Int) { get as inner } = outer() + inner(); '
    + 'fn main(): Unit with Console = Console.print('
    + 'with handler State(Int) { get() => 4, put(value) => () } '
    + 'with handler State(Int) { get() => 5, put(value) => () } { f() });';
  // Both imports perform on the label a perform reaches: 5 + 5.
  assert.equal(runGo(both), '10\n');
});

test('a lambda body uses an inherited import', () => {
  const source = logs + 'fn f(): Unit with Log { log } = '
    + '(fn(n: Int) => log(n + 1))(1); ' + main(printing + '{ f() }');
  assert.equal(runGo(source), '2\n');
});

test('an alias and imports on one label work together', () => {
  const source = logs + 'fn f(): Unit with Log as L { log } = '
    + '{ log(1); L.info(2); Log.log(3) }; ' + main(printing + '{ f() }');
  assert.equal(runGo(source), '1\n102\n3\n');
});

test('a pattern binder shadows an import', () => {
  const source = logs + 'fn f(x: Int): Int with Log { log } = '
    + 'match x { log => log + 1 }; fn main(): Unit with Console = '
    + printing + '{ Console.print(f(4)) };';
  assert.equal(runGo(source), '5\n');
});

test('an unknown import is reported before a later duplicate', () => {
  const unknownFirst = logs + 'fn f(): Unit with Log { log, nope, info as '
    + 'log } = (); fn main(): Unit = ();';
  expectDiagnostic(unknownFirst, {
    code: 'E_HANDLER', message: 'nope is not an operation of Log',
    at: ['nope'], notes: []
  });
  const duplicateFirst = logs + 'fn f(): Unit with Log { log, info as log, '
    + 'nope } = (); fn main(): Unit = ();';
  expectDiagnostic(duplicateFirst, {
    code: 'E_SYNTAX', message: 'log is imported twice in this signature',
    at: ['info as log', 'log'],
    notes: [['{ log, info', 'log', 'first imported here']]
  });
});
