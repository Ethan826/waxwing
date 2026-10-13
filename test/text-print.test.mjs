import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejectedAt, runGo } from './support.mjs';
import { runGoBatch } from './go-batch.mjs';

// Text v1 design §1 and §4: nested quoting, comparison inside data, `show`
// and Text as a Fail payload. Runs are built once (T001).
const pair = 'type Pair = Pair(Text, Int); ';
const some = 'type Opt = None | Some(Text); ';
const box = 'type Box = Box(Text); ';
const list = 'type L = Nil | Cons(Text, L); ';
const glist = 'type List(a) = Nil | Cons(a, List(a)); ';
const err = 'type E = E(Text); ';
const main = (type, body) => `fn main(): ${type} = ${body};`;
const cases = [
  ['pair', pair + main('Pair', 'Pair("a b", 1)')],
  ['line', some + main('Opt', 'Some("line\\nbreak")')],
  ['bell', some + main('Opt', 'Some("\\u{7}\u{1F600}")')],
  ['escapes', some + main('Opt', 'Some("q\\"b\\\\t\\tr\\rd$")')],
  ['dollar', some + main('Opt', 'Some("\\${x} $ {} \\${")')],
  ['empty', some + main('Opt', 'Some("")')],
  ['nonprint', some + main('Opt', 'Some("\\u{85}\\u{a0}\\u{7f}\\u{FFFD}'
    + '\\u{2028}\\u{2029}\\u{1f}\\u{9f}\\u{ad}")')],
  ['bidi', some + main('Opt', 'Some("\\u{202A}\\u{202E}\\u{2066}\\u{2069}'
    + '\\u{202F}\\u{2065}\\u{206A}")')],
  ['show data', pair + main('Bool',
    'show(Pair("x", 2)) == "Pair(\\"x\\", 2)"')],
  ['show text', main('Bool', 'show("t") == "t"')],
  ['show int', main('Bool', 'show(5) == "5"')],
  ['show bool', main('Bool', 'show(true) == "true"')],
  ['show unit', main('Bool', 'show(()) == "()"')],
  ['show raw', main('Text', 'show("a\\nb")')],
  ['bare show', 'fn apply(f: Int -> Text): Text = f(7); '
    + main('Text', 'apply(show)')],
  ['show console', 'fn apply(f: (Int -> Text with Console)): Text '
    + 'with Console = f(7); fn main(): Unit with Console = '
    + 'print(apply(show));'],
  ['show fail', err + 'fn apply(f: (Int -> Text with Fail(E))): Text '
    + 'with Fail(E) = f(7); fn main(): Unit with Console = '
    + 'handle print(apply(show)) { fail(e: E) => print(0) };'],
  ['generic', glist + 'fn main(): Bool = show(Cons("a\\n", Nil)) == '
    + '"Cons(\\"a\\\\n\\", Nil)";'],
  ['generic print', glist + main('List(Text)',
    'Cons("a\\n", Cons("b", Nil))')],
  ['generic cmp', glist + main('Bool',
    'Cons("a", Nil) < Cons("b", Nil)')],
  ['generic cmp astral', glist + main('Bool',
    'Cons("\u{1F600}", Nil) > Cons("\\u{FFFD}", Nil)')],
  ['fail data key', err + 'fn work(): Int with Fail(E) = fail(E("x")); '
    + 'fn main(): Unit with Console = handle print(work()) '
    + '{ fail(e: E) => print(1) };'],
  ['fail int key', 'fn work(): Int with Fail(Int) = fail(3); '
    + 'fn main(): Unit with Console = handle print(work()) '
    + '{ fail(e: Int) => print(e) };'],
  ['astral', main('Bool', '"\u{1F600}" > "\\u{FFFD}"')],
  ['less', main('Bool', '"a" < "b"')],
  ['box', box + main('Bool', 'Box("b") > Box("a")')],
  ['box eq', box + main('Bool', 'Box("b") == Box("b")')],
  ['box astral', box + main('Bool',
    'Box("\u{1F600}") > Box("\\u{FFFD}")')],
  ['list', list + main('L', 'Cons("a", Cons("b\\n", Nil))')],
  ['list cmp', list + main('Bool',
    'Cons("a", Nil) < Cons("a", Cons("b", Nil))')],
  ['fail caught', err + 'fn work(): Int with Fail(E) = fail(E("bad")); '
    + 'fn main(): Unit with Console = handle print(work()) '
    + '{ fail(e: E) => print(e) };'],
  ['fail text', 'fn work(): Int with Fail(Text) = fail("bad\\n"); '
    + 'fn main(): Unit with Console = handle print(work()) '
    + '{ fail(e: Text) => print(e) };'],
  ['fail text and int', 'fn work(): Int with Fail(Text) + Fail(Int) = '
    + 'fail(4); fn main(): Unit with Console = handle '
    + 'handle print(work()) { fail(e: Text) => print(e) } '
    + '{ fail(n: Int) => print(n) };'],
  ['fail text report', 'fn work(): Unit with Fail(Text) = '
    + '{ defer crash(0); fail("bad\\n") }; '
    + 'fn main(): Unit with Console = '
    + 'handle work() { fail(e: Text) => print(7) };'],
  ['crash', 'fn main(): Unit = { defer crash("a\\nb"); () };'],
  ['crash plain', 'fn main(): Unit = crash("a\\nb");'],
  ['handler text', 'effect Greet { fn greet(n: Text): Text; }; '
    + 'fn main(): Unit with Console = with handler Greet '
    + '{ greet(n) => n } { print(greet("hi")) };'],
  ['defer text', 'fn main(): Unit with Console = '
    + '{ let t = "x"; defer print(t); () };']
].map(([name, source]) => [name, source]);
const batch = runGoBatch(import.meta.url, cases);
const out = (name, stdout) => test(name, () =>
  assert.equal(batch.run(name), stdout));

