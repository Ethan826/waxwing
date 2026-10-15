import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, spanAt } from './support.mjs';

// R017: a type written in a body reads a signature's row variable as a
// type, or its type variable as a row, with the error the signature gives
// for the same mistake (Resolve.SortConflict `conflict`): E_TYPE `Expected
// a type, found an effect row` or `Expected an effect row, found a type`
// at the body's use, with no note. Before, these were accepted, E_INTERNAL
// `Invalid type variable` or `b is not a field of { b: Int, ...a }`.
const main = ' fn main(): Int = 0;';
const list = 'type List(a) = Nil | Cons(a, List(a)); ';

// The span of `text` where it follows `before`.
const after = (source, before, text) => {
  const start = spanAt(source, before + text).start.offset + before.length;
  const position = offset => ({ offset, line: 1, column: offset + 1 });
  return { start: position(start), end: position(start + text.length) };
};

const sortError = (source, message, at) => {
  const diagnostic = rejected(source, 'E_TYPE');
  assert.equal(diagnostic.message, message);
  assert.deepEqual(diagnostic.span, at);
  assert.deepEqual(diagnostic.related, []);
};
const rowAsType = (source, before, text) => sortError(source,
  'Expected a type, found an effect row', after(source, before, text));
const typeAsRow = (source, before, text) => sortError(source,
  'Expected an effect row, found a type', after(source, before, text));

test('a record row read as a type in a lambda annotation', () => {
  rowAsType(`fn g(p: { ...r }): Int = { let f = fn(q: r) => 0; 0 };${main}`,
    'q: ', 'r');
  rowAsType(`${list}fn g(p: { ...r }): Int = { let f = fn(q: List(r)) `
    + `=> 0; 0 };${main}`, 'q: List(', 'r');
});

test('an effect row read as a type in a lambda annotation', () => {
  rowAsType('fn g(p: Int): Unit with ...r = { let f = fn(q: r) => 0; () };'
    + main, 'q: ', 'r');
});

test('a row read as a type in a handle payload', () => {
  rowAsType('fn g(p: { ...r }): Int = handle 1 { fail(e: { x: r }) => 2 };'
    + main, 'x: ', 'r');
});

test('a type variable read as a record row', () => {
  typeAsRow('fn g(p: a): Int = { let f = fn(q: { b: Int, ...a }) => q.b; '
    + `0 };${main}`, 'b: Int, ', '...a');
});

test('a type variable read as an effect row', () => {
  typeAsRow('fn g(p: a): Int = { let f = fn(q: (Int) -> Int with ...a) => '
    + `0; 0 };${main}`, '(Int) -> Int ', 'with ...a');
});

test('a type variable read as a type is accepted', () => {
  checked(`${list}fn g(p: a): Int = { let f = fn(q: List(a)) => 0; 0 };`
    + main);
});
