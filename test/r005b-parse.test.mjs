import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { rejected, spanAt } from './support.mjs';
import { shape } from './fn-shape.mjs';

// R005 Tranche B Task 2: record types with several tails and `where r
// disjoint s` as parsed (design §4, §13 slice 2). Spans are checked where
// they are the point.
const parsedFunction = text => {
  const result = parse(text);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0.functions[0];
};
const tail = name => `{name: ${name}}`;
const tails = (...names) => `[${names.map(tail).join(', ')}]`;
const field = (name, ty = 'IntRef') => `{name: ${name}, ty: ${ty}}`;
const parameterShape = ty =>
  shape(parsedFunction(`fn f(p: ${ty}): Int = 1;`).parameters[0].ty);
const constraintsShape = text =>
  shape(parsedFunction(`fn g(a: { ...r }): Int ${text} = 1;`).constraints);
const lacks = (variable, label) =>
  `Lacks({labels: [{name: ${label}}], variable: ${tail(variable)}})`;
const disjoint = (one, other) =>
  `Disjoint({variables: Tuple(${tail(one)}, ${tail(other)})})`;

test('two and three tails parse, in written order', () => {
  assert.equal(parameterShape('{ ...r, ...s }'),
    `RecordRef([], ${tails('r', 's')})`);
  assert.equal(parameterShape('{ ...s, ...r, ...t }'),
    `RecordRef([], ${tails('s', 'r', 't')})`);
});

test('fields come before the tails', () => {
  assert.equal(parameterShape('{ a: Int, b: Int, ...r, ...s }'),
    `RecordRef([${field('a')}, ${field('b')}], ${tails('r', 's')})`);
});

test('several tails parse in nested, result and annotation positions', () => {
  const nested = 'RecordRef([], ' + tails('r', 's') + ')';
  assert.equal(parameterShape('{ a: { ...r, ...s } }'),
    `RecordRef([${field('a', nested)}], [])`);
  assert.equal(shape(parsedFunction('fn f(): { ...r, ...s } = 1;').result),
    nested);
  assert.equal(parameterShape('({ ...r, ...s }) -> Int'),
    `FunRef(${nested}, IntRef)`);
  const body = parsedFunction('fn f(): Int = { let h = fn(q: { ...r, ...s }) '
    + '=> 0; 0 };').body;
  assert.ok(shape(body).includes(nested), shape(body));
});

test('several tails parse as a declared type\'s argument', () => {
  const source = 'type Pair(...a) = Pair({ ...a }); '
    + 'fn f(p: Pair({ x: Int, ...r, ...s })): Int = 1;';
  const parameter = parsedFunction(source).parameters[0].ty;
  assert.ok(shape(parameter).includes(tails('r', 's')), shape(parameter));
});

test('a tail span covers its dots and name', () => {
  const source = 'fn f(p: { ...r, ...s }): Int = 1;';
  const [first, second] = parsedFunction(source).parameters[0].ty.value2;
  assert.deepEqual(first.span, spanAt(source, '...r'));
  assert.deepEqual(second.span, spanAt(source, '...s'));
});

test('a field after any tail is refused at the first tail it follows', () => {
  const source = 'fn f(p: { ...r, ...s, a: Int }): Int = 1;';
  const found = rejected(source, 'E_SYNTAX');
  assert.equal(found.message, 'Row tail must be last');
  assert.deepEqual(found.span, spanAt(source, '...r'));
  const one = 'fn f(p: { ...r, a: Int }): Int = 1;';
  assert.deepEqual(rejected(one, 'E_SYNTAX').span, spanAt(one, '...r'));
});

test('a trailing comma follows the last tail', () => {
  assert.equal(parameterShape('{ ...r, ...s, }'),
    `RecordRef([], ${tails('r', 's')})`);
});

test('where r disjoint s parses, spanning both variables', () => {
  assert.equal(constraintsShape('where r disjoint s'),
    `[${disjoint('r', 's')}]`);
  const source = 'fn g(a: { ...r }): Int where r disjoint s = 1;';
  const [clause] = parsedFunction(source).constraints;
  assert.deepEqual(clause.value0.span, spanAt(source, 'r disjoint s'));
});

test('disjoint sits beside lacks in either order', () => {
  assert.equal(constraintsShape('where r disjoint s, r lacks { a }'),
    `[${disjoint('r', 's')}, ${lacks('r', 'a')}]`);
  assert.equal(constraintsShape('where r lacks { a }, r disjoint s'),
    `[${lacks('r', 'a')}, ${disjoint('r', 's')}]`);
});

test('two disjoint clauses parse', () => {
  assert.equal(constraintsShape('where r disjoint s, s disjoint t'),
    `[${disjoint('r', 's')}, ${disjoint('s', 't')}]`);
});

for (const [tailText, message] of [
  ['where r disjoint', 'Expected an identifier'],
  ['where r disjoint {', 'Expected an identifier'],
  ['where r disjoint S', 'Expected an identifier'],
  ['where r disjoint s t', "Expected '='"],
  ['where r disjoint s,', 'Expected an identifier'],
  ['where disjoint s', 'Expected an identifier']
]) {
  test(`${tailText} is E_SYNTAX`, () => {
    const source = `fn g(a: { ...r }): Int ${tailText} = 1;`;
    assert.equal(rejected(source, 'E_SYNTAX').message, message);
  });
}

test('an effect row still allows one tail', () => {
  const source = 'fn f(): Int with ...e + ...r = 0;';
  const found = rejected(source, 'E_SYNTAX');
  assert.equal(found.message, 'Only one row tail is allowed');
  assert.deepEqual(found.span, spanAt(source, '...r'));
});
