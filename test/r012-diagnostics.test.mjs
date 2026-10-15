import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, rejectedAt, spanAt } from './support.mjs';

// R012 (user-approved 2026-10-15): the wrong-sort arguments of a record
// parameter, and labels an argument shares with its declaration, reuse
// the approved texts. A clash is a duplicate even when the field types
// agree; it is reported at the argument's label and noted at the label
// the declaration (or one it passes its parameter to) writes.
const holder = 'type Holder(...r) = Holder({ x: Int, ...r }); ';
const pair = 'type Pair(...r) = Pair(Holder(...r)); ';
const main = ' fn main(): Int = 0;';

const duplicate = (source, at, first) => {
  const diagnostic = rejected(source, 'E_DUPLICATE');
  assert.equal(diagnostic.message, 'Duplicate field x');
  assert.deepEqual(diagnostic.span, at);
  assert.deepEqual(diagnostic.related,
    [{ span: first, message: 'first written here' }]);
};

test('a non-record type is not a record', () => {
  const source = `${holder}fn f(h: Holder(Int)): Int = 0;${main}`;
  assert.equal(rejectedAt(source, 'E_TYPE', 'Int', 1).message,
    'Expected a record, found Int');
});

test('an applied type is named as written', () => {
  const source = `type List(a) = Nil; ${holder}`
    + `fn f(h: Holder(List(Bool))): Int = 0;${main}`;
  assert.equal(rejectedAt(source, 'E_TYPE', 'List(Bool)').message,
    'Expected a record, found List(Bool)');
});

test('an effect label is an effect row', () => {
  const source = `${holder}fn f(h: Holder(Console)): Int = 0;${main}`;
  assert.equal(rejectedAt(source, 'E_TYPE', 'Console').message,
    'Expected a type, found an effect row');
  const labelled = `effect Log { fn log(t: Text): Unit; }; ${holder}`
    + `fn f(h: Holder(Log + ...s)): Int = 0;${main}`;
  assert.equal(rejectedAt(labelled, 'E_TYPE', 'Log + ...s').message,
    'Expected a type, found an effect row');
});

test('an effect row parameter keeps refusing a record type', () => {
  const source = 'type E(...e) = E((Int) -> Int with ...e); '
    + `fn f(h: E({ y: Bool })): Int = 0;${main}`;
  assert.equal(rejectedAt(source, 'E_TYPE', '{ y: Bool }').message,
    'Expected an effect row, found a type');
});

test('a label the declaration writes is a duplicate', () => {
  const source = `${holder}fn f(h: Holder({ x: Bool })): Int = 0;${main}`;
  duplicate(source, spanAt(source, 'x', 1), spanAt(source, 'x', 0));
});

test('even when the field types agree', () => {
  const source = `${holder}fn f(h: Holder({ y: Bool, x: Int, ...s })): `
    + `Int = 0;${main}`;
  duplicate(source, spanAt(source, 'x', 1), spanAt(source, 'x', 0));
});

test('through a nested declared type', () => {
  const source = `${holder}${pair}fn f(p: Pair({ x: Bool })): Int = 0;`
    + main;
  duplicate(source, spanAt(source, 'x', 1), spanAt(source, 'x', 0));
});

test('in a constructor field and a lambda annotation', () => {
  const field = `${holder}type P(...r) = P(Holder({ x: Bool, ...r }));`
    + main;
  duplicate(field, spanAt(field, 'x', 1), spanAt(field, 'x', 0));
  const lambda = `${holder}fn main(): Int = { let f = `
    + 'fn(h: Holder({ x: Int })) => 0; 1 };';
  duplicate(lambda, spanAt(lambda, 'x', 1), spanAt(lambda, 'x', 0));
});

test('an open argument lacks the declaration\'s labels', () => {
  const lacks = `${holder}${pair}fn f(p: Pair({ y: Bool, ...s })): Int = `
    + '{ let g = fn(q: { x: Int, ...s }) => q; 0 };';
  checked(`${lacks}${main}`);
  const other = lacks.replace('{ x: Int, ...s }', '{ z: Int, ...s }');
  const diagnostic = rejected(`${other}${main}`, 'E_TYPE');
  assert.equal(diagnostic.message, 's may already have field z');
});

test('a body type passing a signature tail implies its labels', () => {
  const source = `${holder}fn g(p: { y: Int, ...r }): Int = { let f = `
    + 'fn(h: Holder({ y: Int, ...r })) => h; 0 }; '
    + 'fn main(): Int = g({ y: 1, x: true });';
  const diagnostic = rejectedAt(source, 'E_TYPE', '...r', 3);
  assert.equal(diagnostic.message, 'r may already have field x');
});

test('a record argument is a record use of its tail', () => {
  const source = `${holder}fn f(h: Holder({ y: Bool, ...s })): Int `
    + `with ...s = 0;${main}`;
  const diagnostic = rejectedAt(source, 'E_TYPE', 'with ...s');
  assert.equal(diagnostic.message, 's is a record row, not an effect row');
});

// A row that grows through a recursive reference would give a declared
// type infinitely many instances: the instantiation rule (ADR 007) judges
// record arguments too, which must be a bare `...r` or ground there.
const nested = (source, at) => {
  const diagnostic = rejectedAt(source, 'E_SPECIALIZATION', at);
  assert.match(diagnostic.message,
    /^Recursive use of [A-Z] changes its type arguments$/);
};

test('a row growing through recursion is the instantiation rule', () => {
  nested(`type T(...r) = End({ ...r }) | More(T({ a: { ...r } }));${main}`,
    'T({ a: { ...r } })');
  nested('type T(...r) = End({ ...r }) | More(T({ a: { ...r } })); '
    + 'fn f(t: T({ b: Int })): Int = 0; fn main(): Int = f(End({ b: 1 }));',
    'T({ a: { ...r } })');
  nested('type T(...r) = End({ a: Int, ...r }) | More(T({ inner: Int, '
    + `...r }));${main}`, 'T({ inner: Int, ...r })');
  nested('type A(...r) = A(B({ p: Int, ...r })); type B(...s) = '
    + `B(A({ q: Int, ...s })) | Stop({ ...s });${main}`,
  'B({ p: Int, ...r })');
});

test('and reaches references inside record arguments', () => {
  nested(`${holder}type T(a) = End | More(Holder({ y: T(T(a)) }));${main}`,
    'T(T(a))');
});

test('a bare or ground row argument may recur', () => {
  checked('type T(...r) = End({ a: Int, ...r }) | More(T(...r)) '
    + `| Reset(T({ b: Int })) | Same(T({ ...r }));${main}`);
});

test('a record parameter after an effect row names its own labels', () => {
  const source = 'type T(...e, ...r) = T((Int) -> Int with ...e, '
    + '{ x: Int, ...r }); fn g(p: { ...r }, q: (Int) -> Int with ...e): '
    + 'Int = { let f = fn(h: T(...e, ...r)) => h; 0 }; '
    + 'fn id(n: Int): Int = n; fn main(): Int = g({ x: true }, id);';
  const diagnostic = rejectedAt(source, 'E_TYPE', '...r', 3);
  assert.equal(diagnostic.message, 'r may already have field x');
});

test('{ ...s } passes its sort on as ...s does', () => {
  checked('type Q(...q) = Q(Int); type P(...s) = P(Q({ ...s }), '
    + `{ a: Int, ...s });${main}`);
});
