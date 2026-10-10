// FX008 Task 3: `nofail` and `nofail(k)` in every row position, their
// resolution, and their printing. Marks never reach Go.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, rejectedAt, runGo } from './support.mjs';
import { keyTexts } from './poly-keys.mjs';
import { readFileSync } from 'node:fs';

const log = 'effect Log { fn log(n: Int): Unit; }; ';
const clock = 'effect Clock { fn now(): Int; }; ';
const main = ' fn main(): Int = 0;';
const handled = 'with handler Log { log(n) => print(n) }';

// The same source with every written mark removed.
const unmarked = source => source.replace(/nofail(?:\([a-z]+\))? (?=[A-Z])/g, '');

const positions = [
  ['with nofail Log', log + 'fn work(): Unit with nofail Log = log(1); '
    + `fn main(): Unit with Console = ${handled} { work() };`],
  ['with Console + nofail Log', log + 'fn work(): Unit with Console + nofail '
    + 'Log = { print(1); log(2) }; '
    + `fn main(): Unit with Console = ${handled} { work() };`],
  ['a row argument', log + 'type Box(...e) = Box(Unit -> Unit with ...e); '
    + 'fn use(b: Box(nofail Log)): Int = 0;' + main],
  ['a row argument after +', log + clock
    + 'type Box(...e) = Box(Unit -> Unit with ...e); '
    + 'fn use(b: Box(Clock + nofail Log)): Int = 0;' + main],
  ['a handled label with a row', log
    + 'fn make(): Handler(nofail Log with pure) = handler Log '
    + '{ log(n) => () };' + main],
  ['a bare handled label', log
    + 'fn make(): Handler(nofail Log) = handler Log { log(n) => () };' + main],
  ['a mark variable used twice', log + 'fn each(f: Unit -> Unit with '
    + 'nofail(k) Log): Unit with nofail(k) Log = f(()); '
    + 'fn twice(): Unit with nofail Log = { each(fn(u) => log(1)); '
    + 'each(fn(u) => log(2)) }; '
    + `fn main(): Unit with Console = ${handled} { twice() };`],
  ['a mark variable', log + 'fn work(f: Unit -> Unit with nofail(k) Log)'
    + ': Unit with nofail(k) Log = f(());' + main]
];

for (const [name, source] of positions) {
  test(`nofail parses in a row position: ${name}`, () => {
    assert.notEqual(source, unmarked(source));
    assert.equal(checked(source), checked(unmarked(source)));
  });
}

test('nofail is an ordinary name elsewhere', () => {
  const source = 'type Opt(a) = No | Some(a); fn nofail(x: Int): Int = x; '
    + 'fn g(y: Opt(nofail)): Int = { let nofail = 1; nofail }; '
    + 'fn main(): Int = nofail(2);';
  assert.equal(runGo(source), '2\n');
});

test('nofail on Fail is E_TYPE', () => {
  for (const mark of ['nofail', 'nofail(k)']) {
    const source = `type E = E; fn f(): Unit with ${mark} Fail(E) = fail(E);`
      + main;
    const found = rejectedAt(source, 'E_TYPE', 'Fail(E)');
    assert.equal(found.message, 'nofail does not apply to Fail');
  }
});

test('nofail on a row variable is E_SYNTAX', () => {
  const source = 'fn f(): Unit with nofail ...e = ();' + main;
  const found = rejectedAt(source, 'E_SYNTAX', 'nofail ...e');
  assert.equal(found.message, 'nofail ...e is not supported yet');
});

test('mark variables only in function signatures', () => {
  const field = log + 'type T = T(Unit -> Unit with nofail(k) Log);' + main;
  const operation = log + 'effect Op { fn op(f: Unit -> Unit with nofail(k) '
    + 'Log): Unit; };' + main;
  for (const source of [field, operation]) {
    const found = rejectedAt(source, 'E_TYPE', 'nofail(k)');
    assert.equal(found.message,
      'nofail(k) is allowed only in function signatures');
  }
});

