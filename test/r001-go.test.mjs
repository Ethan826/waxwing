import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, goTest, runGo } from './support.mjs';
import { keyTexts } from './poly-keys.mjs';

// R001 Task 7: records lowered to Go value structs (design §5). One struct
// per closed shape, fields in sorted label order; literals and updates
// evaluate in written order; helpers only when used.
const structs = go => go.match(/^type waxwingRec\d+ struct/gm) ?? [];

test('{ x: Int } and { x: Text } are two structs', () => {
  const go = checked('fn a(): { x: Int } = { x: 1 }; '
    + 'fn b(): { x: Text } = { x: "t" }; fn main(): Int = a().x;');
  assert.equal(structs(go).length, 2);
});

test('two orderings of one shape are one struct', () => {
  const source = 'fn f(): { a: Int, b: Bool } = { b: true, a: 1 }; '
    + 'fn g(x: { b: Bool, a: Int }): Int = x.a; fn main(): Int = g(f());';
  assert.equal(structs(checked(source)).length, 1);
  assert.equal(runGo(source), '1\n');
});

test('calls with reordered rows share one function copy', () => {
  const source = 'fn get(x: { a: Int, ...r }): Int = x.a; '
    + 'fn main(): Int = get({ a: 1, b: true, c: "x" }) '
    + '+ get({ c: "y", b: false, a: 2 });';
  assert.deepEqual(keyTexts(source).filter(key => key.startsWith('fn get')),
    ['fn get[{ b: Bool, c: Text }]']);
  assert.equal(runGo(source), '3\n');
});

// Review Focus 3: one record through two generic functions with different
// tails, and through a generic function calling them, read back whole.
const people = 'fn make(): { name: Text, age: Int, id: Int } = '
  + '{ id: 7, name: "Ada", age: 36 }; '
  + 'fn rename(p: { name: Text, ...r }, n: Text): { name: Text, ...r } = '
  + 'p { name = n }; '
  + 'fn older(p: { age: Int, ...r }): { age: Int, ...r } = '
  + 'p { age = p.age + 1 }; '
  + 'fn both(p: { name: Text, age: Int, ...r }): '
  + '{ name: Text, age: Int, ...r } = older(rename(p, "Cy")); ';

test('a record crosses generic boundaries with different tails', () => {
  const source = `${people}fn main(): Unit with Console = { `
    + 'Console.print(older(rename(make(), "Bo"))); '
    + 'Console.print(both(make()).id) };';
  assert.equal(runGo(source), '{ age: 37, id: 7, name: "Bo" }\n7\n');
  const keys = keyTexts(source).filter(key => key.startsWith('fn '));
  assert.ok(keys.includes('fn rename[{ age: Int, id: Int }]'), keys);
  assert.ok(keys.includes('fn older[{ id: Int, name: Text }]'), keys);
  assert.ok(keys.includes('fn both[{ id: Int }]'), keys);
});

const tick = 'fn tick(n: Int): Int with Console = { Console.print(n); n }; '
  + 'fn base(p: { a: Int, b: Int, c: Int }): { a: Int, b: Int, c: Int } '
  + 'with Console = { Console.print(0); p }; ';

test('literal and update fields evaluate in written order', () => {
  const source = `${tick}fn main(): Unit with Console = { `
    + 'let p = { c: tick(1), a: tick(2), b: tick(3) }; '
    + 'let q = base(p) { c = tick(4), a = tick(5) }; Console.print(q) };';
  assert.equal(runGo(source), '1\n2\n3\n0\n4\n5\n{ a: 5, b: 3, c: 4 }\n');
});

const node = 'type Node = End | Node({ child: Node }); ';
const three = 'Node({ child: Node({ child: Node({ child: End }) }) })';

test('a recursive type through a record builds, compares and prints', () => {
  const source = `${node}fn main(): Unit with Console = { `
    + `let n = ${three}; let m = Node({ child: End }); `
    + 'Console.print(n); Console.print(n == n); Console.print(n < m); '
    + 'Console.print(m < n) };';
  assert.equal(runGo(source), `${three}\ntrue\nfalse\ntrue\n`);
});

test('a list of records builds, compares and prints', () => {
  const source = 'type List(a) = Nil | Cons(a, List(a)); '
    + 'fn main(): Unit with Console = { '
    + 'let xs = Cons({ n: 1, s: "a" }, Cons({ s: "b", n: 2 }, Nil)); '
    + 'let ys = Cons({ n: 1, s: "a" }, Nil); '
    + 'Console.print(xs); Console.print(xs == xs); '
    + 'Console.print(ys < xs) };';
  assert.equal(runGo(source),
    'Cons({ n: 1, s: "a" }, Cons({ n: 2, s: "b" }, Nil))\ntrue\ntrue\n');
});

test('ordering compares fields in sorted label order', () => {
  const source = 'fn main(): Unit with Console = { '
    + 'Console.print({ name: "Ada", age: 36 } < { name: "Bo", age: 1 }); '
    + 'Console.print({ name: "Ada", age: 36 }); '
    + 'Console.print(show({ b: (), a: { c: true } })) };';
  assert.equal(runGo(source),
    'false\n{ age: 36, name: "Ada" }\n{ a: { c: true }, b: () }\n');
});

test('a record is the entry result', () => {
  assert.equal(runGo('fn main(): { a: Int } = { a: -1 };'), '{ a: -1 }\n');
});

// Review Focus 4: a nil ADT field inside a record is the existing
// malformed-value panic in comparison and printing, never a nil
// dereference.
const malformed = call => `package main
import ("fmt"; "testing")
func TestMalformed(t *testing.T) {
  defer func() {
    if got := fmt.Sprint(recover()); got != "waxwing: malformed value" {
      t.Fatalf("recovered %q", got)
    }
  }()
  fmt.Println(${call})
  t.Fatalf("no panic")
}
`;

test('a nil ADT field in a record is a malformed value', () => {
  const source = `${node}fn main(): Unit with Console = { `
    + 'let r = { child: End }; Console.print(r == r); Console.print(r) };';
  const go = checked(source);
  const name = go.match(/^type (waxwingRec\d+) struct/m)[1];
  const index = name.slice('waxwingRec'.length);
  for (const call of [
    `waxwingCmpRec${index}(${name}{}, ${name}{})`,
    `string(waxwingShowRec${index}(nil, ${name}{}))`
  ]) {
    const result = goTest(source, malformed(call));
    assert.equal(result.status, 0, `${call}\n${result.output}`);
  }
});

test('helpers are emitted only when used', () => {
  const go = checked('fn main(): Int = { a: 1 }.a;');
  assert.equal(structs(go).length, 1);
  assert.doesNotMatch(go, /waxwingCmpRec|waxwingShowRec/);
  const compared = checked('fn main(): Bool = { a: 1 } == { a: 2 };');
  assert.match(compared, /func waxwingCmpRec0/);
  assert.doesNotMatch(compared, /waxwingShowRec/);
});

test('a record literal of locals and literals needs no temporary', () => {
  const go = checked('fn f(n: Int): { a: Int, b: Text } = { b: "x", a: n }; '
    + 'fn main(): Int = f(1).a;');
  assert.match(go, /return waxwingRec0\{f_a: waxwingLocal0, f_b: "x"\}/);
});

test('two emits are byte-identical', () => {
  const source = `${people}${node}fn main(): Unit with Console = { `
    + `Console.print(both(make())); Console.print(${three}) };`;
  assert.equal(checked(source), checked(source));
});
