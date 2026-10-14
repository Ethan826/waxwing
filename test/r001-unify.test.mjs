import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly, checkRejectedAt, resolveRejectedAt }
  from './phases.mjs';

// R001 Task 4: record rows unify by label, with lacks sets, one shared
// remainder for two open tails, an occurs check and rigid signature tails
// (design §2). Driven through annotated functions passing parameters;
// records cannot lower yet (Task 7), so programs stop after checking.
const main = ' fn main(): Int = 0;';
const accepted = source => checkedPoly(`${source}${main}`);
const mismatch = (source, at, message, nth = 0) => {
  const diagnostic = checkRejectedAt(`${source}${main}`, 'E_TYPE', at, nth);
  assert.equal(diagnostic.message, message);
};

// Rule 1.
const takesAB = 'fn g(x: { a: Int, b: Bool }): Int = 1; ';

test('closed records with the same labels unify', () => {
  accepted(`${takesAB}fn f(y: { b: Bool, a: Int }): Int = g(y);`);
});

test('a missing label is a shape mismatch', () => {
  mismatch(`${takesAB}fn f(y: { a: Int }): Int = g(y);`, 'y',
    'Expected { a: Int, b: Bool }, found { a: Int }', 1);
});

test('an extra label is a shape mismatch', () => {
  mismatch('fn g(x: { a: Int }): Int = 1; '
    + 'fn f(y: { a: Int, b: Bool }): Int = g(y);', 'y',
  'Expected { a: Int }, found { a: Int, b: Bool }', 1);
});

test('a field type mismatch names the records', () => {
  mismatch(`${takesAB}fn f(y: { a: Int, b: Int }): Int = g(y);`, 'y',
    'Expected { a: Int, b: Bool }, found { a: Int, b: Int }', 1);
});

// Rule 2.
const keepsA = 'fn g(x: { a: Int, ...r }): { a: Int, ...r } = x; ';

test('a label on one side extends the other side\'s meta tail', () => {
  accepted(`${keepsA}fn f(y: { a: Int, b: Bool }): { a: Int, b: Bool } `
    + '= g(y);');
});

test('the extension is what the tail became', () => {
  mismatch(`${keepsA}fn f(y: { a: Int, b: Bool }): { a: Int, c: Bool } `
    + '= g(y);', 'g(y)',
  'Expected { a: Int, c: Bool }, found { a: Int, b: Bool }');
});

// Rule 3: `same` forces { a: Int, ...ρ } ~ { b: Bool, ...σ }; p and q then
// share one remainder, which the first later use fixes for both.
const shared = 'fn ra(n: Int): { a: Int, ...r } = ra(n); '
  + 'fn rb(n: Int): { b: Bool, ...s } = rb(n); '
  + 'fn same(x: t, y: t): t = x; ';
const both = (first, second) => `${shared}fn h(x: ${first}, y: ${second}): `
  + 'Int = 1; fn f(n: Int): Int = { let p = ra(n); let q = rb(n); '
  + 'let u = same(p, q); h(p, q) };';
const abc = '{ a: Int, b: Bool, c: Text }';

test('two open tails share one remainder', () => {
  accepted(both(abc, abc));
});

test('the shared remainder is not extended independently', () => {
  mismatch(both(abc, '{ a: Int, b: Bool, d: Text }'), 'q',
    'Expected { a: Int, b: Bool, d: Text }, found { a: Int, b: Bool, '
    + 'c: Text }', 2);
});

// Rule 4.
test('a tail is never bound to a label it lacks', () => {
  mismatch('fn g(y: { ...r }, x: { a: Int, ...r }): Int = 1; '
    + 'fn f(q: { a: Int }, p: { a: Int }): Int = g(q, p);', 'q',
  'Expected { ..._ }, found { a: Int }', 1);
});

test('the lacks set survives into the remainder', () => {
  mismatch('fn rb(n: Int): { b: Bool, ...s } = rb(n); '
    + 'fn g(y: { ...r }, z: { ...r }, x: { a: Int, ...r }): Int = 1; '
    + 'fn f(q: { a: Int, b: Bool }): Int = g(rb(1), q, q);', 'q',
  'Expected { b: Bool, ..._ }, found { a: Int, b: Bool }', 1);
});

const rest = 'fn rest(x: { a: Int, ...r }): { ...r } = rest(x); ';

test('instantiation gives a tail the labels its type lacks', () => {
  accepted(`${rest}fn f(y: { a: Int, b: Bool }): { b: Bool } = rest(y);`);
  mismatch(`${rest}fn f(y: { a: Int, b: Bool }): { a: Int, b: Bool } `
    + '= rest(y);', 'rest(y)',
  'Expected { a: Int, b: Bool }, found { b: Bool }');
  mismatch('fn k(y: { ...r }): { a: Int, ...r } = k(y); '
    + 'fn f(q: { a: Int }): Int = { let u = k(q); 1 };', 'q',
  'Expected { ..._ }, found { a: Int }', 1);
});

test('a tail that lacks a label never becomes a rigid that may hold it', () => {
  mismatch('fn k(y: { ...s }): { a: Int, ...s } = k(y); '
    + 'fn f(x: { ...r }): Int = { let u = k(x); 1 };', 'x',
  'Expected { ..._ }, found { ...r }', 1);
});

// Rule 5.
test('a cyclic record equation is rejected', () => {
  mismatch('fn mk(n: Int): { ...r } = mk(n); '
    + 'fn pair(x: t, y: { inner: t }): Int = 1; '
    + 'fn f(n: Int): Int = { let p = mk(n); pair(p, p) };', 'p',
  'Expected { inner: { ..._ } }, found { ..._ }', 4);
});

