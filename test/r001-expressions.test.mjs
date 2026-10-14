import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly, checkRejectedAt, resolveRejectedAt }
  from './phases.mjs';
import { rejectedAt, spanAt } from './support.mjs';

// R001 Task 5: literals, access and update, resolved and inferred
// (design §2, §6). Records cannot lower yet (Task 7), so programs stop
// after checking.
const main = ' fn main(): Int = 0;';
const accepted = source => checkedPoly(`${source}${main}`);
const typeError = (source, at, message, nth = 0) => {
  const diagnostic = checkRejectedAt(`${source}${main}`, 'E_TYPE', at, nth);
  assert.equal(diagnostic.message, message);
};
const person = '{ name: Text, age: Int }';

test('a literal has the closed type of its fields', () => {
  accepted(`fn f(): ${person} = { name: "Ada", age: 36 };`);
  typeError('fn f(): Int = { name: "Ada", age: 36 };',
    '{ name: "Ada", age: 36 }', 'Expected Int, found { age: Int, name: Text }');
  typeError('fn f(): { a: Int, ...r } = { a: 1 };', '{ a: 1 }',
    'Expected { a: Int, ...r }, found { a: Int }');
});

test('the checked literal keeps written order; its type is sorted', () => {
  const body = accepted(`fn f(): ${person} = { name: "Ada", age: 36 };`)
    .functions[0].body.value0;
  assert.equal(body.node.constructor.name, 'RecordLiteral');
  assert.deepEqual(body.node.value0.map(entry => entry.label),
    ['name', 'age']);
  assert.deepEqual(body.ty.value0.fields.map(entry => entry.value0),
    ['age', 'name']);
});

test('{} is still Unit and { x } is still a block', () => {
  accepted('fn f(): Unit = {};');
  accepted('fn f(x: Int): Int = { x };');
});

test('access reads the field type', () => {
  accepted(`fn f(p: ${person}): Int = p.age;`);
  typeError(`fn f(p: ${person}): Int = p.name;`, 'p.name',
    'Expected Int, found Text');
});

test('access chains, after a call and after parentheses', () => {
  accepted('fn f(p: { a: { b: Int } }): Int = p.a.b;');
  const g = 'fn g(n: Int): { a: Int } = g(n); ';
  accepted(`${g}fn f(): Int = g(1).a;`);
  accepted(`${g}fn f(): Int = (g(1)).a;`);
  accepted('fn f(): Int = { a: 1 }.a;');
  accepted('fn f(): Int = { let p = { a: 1 }; p.a };');
  accepted('fn id(x: t): t = x; fn f(): Int = id({ a: 1 }).a;');
});

test('update keeps the receiver type', () => {
  accepted(`fn f(p: ${person}): ${person} = p { age = 1 };`);
  accepted(`fn f(p: ${person}): ${person} = p { age = 1, name = "x" };`);
  typeError(`fn f(p: ${person}): Int = p { age = 1 };`, 'p { age = 1 }',
    'Expected Int, found { age: Int, name: Text }');
});

test('f(x) { name = n }.name groups as ((f(x)) { name = n }).name', () => {
  accepted('fn g(x: Int): { name: Text } = g(x); '
    + 'fn f(n: Text): Text = g(1) { name = n }.name;');
  accepted('fn h(t: Text): Int = 1; '
    + 'fn f(p: { name: Text }): Int = p.name |> h;');
});

test('a missing field is reported at the field name', () => {
  typeError('fn f(p: { name: Text }): Int = p.age;', 'age',
    'age is not a field of { name: Text }');
  typeError('fn f(p: { name: Text }): { name: Text } = p { age = 1 };', 'age',
    'age is not a field of { name: Text }');
  typeError('fn rest(x: { a: Int, ...r }): { ...r } = rest(x); '
    + 'fn f(y: { a: Int, b: Bool }): Int = rest(y).a;', 'a',
  'a is not a field of { b: Bool }', 2);
});

// Ruling R2 (design §2 rule 6): a rigid tail is never extended.
test('a known field of a rigid-tailed record is read', () => {
  accepted('fn f(p: { name: Text, ...r }): Text = p.name;');
  accepted('fn f(p: { name: Text, ...r }): { name: Text, ...r } '
    + '= p { name = "x" };');
});

test('an unknown field of a rigid-tailed record is missing', () => {
  typeError('fn f(p: { name: Text, ...r }): Int = p.age;', 'age',
    'age is not a field of { name: Text, ...r }');
  typeError('fn f(p: { ...r }): Int = p.age;', 'age',
    'age is not a field of { ...r }');
});

test('access on a non-record is reported at the receiver', () => {
  typeError('fn f(k: Int): Int = k.a;', 'k', 'Expected a record, found Int',
    1);
  typeError('fn f(k: Int): Int = (k + 1).a;', 'k + 1',
    'Expected a record, found Int');
  typeError('fn f(k: t): Int = k.a;', 'k', 'Expected a record, found t', 1);
  typeError('fn f(k: Int): Int = k { a = 1 };', 'k',
    'Expected a record, found Int', 1);
});

test('an update with a wrong-typed value is the existing mismatch', () => {
  typeError('fn f(p: { age: Int }): { age: Int } = p { age = "x" };', '"x"',
    'Expected Int, found Text');
});

const duplicate = (source, nth) => {
  const full = `${source}${main}`;
  const diagnostic = resolveRejectedAt(full, 'E_DUPLICATE', 'name', nth);
  assert.equal(diagnostic.message, 'Duplicate field name');
  assert.deepEqual(diagnostic.related, [{ span: spanAt(full, 'name', nth - 1),
    message: 'first written here' }]);
};

test('a duplicate field in a literal or an update', () => {
  duplicate('fn f(): Int = { let p = { name: 1, name: 2 }; 1 };', 1);
  duplicate('fn f(p: { name: Int }): { name: Int } = p { name = 1, name = 2 };',
    3);
});

// The checker's later passes see into fields: effects, coverage,
// printability and comparability inside a literal, an update or a
// receiver are judged as anywhere else.
const later = (source, code, at, message) => {
  assert.equal(rejectedAt(`${source}${main}`, code, at).message, message);
};

test('effects, coverage, printing and comparison inside records', () => {
  later('fn f(): { a: Int } = { a: Fail.fail(1) };', 'E_EFFECT',
    'Fail.fail(1', 'f performs Fail(Int), which its signature does not allow');
  later('fn f(p: { a: Int }): { a: Int } = p { a = Fail.fail(1) };',
    'E_EFFECT', 'Fail.fail(1',
    'f performs Fail(Int), which its signature does not allow');
  later('fn f(p: { a: Int }): { a: Int } = p { a = match 1 { 1 => 2 } };',
    'E_NON_EXHAUSTIVE', 'match 1 { 1 => 2 }', 'Missing pattern: 0');
  later('fn f(): Text = { a: show(fn(x: Int) => x) }.a;', 'E_TYPE',
    'fn(x: Int) => x', 'Expected a printable value, found Int -> Int');
  later('fn f(p: { a: Int -> Int }): Bool = { b: p.a == p.a }.b;', 'E_TYPE',
    'p.a', 'Type Int -> Int is not comparable');
});
