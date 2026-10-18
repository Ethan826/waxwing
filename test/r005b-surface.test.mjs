import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, spanAt } from './support.mjs';

// R005 Tranche B Task 2: whatever source can now write several tails
// reached a greppable E_INTERNAL placeholder, never a mismatch, a
// missing-field text or an acceptance. Task 3 removed the `disjoint`
// clause's placeholder (test/r005b-disjoint.test.mjs); Task 4 removed the
// unification's (`rows with several tails are checked in Task 4`): the
// same sources are now solved by forced moves, refused for a reason, or
// reach Task 5's placeholder where an equation would wait
// (docs/plans/2026-10-17-open-row-merge-plan.md, Global Constraints).
const main = ' fn main(): Int = 0;';
const waits = 'R005B placeholder: equations that wait are solved in Task 5';
const both = 'type Both(...r, ...s) = Both({ ...r, ...s }); ';

const placeholder = (source, message) => {
  const found = rejected(source, 'E_INTERNAL');
  assert.equal(found.message, message);
  return found;
};

for (const [name, source] of [
  ['returning a parameter', `fn pick(w: { ...r, ...s }): { ...r, ...s } = w;`
    + main],
  ['reading a known field', `fn get(w: { a: Int, ...r, ...s }): Int = w.a;`
    + main]
]) {
  test(`several tails are solved (Task 4): ${name}`, () => {
    checked(source);
  });
}

for (const [name, source] of [
  ['calling with a record', 'fn f(w: { ...r, ...s }): Int = 0; '
    + 'fn main(): Int = f({ a: 1 });'],
  ['passing a generic row on', 'fn f(w: { ...r, ...s }): Int = 0; '
    + 'fn g(v: { ...a, ...b }): Int = f(v);' + main],
  ['a constructor with two tails', `${both}fn main(): Int = { let b = `
    + 'Both({ x: 1, y: 2 }); 0 };'],
  ['two calls of one generic', 'fn id(w: { ...r, ...s }): { ...r, ...s } = w; '
    + 'fn main(): Int = { let a = id({ x: 1 }); 0 };']
]) {
  test(`an equation that would wait reaches Task 5: ${name}`, () => {
    const found = placeholder(source, waits);
    assert.ok(found.span.start.offset < source.length);
  });
}

test('a field neither written nor in a tail is missing (Task 4)', () => {
  const source = `fn get(w: { ...r, ...s }): Int = w.a;${main}`;
  const found = rejected(source, 'E_TYPE');
  assert.equal(found.message, 'a is not a field of { ...r, ...s }');
});

test('the placeholder is at the unification that would wait', () => {
  const source = 'fn f(w: { ...r, ...s }): Int = 0; '
    + 'fn main(): Int = f({ a: 1 });';
  const found = placeholder(source, waits);
  assert.deepEqual(found.span, spanAt(source, '{ a: 1 }'));
});

test('a signature with several tails and no record use is accepted', () => {
  checked(`fn f(w: { ...r, ...s }): Int = 0;${main}`);
  checked(`${both}fn f(b: Both(...r, ...s)): Int = match b { Both(p) => 0 };`
    + main);
});

test('a disjoint clause is checked, defined or called (Task 3)', () => {
  const defined = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = '
    + `0;${main}`;
  checked(defined);
  checked('fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = '
    + '0; fn main(): Int = g({ x: 1 }, { y: 2 });');
});

test('a disjoint clause beside lacks is checked too (Task 3)', () => {
  checked('fn g(a: { ...r }, b: { ...s }): Int where r lacks { x }, '
    + `r disjoint s = 0;${main}`);
});

test('a function without the clause is unchanged', () => {
  checked('fn g(a: { ...r }, b: { ...s }): Int where r lacks { x } = 0;'
    + main);
});

// User ruling 2026-10-17: a named rest binder or a removal over several
// tails is a placeholder even where nothing calls the function (Task 7
// types it). A bare `...` binds nothing, so it stays accepted.
const rest = 'R005B placeholder: rest binders and removal over several '
  + 'tails are typed in Task 7';
const arm = (head, tail) => `fn f(p: { a: Int, ...r, ...s }): ${head} = `
  + `match p { { a, ${tail} } => a };${main}`;

for (const [name, source] of [
  ['an unused named rest', arm('Int', '...rest')],
  ['a returned named rest', 'fn f(p: { a: Int, ...r, ...s }): '
    + `{ ...r, ...s } = match p { { a, ...q } => q };${main}`],
  ['a used named rest', 'fn f(p: { a: Int, b: Int, ...r, ...s }): Int = '
    + `match p { { a, ...q } => q.b };${main}`],
  ['a named rest passed on', 'fn g(w: { ...u }): Int = 0; '
    + 'fn f(p: { a: Int, ...r, ...s }): Int = '
    + `match p { { a, ...q } => g(q) };${main}`],
  ['a removal never called', 'fn f(p: { a: Int, ...r, ...s }): Int = '
    + `{ let z = p without { a }; 0 };${main}`]
]) {
  test(`several tails reach the rest placeholder: ${name}`, () => {
    placeholder(source, rest);
  });
}

test('a bare rest over several tails is accepted', () => {
  checked(arm('Int', '...'));
});

test('single-tail rest and removal are unchanged', () => {
  checked('fn f(p: { a: Int, b: Int, ...r }): Int = '
    + `match p { { a, ...q } => q.b };${main}`);
  checked('fn f(p: { a: Int, ...r }): Int = '
    + `match p { { a, ...q } => a };${main}`);
  checked('fn f(p: { a: Int, ...r }): Int = '
    + `{ let z = p without { a }; 0 };${main}`);
});
