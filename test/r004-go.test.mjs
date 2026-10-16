import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, goTest, runGo } from './support.mjs';

// R004 Task 4: record patterns lowered to Go (design §4). A record pattern
// has no tag test; each named field's pattern reads the struct field. A
// record-valued field is inline, an ADT-valued one a pointer with a nil
// guard, in a record as in a constructor. Every program is executed.
const team = 'type Team = Solo | Pair({ lead: Person, rest: Team }); '
  + 'type Person = Person({ name: Text, age: Int }); ';

test('a record in a constructor and a constructor in a record', () => {
  const source = `${team}fn describe(t: Team): Text = match t { `
    + 'Solo => "none", '
    + 'Pair({ lead: Person({ name: n, ... }), rest: Solo }) => "${n} alone", '
    + 'Pair({ lead: Person({ name: n, age: a }), rest: Pair({ lead: '
    + 'Person({ name: m, ... }), rest: _ }) }) => "${n} then ${m}" }; '
    + 'fn age(t: Team): Int = match t { Solo => 0, '
    + 'Pair({ lead: Person({ age, ... }), ... }) => age }; '
    + 'fn main(): Unit with Console = { '
    + 'let one = Pair({ lead: Person({ name: "Ada", age: 36 }), rest: Solo }); '
    + 'let two = Pair({ lead: Person({ name: "Bo", age: 41 }), rest: one }); '
    + 'Console.print(describe(Solo)); Console.print(describe(one)); '
    + 'Console.print(describe(two)); Console.print(age(two)) };';
  assert.equal(runGo(source), 'none\nAda alone\nBo then Ada\n41\n');
});

test('an ADT-valued field is bound and matched through its pointer', () => {
  const source = `${team}fn size(t: Team): Int = match t { Solo => 0, `
    + 'Pair({ rest: r, ... }) => 1 + size(r) }; '
    + 'fn main(): Int = size(Pair({ lead: Person({ name: "a", age: 1 }), '
    + 'rest: Pair({ lead: Person({ name: "b", age: 2 }), rest: Solo }) }));';
  assert.equal(runGo(source), '2\n');
});

test('puns bind, beside explicit fields', () => {
  const source = 'fn tag(p: { name: Text, admin: Bool }): Text = match p { '
    + '{ name, admin: true } => "admin ${name}", '
    + '{ name, admin: false } => name }; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(tag({ name: "Ada", admin: true })); '
    + 'Console.print(tag({ admin: false, name: "Bo" })) };';
  assert.equal(runGo(source), 'admin Ada\nBo\n');
});

test('an open row matched is specialized at two rows', () => {
  const source = 'fn zero(p: { a: Int, ...r }): Bool = match p { '
    + '{ a: 0, ... } => true, { a: _, ... } => false }; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(zero({ a: 0, b: true })); '
    + 'Console.print(zero({ c: "x", a: 1 })); '
    + 'Console.print(zero({ a: 0 })) };';
  assert.equal(runGo(source), 'true\nfalse\ntrue\n');
});

test('field binders are captured by a lambda', () => {
  const source = 'fn adder(p: { x: Int, y: Int }): Int -> Int = match p { '
    + '{ x, y } => fn(z) => x + y + z }; '
    + 'fn main(): Int = adder({ y: 20, x: 3 })(100);';
  assert.equal(runGo(source), '123\n');
});

test('nested records bind and test at depth', () => {
  const source = 'fn depth(r: { a: { b: { c: Int, d: Bool }, e: Int }, '
    + 'f: Int }): Int = match r { '
    + '{ a: { b: { c: 1, d: true }, ... }, ... } => 1, '
    + '{ a: { b: { c, ... }, e }, f } => c + e + f }; '
    + 'fn main(): Unit with Console = { '
    + 'Console.print(depth({ a: { b: { c: 1, d: true }, e: 2 }, f: 3 })); '
    + 'Console.print(depth({ a: { b: { c: 1, d: false }, e: 2 }, f: 3 })) };';
  assert.equal(runGo(source), '1\n6\n');
});

test('a destructured record from a caller still gets its struct', () => {
  const source = 'fn pick(p: { a: Int, b: Bool }): Int = match p { '
    + '{ a, b: true } => a, { b: false, ... } => 0 }; '
    + 'fn main(): Int = pick({ a: 5, b: true });';
  assert.match(checked(source), /^type waxwingRec\d+ struct/m);
  assert.equal(runGo(source), '5\n');
});

// A malformed value, a nil ADT pointer inside a record, reaches the
// unmatched panic and never a nil dereference.
test('a nil ADT field in a record is guarded, never dereferenced', () => {
  const source = 'type L = Nil | Cons(Int, L); '
    + 'fn head(p: { next: L, v: Int }): Int = match p { '
    + '{ next: Cons(h, _), ... } => h, { next: Nil, v } => v }; '
    + 'fn main(): Int = head({ v: 7, next: Nil });';
  const go = checked(source);
  assert.match(go, /\.f_next != nil/);
  assert.equal(runGo(source), '7\n');
  const check = 'if r != "waxwing: unmatched value" '
    + '{ t.Fatalf("recovered %v", r) }';
  const test = `package main
import "testing"
func TestNilField(t *testing.T) {
defer func() { r := recover(); ${check} }()
waxwingFn0(waxwingRec0{})
}
`;
  const result = goTest(source, test);
  assert.equal(result.status, 0, result.output);
});
