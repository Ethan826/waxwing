import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRejectedAt, resolved } from './phases.mjs';
import { spanAt } from './support.mjs';

// R005 Tranche B Task 2: several tails and `where r disjoint s` through
// Resolve (design §1.4, §8, §10). Approved texts: D8 `...r is written
// twice in one record`, D9 `A disjoint constraint must name two
// different row variables`, D3 `r and s are not known to be disjoint`
// with the hint `require r disjoint s in the signature`.
const main = ' fn main(): Int = 0;';
const pair = 'type Pair(...a, ...b) = Pair({ ...a, ...b }); ';
const first = source => resolved(source).functions[0];
const tailsOf = ty => ty.value0.tails;
const named = found => found.constructor.name;
const rejectedText = (source, code, text, nth = 0) =>
  resolveRejectedAt(source, code, text, nth);
const noted = (source, text, nth = 0) =>
  [{ span: spanAt(source, text, nth), message: 'first written here' }];

test('two and three tails resolve to a row of as many tails', () => {
  const two = first(`fn f(w: { ...r, ...s }): Int = 1;${main}`);
  assert.deepEqual(tailsOf(two.parameters[0].ty), [0, 1]);
  const three = first(
    `fn f(w: { a: Int, ...s, ...r, ...t }): Int = 1;${main}`);
  assert.deepEqual(tailsOf(three.parameters[0].ty), [0, 1, 2]);
  assert.equal(three.parameters[0].ty.value0.fields.length, 1);
});

test('several tails resolve in a result and under an arrow', () => {
  const result = first(`fn f(): { ...r, ...s } = 1;${main}`);
  assert.equal(result.result.value0.tails.length, 2);
  const arrow = first(`fn f(g: ({ ...r, ...s }) -> Int): Int = 1;${main}`);
  assert.equal(named(arrow.parameters[0].ty), 'TFun');
});

test('several tails resolve in a declared type\'s argument', () => {
  const source = `${pair}fn f(p: Pair({ x: Int, ...r }, ...s)): Int = 1;`
    + main;
  assert.equal(named(first(source).parameters[0].ty), 'TData');
  const wide = `${pair}fn f(p: Pair({ ...r, ...s }, ...t)): Int = 1;${main}`;
  assert.equal(named(first(wide).parameters[0].ty), 'TData');
});

test('where r disjoint s resolves to two variables', () => {
  const source = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = '
    + `1;${main}`;
  const [clause] = first(source).constraints;
  assert.equal(named(clause), 'Disjoint');
  assert.deepEqual([clause.value0.variables.value0,
    clause.value0.variables.value1], [0, 1]);
  assert.equal(clause.value0.written.value0.name, 'r');
  assert.equal(clause.value0.written.value1.name, 's');
});

test('disjoint beside lacks resolves both', () => {
  const source = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s, '
    + `r lacks { x } = 1;${main}`;
  const found = first(source).constraints.map(named);
  assert.deepEqual(found, ['Disjoint', 'Lacks']);
});

test('a repeated tail is D8 at the second, noted at the first', () => {
  const source = `fn f(w: { ...r, ...r }): Int = 1;${main}`;
  const found = rejectedText(source, 'E_TYPE', '...r', 1);
  assert.equal(found.message, '...r is written twice in one record');
  assert.deepEqual(found.related, noted(source, '...r'));
});

test('D8 finds a repeat among three tails and in a nested record', () => {
  const three = `fn f(w: { ...r, ...s, ...r }): Int = 1;${main}`;
  assert.equal(rejectedText(three, 'E_TYPE', '...r', 1).message,
    '...r is written twice in one record');
  const nested = `fn f(w: { a: { ...s, ...s } }): Int = 1;${main}`;
  assert.deepEqual(rejectedText(nested, 'E_TYPE', '...s', 1).related,
    noted(nested, '...s'));
});

test('D8 reaches a declared type that concatenates its arguments', () => {
  const source = `${pair}fn f(p: Pair(...r, ...r)): Int = 1;${main}`;
  const found = rejectedText(source, 'E_TYPE', '...r', 1);
  assert.equal(found.message, '...r is written twice in one record');
  assert.deepEqual(found.related, noted(source, '...r'));
});

test('D8 follows a pair passed on to another declaration', () => {
  const wrapped = `${pair}type Outer(...x, ...y) = Outer(Pair(...x, ...y)); `;
  const source = `${wrapped}fn f(p: Outer(...r, ...r)): Int = 1;${main}`;
  assert.equal(rejectedText(source, 'E_TYPE', '...r', 1).message,
    '...r is written twice in one record');
});

test('D8 reaches a repeat across a record argument and a bare tail', () => {
  const source = `${pair}fn f(p: Pair({ x: Int, ...r }, ...r)): Int = 1;`
    + main;
  const found = rejectedText(source, 'E_TYPE', '...r', 1);
  assert.deepEqual(found.related, noted(source, '...r'));
});

test('a declared type that keeps its parameters apart allows a repeat', () => {
  const apart = 'type Sep(...a, ...b) = Sep({ x: Int, ...a }, { y: Int, '
    + '...b }); ';
  resolved(`${apart}fn f(p: Sep(...r, ...r)): Int = 1;${main}`);
});

test('the same tail in separate records is no repeat', () => {
  resolved(`fn f(a: { ...r }, b: { ...r }): { ...r } = a;${main}`);
});