const sharedPair = 'type P(...r) = P({ a: Int, ...r }, { b: Bool, ...r }); '
  + 'fn mkp(n: Int): P(...r) = mkp(n); fn same(x: t, y: t): t = x; ';

test('a shared tail with incompatible labels is rejected', () => {
  mismatch(`${sharedPair}fn f(n: Int): Int = match mkp(n) `
    + '{ P(x, y) => { let u = same(x, y); 1 } };', 'y',
  'Expected { a: Int, ..._ }, found { b: Bool, ..._ }', 3);
});

// Rule 6 (the access forms arrive with field access, Task 5).
test('a rigid tail binds a meta tail', () => {
  accepted('fn g(x: { name: Text, ...s }): Int = 1; '
    + 'fn f(p: { name: Text, ...r }): Int = g(p);');
});

test('a rigid tail is never extended', () => {
  mismatch('fn g(x: { name: Text, age: Int, ...s }): Int = 1; '
    + 'fn f(p: { name: Text, ...r }): Int = g(p);', 'p',
  'Expected { age: Int, name: Text, ..._ }, found { name: Text, ...r }', 1);
  mismatch('fn g(x: { name: Text }): Int = 1; '
    + 'fn f(p: { name: Text, ...r }): Int = g(p);', 'p',
  'Expected { name: Text }, found { name: Text, ...r }', 1);
});

// Task 3's interim equality refused these.
const box = 'type Box(...r) = Box({ a: Int, ...r }); ';

test('a record row argument unifies with a meta', () => {
  accepted(`${box}fn f(x: Box(...e)): Int = f(x);`);
});

test('a constructor with a record parameter matches', () => {
  accepted(`${box}fn f(x: Box(...e)): Int = match x { Box(y) => 1 };`);
});

test('a declaration\'s lacks reach its rigid argument', () => {
  accepted(`${box}fn f(x: Box(...e)): Box(...e) = `
    + 'match x { Box(y) => Box(y) };');
});

test('a declaration\'s lacks reach a meta argument', () => {
  mismatch(`${box}fn k(y: { ...s }): Box(...s) = k(y); `
    + 'fn f(x: { a: Int }): Int = { let u = k(x); 1 };', 'x',
  'Expected { ..._ }, found { a: Int }', 4);
});

test('a recursive declaration\'s lacks are gathered once', () => {
  accepted('type L(...r) = Nil | Cons({ a: Int, ...r }, L(...r)); '
    + 'fn f(x: L(...e)): L(...e) = '
    + 'match x { Nil => Nil, Cons(y, rest) => Cons(y, rest) };');
});

test('nested records unify field by field', () => {
  accepted('fn g(x: { a: { b: Int, ...r } }): Int = 1; '
    + 'fn f(y: { a: { b: Int, c: Bool } }): Int = g(y);');
  mismatch('fn g(x: { a: { b: Int } }): Int = 1; '
    + 'fn f(y: { a: { b: Bool } }): Int = g(y);', 'y',
  'Expected { a: { b: Int } }, found { a: { b: Bool } }', 1);
});

// Fix round 1: a tail bound while the shared fields unify is followed
// before the tails are decided, never overwritten.
const nested = 'fn g(x: { a: { ...r }, ...r }): { ...r } = g(x); ';

test('a tail bound by a field is not rebound by the tails', () => {
  mismatch('fn g(x: { a: { ...r }, ...r }): Int = 1; '
    + 'fn f(p: { a: { b: Int }, c: Bool }): Int = g(p);', 'p',
  'Expected { a: { ..._ }, ..._ }, found { a: { b: Int }, c: Bool }', 1);
  accepted('fn g(x: { a: { ...r }, ...r }): Int = 1; '
    + 'fn f(p: { a: { c: Bool }, c: Bool }): Int = g(p);');
});

test('a tail bound by a field keeps that binding', () => {
  mismatch(`${nested}fn f(p: { a: { b: Int }, c: Bool }): { c: Bool } `
    + '= g(p);', 'p', 'Expected { a: { ..._ }, ..._ }, found '
    + '{ a: { b: Int }, c: Bool }', 1);
  accepted(`${nested}fn f(p: { a: { b: Int }, b: Int }): { b: Int } `
    + '= g(p);');
});

test('a tail bound by a field then meets the other tail', () => {
  const mk = 'fn mk(n: Int): { a: { b: Int }, ...s } = mk(n); ';
  accepted(`${nested}${mk}fn f(n: Int): { b: Int } = g(mk(n));`);
  mismatch(`${nested}${mk}fn f(n: Int): { c: Bool } = g(mk(n));`, 'g(mk(n))',
    'Expected { c: Bool }, found { b: Int }');
});

// An effect's parameters are types: a record tail may not name one, as
// for a declared type (R001 design §1).
test('a record tail may not name an effect\'s type parameter', () => {
  const diagnostic = resolveRejectedAt('effect E(r) { fn op(y: { ...r }): '
    + '{ a: Int, ...r }; }; fn f(q: { a: Int }): Int with E({ a: Int }) = '
    + `{ let u = E.op(q); 1 };${main}`, 'E_TYPE', '...r');
  assert.equal(diagnostic.message, 'Expected an effect row, found a type');
  const passed = resolveRejectedAt(`${box}effect E(r) { fn op(): Box(...r); `
    + `};${main}`, 'E_TYPE', '...r', 2);
  assert.equal(passed.message, 'Expected an effect row, found a type');
});
