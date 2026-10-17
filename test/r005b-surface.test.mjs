import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, spanAt } from './support.mjs';

// R005 Tranche B Task 2: whatever source can now write several tails or a
// `disjoint` clause reaches a greppable E_INTERNAL placeholder, never a
// mismatch, a missing-field text or an acceptance. The placeholders go in
// Tasks 3 and 4 (docs/plans/2026-10-17-open-row-merge-plan.md, Global
// Constraints).
const main = ' fn main(): Int = 0;';
const several = 'R005B placeholder: rows with several tails are checked in '
  + 'Task 4';
const disjoint = 'R005B placeholder: disjoint constraints are checked in '
  + 'Task 3';
const both = 'type Both(...r, ...s) = Both({ ...r, ...s }); ';

const placeholder = (source, message) => {
  const found = rejected(source, 'E_INTERNAL');
  assert.equal(found.message, message);
  return found;
};

for (const [name, source] of [
  ['returning a parameter', `fn pick(w: { ...r, ...s }): { ...r, ...s } = w;`
    + main],
  ['calling with a record', 'fn f(w: { ...r, ...s }): Int = 0; '
    + 'fn main(): Int = f({ a: 1 });'],
  ['passing a generic row on', 'fn f(w: { ...r, ...s }): Int = 0; '
    + 'fn g(v: { ...a, ...b }): Int = f(v);' + main],
  ['reading a known field', `fn get(w: { a: Int, ...r, ...s }): Int = w.a;`
    + main],
  ['reading an unknown field', `fn get(w: { ...r, ...s }): Int = w.a;` + main],
  ['removing a field', 'fn f(w: { a: Int, ...r, ...s }): Int = '
    + `{ let z = w without { a }; 0 };${main}`],
  ['a rest binder returned', 'fn f(w: { a: Int, ...r, ...s }): '
    + `{ ...r, ...s } = match w { { a, ...q } => q };${main}`],
  ['a constructor with two tails', `${both}fn main(): Int = { let b = `
    + 'Both({ x: 1, y: 2 }); 0 };'],
  ['two calls of one generic', 'fn id(w: { ...r, ...s }): { ...r, ...s } = w; '
    + 'fn main(): Int = { let a = id({ x: 1 }); 0 };']
]) {
  test(`several tails reach the placeholder: ${name}`, () => {
    const found = placeholder(source, several);
    assert.ok(found.span.start.offset < source.length);
  });
}

test('the placeholder is at the unification that met the tails', () => {
  const source = `fn pick(w: { ...r, ...s }): { ...r, ...s } = w;${main}`;
  const found = placeholder(source, several);
  assert.deepEqual(found.span, spanAt(source, 'w', 1));
});

test('a signature with several tails and no record use is accepted', () => {
  checked(`fn f(w: { ...r, ...s }): Int = 0;${main}`);
  checked(`${both}fn f(b: Both(...r, ...s)): Int = match b { Both(p) => 0 };`
    + main);
});

test('a disjoint clause reaches its placeholder, defined or called', () => {
  const defined = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = '
    + `0;${main}`;
  placeholder(defined, disjoint);
  const called = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = '
    + '0; fn main(): Int = g({}, {});';
  placeholder(called, disjoint);
});

test('a disjoint clause beside lacks reaches the same placeholder', () => {
  placeholder('fn g(a: { ...r }, b: { ...s }): Int where r lacks { x }, '
    + `r disjoint s = 0;${main}`, disjoint);
});

test('a function without the clause is unchanged', () => {
  checked('fn g(a: { ...r }, b: { ...s }): Int where r lacks { x } = 0;'
    + main);
});