test('D8 is found in a constructor field and a body type too', () => {
  const field = `type T(...r) = T({ ...r, ...r });${main}`;
  assert.equal(rejectedText(field, 'E_TYPE', '...r', 2).message,
    '...r is written twice in one record');
  const body = 'fn f(a: { ...r }): Int = { let h = fn(q: { ...r, ...r }) '
    + `=> 0; 0 };${main}`;
  assert.equal(rejectedText(body, 'E_TYPE', '...r', 2).message,
    '...r is written twice in one record');
});

test('r disjoint r is D9 at the second r', () => {
  const source = `fn g(a: { ...r }): Int where r disjoint r = 1;${main}`;
  const found = rejectedText(source, 'E_TYPE', 'r', 3);
  assert.equal(found.message,
    'A disjoint constraint must name two different row variables');
  assert.deepEqual(found.related, []);
});

test('D9 is found beside other clauses, after unbound names', () => {
  const beside = 'fn g(a: { ...r }): Int where r lacks { x }, r disjoint r '
    + `= 1;${main}`;
  assert.equal(rejectedText(beside, 'E_TYPE', 'r', 4).message,
    'A disjoint constraint must name two different row variables');
  const unbound = `fn g(a: { ...r }): Int where r disjoint zz = 1;${main}`;
  assert.equal(rejectedText(unbound, 'E_UNBOUND', 'zz').message,
    'Unbound type variable zz');
});

test('disjoint names record row variables only', () => {
  const type = `fn g(a: { ...r }, x: t): Int where r disjoint t = 1;${main}`;
  assert.equal(rejectedText(type, 'E_TYPE', 't', 3).message,
    't is a type, not a record row');
  const effect = 'fn g(a: { ...r }): Int with ...e where r disjoint e = '
    + `1;${main}`;
  assert.equal(rejectedText(effect, 'E_TYPE', 'e', 3).message,
    'e is an effect row, not a record row');
});

const body = 'fn f(a: { ...r }, b: { ...s }): Int $ = { let h = fn(q: '
  + '{ ...r, ...s }) => 0; 0 };';
const withClause = clause => body.replace('$', clause);

test('a body type writing two tails the signature does not join is D3', () => {
  const source = withClause('') + main;
  const found = rejectedText(source, 'E_TYPE', '...s', 1);
  assert.equal(found.message, 'r and s are not known to be disjoint; require '
    + 'r disjoint s in the signature');
  assert.deepEqual(found.related, []);
});

test('the same body type is accepted with the clause', () => {
  resolved(withClause('where r disjoint s') + main);
  resolved(withClause('where s disjoint r') + main);
});

test('the same body type is accepted when a signature type joins them', () => {
  const joined = 'fn f(a: { ...r, ...s }): Int = { let h = fn(q: '
    + `{ ...r, ...s }) => 0; 0 };${main}`;
  resolved(joined);
  const declared = `${pair}fn f(a: Pair(...r, ...s)): Int = { let h = fn(q: `
    + `{ ...s, ...r }) => 0; 0 };${main}`;
  resolved(declared);
  const result = 'fn f(a: { ...r }, b: { ...s }): { ...r, ...s } = { let h = '
    + `fn(q: { ...r, ...s }) => 0; 0 };${main}`;
  resolved(result);
});

test('a clause on another pair does not join these', () => {
  const source = 'fn f(a: { ...r }, b: { ...s }, c: { ...t }): Int where '
    + 'r disjoint t = { let h = fn(q: { ...r, ...s }) => 0; 0 };' + main;
  assert.equal(rejectedText(source, 'E_TYPE', '...s', 1).message,
    'r and s are not known to be disjoint; require r disjoint s in the '
    + 'signature');
});

test('labels are reported before tails in a body type', () => {
  const source = 'fn f(a: { ...r }, b: { ...s }): Int = { let h = fn(q: '
    + `{ x: Int, ...r, ...s }) => 0; 0 };${main}`;
  const found = rejectedText(source, 'E_TYPE', 'x');
  assert.equal(found.message, 'r may already have field x');
});

test('two tails through a declared type in a body need the facts', () => {
  const source = `${pair}fn f(a: { ...r }, b: { ...s }): Int = { let h = `
    + `fn(q: Pair(...r, ...s)) => 0; 0 };${main}`;
  assert.equal(rejectedText(source, 'E_TYPE', '...s', 1).message,
    'r and s are not known to be disjoint; require r disjoint s in the '
    + 'signature');
});

test('one tail in a body type is held to the same rules as before', () => {
  resolved('fn f(a: { ...r }): Int = { let h = fn(q: { ...r }) => 0; 0 };'
    + main);
});

test('record arguments the declaration joins may not share a label', () => {
  const source = `${pair}fn f(p: Pair({ x: Int }, { x: Bool })): Int = 1;`
    + main;
  const found = rejectedText(source, 'E_DUPLICATE', 'x', 1);
  assert.equal(found.message, 'Duplicate field x');
  assert.deepEqual(found.related, noted(source, 'x', 0));
});

test('record arguments of a declaration that keeps them apart may', () => {
  const apart = 'type Sep(...a, ...b) = Sep({ x: Int, ...a }, '
    + '{ y: Int, ...b }); ';
  resolved(`${apart}fn f(p: Sep({ z: Int }, { z: Bool })): Int = 1;${main}`);
});
