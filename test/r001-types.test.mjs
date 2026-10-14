import test from 'node:test';
import assert from 'node:assert/strict';
import { Left, Right } from '../output/Data.Either/index.js';
import { sortOf } from '../output/Domain.Resolved/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { resolved, resolveRejectedAt } from './phases.mjs';
import { rejectedAt, checked, spanAt } from './support.mjs';

// R001 Task 3: record types, their resolution and the sorts of row
// variables (record or effect), solved over declarations.
const main = ' fn main(): Int = 0;';
const accepts = (name, source) => test(name, () => {
  const result = parse(source);
  assert.ok(result instanceof Right, JSON.stringify(result));
  resolved(source);
});

accepts('a closed record type',
  `fn f(x: { a: Int, b: Bool }): Int = 1;${main}`);
accepts('an open record type', `fn f(x: { a: Int, ...r }): Int = 1;${main}`);
accepts('a tail-only record type', `fn f(x: { ...r }): Int = 1;${main}`);
accepts('a trailing comma', `fn f(x: { a: Int, }): Int = 1;${main}`);
accepts('a trailing comma after a tail',
  `fn f(x: { a: Int, ...r, }): Int = 1;${main}`);
accepts('nested in a constructor field',
  `type T = T({ a: Int, b: { c: Bool } });${main}`);
accepts('nested in a type argument',
  `type Box(a) = Box(a); fn f(x: Box({ a: Int })): Int = 1;${main}`);

const parameterType = (source, index = 0) =>
  resolved(source).functions[0].parameters[index].ty;

test('label order does not matter', () => {
  const one = parameterType(`fn f(x: { a: Int, b: Bool }): Int = 1;${main}`);
  const other = parameterType(`fn f(x: { b: Bool, a: Int }): Int = 1;${main}`);
  assert.deepEqual(one, other);
  assert.equal(one.constructor.name, 'TRecord');
});

test('{} in a type is the existing syntax error', () => {
  const source = `fn f(x: {}): Int = 1;${main}`;
  const result = parse(source);
  assert.ok(result instanceof Left);
  const diagnostic = wire(result.value0);
  assert.equal(diagnostic.code, 'E_SYNTAX');
  assert.equal(diagnostic.message, 'Expected a type');
  assert.deepEqual(diagnostic.span, spanAt(source, '{'));
});

test('a duplicate field is E_DUPLICATE at the second label', () => {
  const source = `fn f(x: { name: Int, name: Bool }): Int = 1;${main}`;
  const diagnostic = resolveRejectedAt(source, 'E_DUPLICATE', 'name', 1);
  assert.equal(diagnostic.message, 'Duplicate field name');
  assert.deepEqual(diagnostic.related, [{ span: spanAt(source, 'name', 0),
    message: 'first written here' }]);
});

const sortError = (source, message, use, first, nth = 0, firstNth = 0) => {
  const diagnostic = resolveRejectedAt(source, 'E_TYPE', use, nth);
  assert.equal(diagnostic.message, message);
  assert.deepEqual(diagnostic.related.map(note => note.message),
    ['first written here']);
  assert.deepEqual(diagnostic.related[0].span,
    spanAt(source, first, firstNth));
};

test('a record row used as an effect row', () => {
  sortError(`fn f(x: { a: Int, ...r }): Unit with ...r = ();${main}`,
    'r is a record row, not an effect row', 'with ...r', '...r');
});

test('an effect row used as a record row', () => {
  sortError('fn f(g: (Unit) -> Unit with ...r, x: { a: Int, ...r }): Unit '
    + `= ();${main}`, 'r is an effect row, not a record row', '...r',
    'with ...r', 1);
});

test('a declaration parameter used as both sorts', () => {
  sortError('type T(...r) = T({ a: Int, ...r }, (Unit) -> Unit with ...r);'
    + main, 'r is a record row, not an effect row', 'with ...r', '...r', 0, 1);
});

const box = 'type Box(...r) = Box({ a: Int, ...r }); ';

test('the sort propagates through a type application', () => {
  sortError(`${box}fn f(x: Box(...e)): Unit with ...e = ();${main}`,
    'e is a record row, not an effect row', 'with ...e', '...e');
});

test('the sort propagates through a forward reference', () => {
  sortError('type Outer(...s) = Outer(Inner(...s)); '
    + 'type Inner(...r) = Inner({ a: Int, ...r }); '
    + `fn f(x: Outer(...e)): Unit with ...e = ();${main}`,
    'e is a record row, not an effect row', 'with ...e', '...e');
});

const sortsOf = (source, index) => resolved(source).types[index].sorts
  .map(sort => sort.constructor.name);

test('a record use makes a declaration parameter record sort', () => {
  assert.deepEqual(sortsOf(`${box}${main}`, 0), ['RecordSort']);
  assert.deepEqual(sortsOf('type Outer(...s) = Outer(Inner(...s)); '
    + `type Inner(...r) = Inner({ a: Int, ...r });${main}`, 0),
  ['RecordSort']);
});

test('an unconstrained row parameter stays effect sort', () => {
  const source = `type Box(...r) = Box(Int); fn f(x: Box(...e)): Unit `
    + `with ...e = ();${main}`;
  assert.deepEqual(sortsOf(source, 0), ['RowSort']);
});

