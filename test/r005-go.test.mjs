import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, runGo } from './support.mjs';

// R005 Task 3: extension, removal and rest binders lowered to Go (design
// §1-§4). Items of a spread literal evaluate left to right, the base once;
// `without` evaluates its receiver once; a named rest binds a struct of the
// remaining fields, whose layout is emitted even when nothing else has that
// shape; `{}` is the empty struct, printed `{}` beside Unit's `()`. Every
// program is executed.
const tick = 'fn tick(n: Int): Int with Console = { Console.print(n); n }; ';
const middle = 'fn middle(): { m: Int } with Console = { '
  + 'Console.print(2); { m: 20 } }; ';
const layouts = go => (go.match(/^type waxwingRec\d+ struct/gm) ?? []).length;

test('items evaluate in written order, the spread once', () => {
  const source = `${tick}${middle}fn main(): Unit with Console = { `
    + 'Console.print({ a: tick(1), ...middle(), b: tick(3) }) };';
  assert.equal(runGo(source), '1\n2\n3\n{ a: 1, b: 3, m: 20 }\n');
});

test('a spread first and a spread last keep their place', () => {
  const first = `${tick}${middle}fn main(): Unit with Console = { `
    + 'Console.print({ ...middle(), a: tick(1), b: tick(3) }) };';
  assert.equal(runGo(first), '2\n1\n3\n{ a: 1, b: 3, m: 20 }\n');
  const last = `${tick}${middle}fn main(): Unit with Console = { `
    + 'Console.print({ b: tick(3), a: tick(1), ...middle() }) };';
  assert.equal(runGo(last), '3\n1\n2\n{ a: 1, b: 3, m: 20 }\n');
});

test('an open row is extended at two rows', () => {
  const source = 'fn grant(p: { name: Text, ...r }): { admin: Bool, '
    + 'name: Text, ...r } where r lacks { admin } = { ...p, admin: true }; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(grant({ name: "Ada", id: 7 })); '
    + 'Console.print(grant({ tag: false, name: "Bo", age: 3 })); '
    + 'Console.print(grant({ name: "Cy" })) };';
  assert.equal(runGo(source),
    '{ admin: true, id: 7, name: "Ada" }\n'
    + '{ admin: true, age: 3, name: "Bo", tag: false }\n'
    + '{ admin: true, name: "Cy" }\n');
});

test('removal evaluates its receiver once and keeps the rest', () => {
  const source = 'fn make(): { a: Int, b: Int, c: Int } with Console = { '
    + 'Console.print(0); { c: 3, b: 2, a: 1 } }; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(make() without { a, c }) };';
  assert.equal(runGo(source), '0\n{ b: 2 }\n');
});

test('removal to {} prints {} beside the Unit value', () => {
  const source = 'fn bare(p: { name: Text }): {} = p without { name }; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(bare({ name: "Ada" })); Console.print(()) };';
  assert.equal(runGo(source), '{}\n()\n');
});

test('empty records are equal and show as {}', () => {
  const source = 'fn bare(p: { name: Text }): {} = p without { name }; '
    + 'fn main(): Unit with Console = { '
    + 'let x = bare({ name: "Ada" }); let y = bare({ name: "Bo" }); '
    + 'Console.print(x == y); Console.print(x < y); '
    + 'Console.print({ n: 1, ...x }); Console.print(show(x)) };';
  assert.equal(runGo(source), 'true\nfalse\n{ n: 1 }\n{}\n');
});

test('a named rest is used in the body', () => {
  const source = 'fn split(p: { name: Text, ...r }): { ...r } = '
    + 'match p { { name, ...others } => others }; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(split({ name: "Ada", id: 7, ok: true })); '
    + 'Console.print(split({ name: "Bo" })) };';
  assert.equal(runGo(source), '{ id: 7, ok: true }\n{}\n');
});

test('a closed named rest binds the remaining fields', () => {
  const source = 'fn age(p: { name: Text, age: Int, id: Int }): Int = '
    + 'match p { { name, ...more } => more.age + more.id }; '
    + 'fn main(): Int = age({ id: 1, age: 41, name: "Ada" });';
  assert.equal(runGo(source), '42\n');
});

test('an unused named rest still emits its layout and builds', () => {
  const source = 'fn first(p: { a: Int, b: Text }): Int = '
    + 'match p { { a, ...unused } => a }; '
    + 'fn main(): Int = first({ a: 1, b: "x" });';
  const go = checked(source);
  assert.equal(layouts(go), 2);
  assert.equal(runGo(source), '1\n');
});

test('bare ... and no rest are unchanged', () => {
  const source = 'fn f(p: { a: Int, b: Int }): Int = match p { '
    + '{ a, ... } => a }; fn g(p: { a: Int, b: Int }): Int = match p { '
    + '{ a, b } => a + b }; '
    + 'fn main(): Int = f({ a: 1, b: 2 }) + g({ a: 3, b: 4 });';
  assert.equal(layouts(checked(source)), 1);
  assert.equal(runGo(source), '8\n');
});

const list = 'type L = Nil | Cons(Int, L); ';

test('an ADT-valued field is carried as a pointer', () => {
  const source = `${list}fn grow(p: { xs: L, n: Int, ...r }): `
    + '{ extra: Int, xs: L, n: Int, ...r } where r lacks { extra } = '
    + '{ ...p, extra: 1 }; '
    + 'fn drop(p: { xs: L, n: Int }): { xs: L } = p without { n }; '
    + 'fn tail(p: { xs: L, n: Int }): L = '
    + 'match p { { n, ...more } => more.xs }; '
    + 'fn main(): Unit with Console = { '
    + 'let p = { xs: Cons(1, Cons(2, Nil)), n: 5 }; '
    + 'Console.print(grow(p)); Console.print(drop(p)); '
    + 'Console.print(tail(p)); Console.print(grow(p).xs == tail(p)) };';
  assert.equal(runGo(source),
    '{ extra: 1, n: 5, xs: Cons(1, Cons(2, Nil)) }\n'
    + '{ xs: Cons(1, Cons(2, Nil)) }\nCons(1, Cons(2, Nil))\ntrue\n');
});

test('a program with written lacks runs', () => {
  const source = 'fn granted(p: { ...r }): Bool where r lacks { admin } = '
    + '{ ...p, admin: true }.admin; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(granted({ name: 1 })); '
    + 'Console.print(granted({ id: "x", n: 2 })) };';
  assert.equal(runGo(source), 'true\ntrue\n');
});
