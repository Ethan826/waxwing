import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, spanAt } from './support.mjs';

// R016: a type written in a body (a lambda's annotation, a handler's label,
// a `handle` clause's payload) names its signature's row variables with
// the sorts the signature settled. Reading an effect row as a record row,
// or the reverse, is the signature's own sort error at the body's use,
// noted at the signature's first use (Resolve.SortConflict). Before, an
// effect row as a record tail read as `a is not a field of { a: Int, ...r
// }`, and the other cases were accepted or reached E_INTERNAL.
const main = ' fn main(): Int = 0;';
const state = 'effect State(s) { fn get(): s; fn put(x: s): Unit; }; ';
const holder = 'type H(...r) = H({ a: Int, ...r }); ';
const arrows = 'type E(...e) = E((Int) -> Int with ...e); ';

const misread = (source, message, at, first) => {
  const diagnostic = rejected(source, 'E_TYPE');
  assert.equal(diagnostic.message, message);
  assert.deepEqual(diagnostic.span, at);
  assert.deepEqual(diagnostic.related,
    [{ span: first, message: 'first written here' }]);
};

const effectAsRecord = (source, nth) => misread(source,
  'r is an effect row, not a record row', spanAt(source, '...r', nth),
  spanAt(source, 'with ...r'));

const recordAsEffect = (source, at) => misread(source,
  'r is a record row, not an effect row', at, spanAt(source, '...r'));

test('an effect row as a lambda annotation\'s record tail', () => {
  effectAsRecord('fn g(p: Int): Unit with ...r = { let f = fn(q: { a: '
    + `Int, ...r }) => q.a; () };${main}`, 1);
  effectAsRecord('fn g(h: (Int) -> Int with ...r): Int = { let f = '
    + `fn(q: { ...r }) => 0; 0 };${main}`, 1);
});

test('an effect row passed to a record parameter in a body', () => {
  effectAsRecord(`${holder}fn g(p: Int): Unit with ...r = { let f = `
    + `fn(q: H(...r)) => 0; () };${main}`, 3);
});

test('an effect row in a handler label and a handle payload', () => {
  effectAsRecord(`${state}fn g(p: Int): Unit with ...r = with handler `
    + 'State({ n: Int, ...r }) { get() => crash("x"), put(x) => () } '
    + `{ () };${main}`, 1);
  effectAsRecord('fn g(p: Int): Unit with ...r = handle () '
    + `{ fail(e: { x: { a: Int, ...r } }) => () };${main}`, 1);
});

test('a record row as a lambda annotation\'s effect row', () => {
  const source = 'fn g(p: { a: Int, ...r }): Int = { let f = '
    + `fn(q: (Int) -> Int with ...r) => 0; 0 };${main}`;
  recordAsEffect(source, spanAt(source, 'with ...r'));
});

test('a record row passed to an effect parameter in a body', () => {
  const source = `${arrows}fn g(p: { a: Int, ...r }): Int = { let f = `
    + `fn(q: E(...r)) => 0; 0 };${main}`;
  recordAsEffect(source, spanAt(source, '...r', 1));
});

test('the note is at the signature\'s first use', () => {
  const source = 'fn g(p: { ...r }, s: { b: Int, ...r }): Int = { let f '
    + `= fn(q: (Int) -> Int with ...r) => 0; 0 };${main}`;
  recordAsEffect(source, spanAt(source, 'with ...r'));
});

test('body uses that agree with the signature are accepted', () => {
  checked('fn g(p: Int): Unit with ...r = { let f = fn(q: (Int) -> Int '
    + `with ...r) => 0; () };${main}`);
  checked('fn g(p: { a: Int, ...r }): Int = { let f = fn(q: { a: Int, '
    + `...r }) => q.a; f(p) };${main}`);
  checked(`${holder}fn g(p: { a: Int, ...r }): Int = { let f = `
    + `fn(q: H(...r)) => 0; 0 };${main}`);
  checked(`${arrows}fn g(p: Int): Unit with ...r = { let f = `
    + `fn(q: E(...r)) => 0; () };${main}`);
});
