import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejectedAt, runGo } from './support.mjs';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';
import { familiesFit } from '../output/Format.Go.Families/index.js';

// R001 Task 8 (design §3a): a record payload's Fail family is its sorted
// label set; its field types play the part of a declared type's
// arguments. Runtime keys of label sets count up from MinInt32 + 1.
const family = 'Fail needs a concrete error family';
const hint = 'use ...e to pass through what a callback performs, a concrete '
  + 'family such as Fail(DbError), or return a Result';
const minInt32 = -2147483648;

test('a reordered payload is caught by its family', () => {
  const source = 'fn work(): Int with Fail({ a: Int, b: Int }) = '
    + 'Fail.fail({ b: 2, a: 1 }); '
    + 'fn main(): Unit with Console = Console.print(handle work() '
    + '{ fail(error: { b: Int, a: Int }) => error.a + error.b + error.b });';
  assert.equal(runGo(source), '5\n');
});

const families = 'fn raise(n: Int): Int '
  + 'with Fail({ code: Int }) + Fail({ msg: Text }) = '
  + 'if n == 0 then Fail.fail({ code: 7 }) '
  + 'else if n == 1 then Fail.fail({ msg: "m" }) else n; '
  + 'fn caught(n: Int): Text = handle show(raise(n)) '
  + '{ fail(e: { code: Int }) => "code ${show(e.code)}", '
  + 'fail(e: { msg: Text }) => "msg ${e.msg}" }; ';

test('two label sets are two families, each abort to its own', () => {
  const source = `${families}fn main(): Unit with Console = { `
    + 'Console.print(caught(0)); Console.print(caught(1)); '
    + 'Console.print(caught(2)) };';
  assert.equal(runGo(source), 'code 7\nmsg m\n2\n');
});

test('nested handlers of two label sets each catch their own', () => {
  const source = `${families}fn inner(n: Int): Int with Fail({ msg: Text }) `
    + '= handle raise(n) { fail(e: { code: Int }) => e.code }; '
    + 'fn outer(n: Int): Int = handle inner(n) '
    + '{ fail(e: { msg: Text }) => 100 }; '
    + 'fn main(): Unit with Console = { Console.print(outer(0)); '
    + 'Console.print(outer(1)); Console.print(outer(2)) };';
  assert.equal(runGo(source), '7\n100\n2\n');
});

// Keys follow the sorted canonical label lists, not first use.
test('label-set keys count up from MinInt32 + 1 in sorted order', () => {
  const go = checked(`${families}fn main(): Text = caught(1);`);
  assert.ok(go.includes(`waxwingFrame(ctx, ${minInt32 + 2}, marker1)`), go);
  assert.ok(go.includes(`waxwingFrame(waxwingFrame(ctx, ${minInt32 + 2}`),
    go);
  assert.match(go, new RegExp(`\\(ctx, ${minInt32 + 1}, `));
  assert.match(go, new RegExp(`waxwingFail\\[int32\\]\\(ctx, ${
    minInt32 + 1}, waxwingRec`));
});

// Here first use is not sorted order: `{ zed }` is declared, raised and
// handled before `{ alpha }`, yet `{ alpha }` sorts first and takes the
// first key.
test('label-set keys follow sorted order, not first use', () => {
  const go = checked('fn raise(n: Int): Int '
    + 'with Fail({ zed: Int }) + Fail({ alpha: Text }) = '
    + 'if n == 0 then Fail.fail({ zed: 7 }) '
    + 'else Fail.fail({ alpha: "m" }); '
    + 'fn main(): Text = handle show(raise(1)) '
    + '{ fail(e: { zed: Int }) => "zed", '
    + 'fail(e: { alpha: Text }) => e.alpha };');
  assert.match(go, new RegExp(`waxwingFail\\[int32\\]\\(ctx, ${
    minInt32 + 2}, waxwingRec\\d+\\{f_zed: `), go);
  assert.match(go, new RegExp(`waxwingFail\\[int32\\]\\(ctx, ${
    minInt32 + 1}, waxwingRec\\d+\\{f_alpha: `), go);
  assert.ok(go.includes(`waxwingFrame(waxwingFrame(ctx, ${minInt32 + 1}`),
    go);
});