out('pair', 'Pair("a b", 1)\n');
out('line', 'Some("line\\nbreak")\n');
out('bell', 'Some("\\u{7}\u{1F600}")\n');
out('escapes', 'Some("q\\"b\\\\t\\tr\\rd$")\n');
out('dollar', 'Some("\\${x} $ {} \\${")\n');
out('empty', 'Some("")\n');
out('nonprint', 'Some("\\u{85}\u{a0}\\u{7f}\u{fffd}\\u{2028}\\u{2029}'
  + '\\u{1f}\\u{9f}\u{ad}")\n');
out('bidi', 'Some("\\u{202a}\\u{202e}\\u{2066}\\u{2069}\u{202f}\u{2065}\u{206a}")\n');
out('show data', 'true\n');
out('show text', 'true\n');
out('show int', 'true\n');
out('show bool', 'true\n');
out('show unit', 'true\n');
out('show raw', 'a\nb\n');
out('bare show', '7\n');
out('show console', '7\n');
out('show fail', '7\n');
out('generic', 'true\n');
out('generic print', 'Cons("a\\n", Cons("b", Nil))\n');
out('generic cmp', 'true\n');
out('generic cmp astral', 'true\n');
out('fail data key', '1\n');
out('fail int key', '3\n');
out('astral', 'true\n');
out('less', 'true\n');
out('box', 'true\n');
out('box eq', 'true\n');
out('box astral', 'true\n');
out('list', 'Cons("a", Cons("b\\n", Nil))\n');
out('list cmp', 'true\n');
out('fail caught', 'E("bad")\n');
out('fail text', 'bad\n\n');
out('fail text and int', '4\n');
out('handler text', 'hi\n');
out('defer text', 'x\n');

test('a Text failure with a crashing cleanup reports its text', () => {
  const result = batch.result('fail text report');
  assert.equal(result.status, 1);
  assert.equal(result.stderr,
    'fail(Text): bad\\n\ncleanup failed: crash: 0\n');
});

test('crash reports an embedded newline escaped', () => {
  for (const name of ['crash', 'crash plain']) {
    const result = batch.result(name);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /crash: a\\nb\n$/);
  }
});

test('show of a function is not printable', () => {
  const source = 'fn f(x: Int): Int = x; fn main(): Text = show(f);';
  assert.equal(rejectedAt(source, 'E_TYPE', 'f', 3).message,
    'Expected a printable value, found Int -> Int');
});

test('show takes exactly one argument', () => {
  rejectedAt('fn main(): Text = show();', 'E_ARITY', 'show()');
});

test('show is pure and leaves no Console demand', () => {
  checked('fn main(): Text = show(1);');
  checked('fn main(): Text = { let f = show; f(1) };');
});

test('the Fail keys keep their layout', () => {
  const data = checked(err + 'fn work(): Int with Fail(E) = fail(E("x")); '
    + 'fn main(): Unit with Console = handle print(work()) '
    + '{ fail(e: E) => print(1) };');
  assert.match(data, /, -4, /);
  const int = checked('fn work(): Int with Fail(Int) = fail(3); '
    + 'fn main(): Unit with Console = handle print(work()) '
    + '{ fail(e: Int) => print(e) };');
  assert.match(int, /, -1, /);
});

test('Text is reserved in a type position', () => {
  rejectedAt('type Text = A; fn main(): Int = 1;', 'E_SYNTAX', 'Text');
});

test('the Go literal of a Text is canonical and ASCII', () => {
  const go = checked('fn main(): Text = "a\\nb\u{1F600}";');
  assert.ok(go.includes('"a\\nb\\U0001f600"'), go);
});

test('Fail(Text) no longer needs a concrete error family', () => {
  checked('fn work(): Int with Fail(Text) = fail("x"); '
    + 'fn main(): Int = 1;');
});

test('Text has its own Fail key, below every existing one', () => {
  const go = checked('fn work(): Int with Fail(Text) = fail("x"); '
    + 'fn main(): Unit with Console = handle print(work()) '
    + '{ fail(e: Text) => print(e) };');
  assert.ok(go.includes('-2147483648'), go);
});