test('a function signature records the sort of each row variable', () => {
  const source = 'fn f(x: { a: Int, ...r }, g: (Int) -> Int with ...e): '
    + `Int = 1;${main}`;
  const sorts = resolved(source).functions[0].sorts
    .map(sort => sort.constructor.name);
  assert.deepEqual(sorts, ['RecordSort', 'RowSort', 'RowSort']);
  const declared = resolved(source).functions[0].sorts;
  // A newtype is its Int at runtime: variable 0 is `r`.
  assert.equal(sortOf(declared)(0).constructor.name, 'RecordSort');
});

test('a record tail names a variable in scope', () => {
  const source = `type Box(a) = Box({ a: Int, ...r });${main}`;
  const diagnostic = resolveRejectedAt(source, 'E_UNBOUND', '...r');
  assert.equal(diagnostic.message, 'Unbound type variable r');
});

test('a record tail may not name a type parameter', () => {
  const diagnostic = rejectedAt(
    `type Box(a) = Box({ a: Int, ...a });${main}`, 'E_TYPE', '...a');
  assert.equal(diagnostic.message, 'Expected an effect row, found a type');
});

test('record sorts check and specialize with the rest of a program', () => {
  const nested = 'type Outer(...s) = Outer(Box(...s)); ';
  checked(`${box}${nested}${main}`);
  checked(`${box}fn f(x: Box(...e)): Int = 1;${main}`);
});

test('a record field is judged for nested datatypes', () => {
  const source = 'type Box(a) = Box(a); '
    + `type T(a) = T({ x: T(Box(a)) });${main}`;
  const diagnostic = rejectedAt(source, 'E_SPECIALIZATION', 'T(Box(a))', 0);
  assert.equal(diagnostic.message,
    'Recursive use of T changes its type arguments');
});

// A direct effect use is evidence too: propagation cannot override it.
const pairs = 'type A(...r) = A({ a: Int, ...r }, B(...r)); ';
const effectB = 'type B(...s) = B((Unit) -> Unit with ...s); ';

test('a direct effect use contradicts a record argument', () => {
  sortError(`${pairs}${effectB}${main}`,
    'r is a record row, not an effect row', '...r', '...r', 2, 1);
});

test('the contradiction travels through a chain', () => {
  sortError('type A(...r) = A({ a: Int, ...r }, D(...r)); '
    + `type D(...u) = D(B(...u)); ${effectB}${main}`,
  'r is a record row, not an effect row', '...r', '...r', 2, 1);
});

test('a record argument makes the callee parameter record sort', () => {
  const source = 'type A(...r) = A({ a: Int, ...r }, B(...r)); '
    + `type B(...s) = B(Int); ${main}`;
  assert.deepEqual(sortsOf(source, 1), ['RecordSort']);
  sortError(`${source.replace(main, '')}`
    + `fn g(x: B(...e)): Unit with ...e = ();${main}`,
  'e is a record row, not an effect row', 'with ...e', '...e');
});

// The mirror: the record tail is in the callee, the effect use in the
// caller. The callee parameter settles to record sort from its own use, so
// the caller is blamed, at its later use, with a note at its first.
const callee = 'type X(...p) = X({ a: Int, ...p }); ';
const caller = 'type B(...s) = B((Unit) -> Unit with ...s, X(...s)); ';
const effectNotRecord = 's is an effect row, not a record row';
const recordNotEffect = 's is a record row, not an effect row';

test('a callee record tail meets a caller effect use', () => {
  sortError(`${caller}${callee}${main}`, effectNotRecord, '...s',
    'with ...s', 2);
});

test('the same with the declarations swapped', () => {
  sortError(`${callee}${caller}${main}`, effectNotRecord, '...s',
    'with ...s', 2);
});

test('the same with the fields swapped', () => {
  sortError('type B(...s) = B(X(...s), (Unit) -> Unit with ...s); '
    + `${callee}${main}`, recordNotEffect, 'with ...s', '...s', 0, 1);
});

test('the same through a chain', () => {
  sortError(`${caller.replace('X(...s)', 'D(...s)')}`
    + `type D(...u) = D(X(...u)); ${callee}${main}`, effectNotRecord,
  '...s', 'with ...s', 2);
});

test('two callees that disagree blame the caller, not either callee', () => {
  sortError('type B(...s) = B(X(...s), E(...s)); '
    + `type E(...q) = E((Unit) -> Unit with ...q); ${callee}${main}`,
  recordNotEffect, '...s', '...s', 2, 1);
});

test('callers that pass different sorts blame the later argument', () => {
  const source = 'type C1(...a) = C1({ x: Int, ...a }, P(...a)); '
    + 'type C2(...b) = C2((Unit) -> Unit with ...b, P(...b)); '
    + `type P(...p) = P(Int);${main}`;
  const diagnostic = resolveRejectedAt(source, 'E_TYPE', '...b', 2);
  assert.equal(diagnostic.message, 'b is an effect row, not a record row');
  assert.deepEqual(diagnostic.related, [{ span: spanAt(source, '...a', 2),
    message: 'first written here' }]);
});