test('one family across two functions shares one key', () => {
  const source = 'fn one(): Int with Fail({ x: Int, y: Bool }) = '
    + 'Fail.fail({ y: true, x: 1 }); '
    + 'fn two(): Int with Fail({ y: Bool, x: Int }) = '
    + 'Fail.fail({ x: 2, y: false }); '
    + 'fn main(): Unit with Console = Console.print(handle one() + two() '
    + '{ fail(e: { x: Int, y: Bool }) => e.x });';
  const go = checked(source);
  assert.equal(go.split(`${minInt32 + 1}`).length - 1, 3, go);
  assert.equal(runGo(source), '1\n');
});

test('same labels with other field types are the existing mismatch', () => {
  const source = 'fn w(b: Bool): Int with Fail({ code: Int }) = '
    + 'if b then Fail.fail({ code: 1 }) else Fail.fail({ code: "x" }); '
    + 'fn main(): Int = 0;';
  // A fail's span ends at its payload, as today.
  const diagnostic = rejectedAt(source, 'E_TYPE',
    'Fail.fail({ code: "x" }');
  assert.equal(diagnostic.message, 'Expected Int, found Text');
});

test('same labels in one handle are the existing mismatch', () => {
  const source = 'fn main(): Int = handle { if true then '
    + 'Fail.fail({ code: 1 }) else Fail.fail({ code: true }) } '
    + '{ fail(e: { code: Int }) => e.code };';
  const diagnostic = rejectedAt(source, 'E_TYPE',
    'Fail.fail({ code: true }');
  assert.equal(diagnostic.message, 'Expected Int, found Bool');
});

test('an open payload in a signature is refused where written', () => {
  const source = 'fn f(x: { code: Int, ...r }): Int '
    + 'with Fail({ code: Int, ...r }) = 0; fn main(): Int = 0;';
  const written = 'Fail({ code: Int, ...r })';
  expectDiagnostic(source, {
    code: 'E_TYPE', message: family, at: [written],
    notes: [[written, written, hint]]
  });
});

test('an open payload in a handle clause is refused where written', () => {
  const source = 'fn f(x: { code: Int, ...r }): Int = handle 0 '
    + '{ fail(e: { code: Int, ...r }) => 1 }; fn main(): Int = 0;';
  const written = '{ code: Int, ...r }';
  const clause = `fail(e: ${written})`;
  expectDiagnostic(source, {
    code: 'E_TYPE', message: family, at: [clause, written],
    notes: [[clause, written, hint]]
  });
});

test('an open payload failed in generic code needs a family', () => {
  const source = 'fn f(x: { code: Int, ...r }): Int with ...e = '
    + 'Fail.fail(x); fn main(): Int = 0;';
  // A fail's span ends at its payload, as today.
  const diagnostic = rejectedAt(source, 'E_TYPE', 'Fail.fail(x');
  assert.equal(diagnostic.message, family);
});

test('a payload whose labels stay unknown needs a family', () => {
  const source = 'fn main(): Int = { let f = fn(r) => Fail.fail(r { a = 1 }); '
    + '0 };';
  const diagnostic = rejectedAt(source, 'E_TYPE', 'Fail.fail(r { a = 1 }');
  assert.equal(diagnostic.message, family);
});

// A deferred key settles once the payload's labels are known.
test('a payload known only later settles its family', () => {
  const source = 'fn main(): Unit with Console = Console.print(handle { '
    + 'let f = fn(r) => Fail.fail(r); f({ code: 4 }) + 0 } '
    + '{ fail(e: { code: Int }) => e.code + 1 });';
  assert.equal(runGo(source), '5\n');
});