test('a lambda names only its signature\'s mark variables', () => {
  const lambda = name => log + 'fn f(): Unit with nofail(k) Log = '
    + `{ let g = fn(x: Unit -> Unit with nofail(${name}) Log) => (); () };`
    + main;
  const found = rejectedAt(lambda('j'), 'E_UNBOUND', 'nofail(j)');
  assert.equal(found.message, 'Unbound mark variable j');
  assert.ok(checked(lambda('k')).length > 0);
});

test('a handler literal names only its signature\'s mark variables', () => {
  const literal = name => log + 'effect Tag(a) { fn tag(): a; }; '
    + 'fn f(): Unit with nofail(k) Log = { let h = handler Tag(Unit -> Unit '
    + `with nofail(${name}) Log) { tag() => fn(u) => () }; () };` + main;
  const found = rejectedAt(literal('j'), 'E_UNBOUND', 'nofail(j)');
  assert.equal(found.message, 'Unbound mark variable j');
  assert.ok(checked(literal('k')).length > 0);
});

test('x: k beside nofail(k) is a type variable', () => {
  const source = log + 'fn f(x: k): k with nofail(k) Log = x;' + main;
  assert.ok(checked(source).length > 0);
});

test('nofail Console is redundant', () => {
  const plain = 'fn f(): Unit with Console = print(1);' + main;
  for (const mark of ['nofail', 'nofail(k)']) {
    const source = `fn f(): Unit with ${mark} Console = print(1);` + main;
    assert.equal(checked(source), checked(plain));
  }
});

test('nofail prints in label messages, Console never', () => {
  const state = 'effect State(s) { fn put(value: s): Unit; }; '
    + 'fn f(): Unit with nofail State(Int) = put(true);' + main;
  const mismatch = rejectedAt(state, 'E_TYPE', 'put(true)');
  assert.equal(mismatch.message, 'Expected nofail State(Int), found State(Bool)');
  const callback = log + clock + 'fn f(k: Unit -> Unit with nofail Log + ...e)'
    + ': Unit with Clock + ...e = k(());' + main;
  const performed = rejected(callback, 'E_EFFECT');
  assert.equal(performed.message,
    'f performs nofail Log, which its signature does not allow');
  const console = log + 'fn g(k: Unit -> Unit with nofail Console + Log)'
    + ': Unit with Log = k(());' + main;
  const shown = rejected(console, 'E_EFFECT');
  assert.ok(shown.message.includes('Console'), shown.message);
  assert.ok(!shown.message.includes('nofail Console'), shown.message);
});

test('an arrow prints its row only when it holds a mark', () => {
  const marked = log + 'fn f(k: Unit -> Unit with nofail Log): Int = k;' + main;
  assert.equal(rejected(marked, 'E_TYPE').message,
    'Expected Int, found Unit -> Unit with nofail Log');
  const variable = log + 'fn f(k: Unit -> Unit with nofail(m) Log): Int = k;'
    + main;
  assert.equal(rejected(variable, 'E_TYPE').message,
    'Expected Int, found Unit -> Unit with nofail(m) Log');
  const plain = log + 'fn f(k: Unit -> Unit with Log): Int = k;' + main;
  assert.equal(rejected(plain, 'E_TYPE').message,
    'Expected Int, found Unit -> Unit');
  const handler = log + 'fn f(h: Handler(nofail Log with pure)): Int = h;'
    + main;
  assert.equal(rejected(handler, 'E_TYPE').message,
    'Expected Int, found Handler(nofail Log)');
});

test('marks never reach Go', () => {
  const answer = readFileSync(new URL('../examples/answer.wxw', import.meta.url),
    'utf8');
  const sources = [...positions.map(([, source]) => source), answer];
  for (const source of sources) {
    assert.deepEqual(keyTexts(source), keyTexts(unmarked(source)));
  }
});