// Existing keys are unchanged (ADR 010).
test('Int, Bool, Unit, data and Text keys are unchanged', () => {
  const go = checked('type E = E; type F = F; '
    + 'fn main(): Unit with Console = Console.print(handle 0 '
    + '{ fail(e: Int) => 1, fail(e: Bool) => 2, fail(e: Unit) => 3, '
    + 'fail(e: F) => 4, fail(e: Text) => 5, fail(e: { a: Int }) => 6 });');
  for (const key of [-1, -2, -3, -5, minInt32, minInt32 + 1]) {
    assert.ok(go.includes(`, ${key}, marker`), `${key}\n${go}`);
  }
});

// Review Focus 5: records in effect operations and handlers.
const store = 'effect Store { '
  + 'fn put(p: { name: Text, age: Int }): { name: Text, age: Int }; }; ';

test('an operation takes and returns a record', () => {
  const source = `${store}fn main(): Unit with Console = `
    + 'with handler Store { put(p) => { age: p.age + p.age, name: "Bo" } } '
    + '{ Console.print(Store.put({ age: 18, name: "Ada" })) };';
  assert.equal(runGo(source), '{ age: 36, name: "Bo" }\n');
});

test('a handler clause updates the record it is given', () => {
  const source = `${store}fn older(p: { age: Int, ...r }): { age: Int, ...r } `
    + '= p { age = p.age + 1 }; '
    + 'fn main(): Unit with Console = '
    + 'with handler Store { put(p) => older(p) { name = "${p.name}!" } } '
    + '{ let q = Store.put({ name: "Ada", age: 36 }); '
    + 'Console.print(q); Console.print(Store.put(q).age) };';
  assert.equal(runGo(source), '{ age: 37, name: "Ada!" }\n38\n');
});

const log = 'effect Log { fn log(n: Int): Unit; }; ';
// How many times `text` occurs before `anchor`, plus `offset`: the `nth`
// of rejectedAt for the occurrence `offset` characters into `anchor`.
const before = (source, text, anchor, offset = 0) =>
  source.slice(0, source.indexOf(anchor) + offset).split(text).length - 1;
const environment = 'fn run(e: { logger: Handler(Log with Console), '
  + 'base: Int }): Unit with Console = with e.logger { Log.log(e.base) }; ';
const made = '{ base: 4, logger: handler Log { log(n) => '
  + 'Console.print(n + 1) } }';

test('a record field holds a handler that is installed', () => {
  const source = `${log}${environment}fn main(): Unit with Console = `
    + `{ let e = ${made}; run(e); run(e { base = 9 }) };`;
  assert.equal(runGo(source), '5\n10\n');
});

test('a record holding a handler is not printable', () => {
  const source = `${log}fn main(): Unit with Console = `
    + `{ let e = ${made}; Console.print(e) };`;
  const diagnostic = rejectedAt(source, 'E_TYPE', 'e',
    before(source, 'e', 'print(e)', 'print('.length));
  assert.equal(diagnostic.message,
    'Expected a printable value, found { base: Int, logger: Handler(Log) }');
});

test('a record holding a handler is not comparable', () => {
  const source = `${log}fn main(): Bool with Console = `
    + `{ let e = ${made}; e == e };`;
  // At the left operand, as today.
  const diagnostic = rejectedAt(source, 'E_TYPE', 'e',
    before(source, 'e', 'e == e'));
  assert.equal(diagnostic.message,
    'Type { base: Int, logger: Handler(Log) } is not comparable');
});

// The emitter's refusal: label-set keys from MinInt32 + 1 must stay below
// the declared types' keys, -4 - id. No source reaches it (it takes two
// billion families), so the boundary is tested on the formula itself.
test('label-set keys stop short of the declared-type range', () => {
  const below = 2147483644;
  assert.equal(familiesFit(below - 1)(0), true);
  assert.equal(familiesFit(below)(0), false);
  assert.equal(familiesFit(below - 11)(10), true);
  assert.equal(familiesFit(below - 10)(10), false);
  assert.equal(familiesFit(0)(2147483647), false);
});
