import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRejectedAt, checkedPoly } from './phases.mjs';
import { unresolved } from './r005b-support.mjs';

// R005 Tranche B Task 5, nested equations (design §2.6; rules §9; ledger
// L17; review F4): a label that cancels unifies its field types, and if
// they meet a row of several tails that inner equation waits under its
// own identity with the outer equation's site; the outer equation's
// re-examination sees no label `a` again, so it never defers the inner
// one twice. Check-phase sources, no literal of two spreads.
const nest = 'fn nest(w: { a: { ...p, ...q }, ...r, ...s }): '
  + '{ a: { ...p, ...q }, ...r, ...s } = w; ';
const take = 'fn take(f: (c) -> { a: { x: Int, y: Int }, z: Int }): Int = 0; ';

test('§2.6: the inner equation waits once, reported at the outer site', () => {
  const source = `${nest}${take}fn main(): Int = take(nest);`;
  const found = checkRejectedAt(source, 'E_INTERNAL', 'nest', 1);
  assert.equal(found.message, unresolved);
});

test('the same outer equation met twice: still one report', () => {
  const source = `${nest}fn take(f: (c) -> { a: { x: Int, y: Int }, z: Int }, `
    + 'v: c): Int = 0; fn main(): Int = take(nest, '
    + '{ a: { x: 1, y: 2 }, z: 3 });';
  const found = checkRejectedAt(source, 'E_INTERNAL', 'nest', 1);
  assert.equal(found.message, unresolved);
});

// Later arguments fix `?p` (the inner equation is then solved by the
// drain) and `?r` (the outer one).
const fixed = 'fn nest(w: { a: { ...p, ...q }, ...r, ...s }, v: { ...p }, '
  + 'u: { ...r }): { a: { ...p, ...q }, ...r, ...s } = w; '
  + 'fn take(f: (c, d, e) -> { a: { x: Int, y: Int }, z: Int }, v: d, '
  + 'u: e): Int = 0; ';

test('solved when later arguments fix ?p and ?r', () => {
  checkedPoly(`${fixed}fn main(): Int = take(nest, { x: 1 }, { z: 1 });`);
});

test('fixing ?p alone leaves the outer equation, at its site', () => {
  const source = 'fn nest(w: { a: { ...p, ...q }, ...r, ...s }, '
    + 'v: { ...p }): { a: { ...p, ...q }, ...r, ...s } = w; '
    + 'fn take(f: (c, d) -> { a: { x: Int, y: Int }, z: Int }, v: d): Int '
    + '= 0; fn main(): Int = take(nest, { x: 1 });';
  const found = checkRejectedAt(source, 'E_INTERNAL', 'nest', 1);
  assert.equal(found.message, unresolved);
});

// The inner equation arises only when the drain re-examines the outer
// one, during a later requirement (`inner`): it keeps the outer site, the
// argument `{ a: { x: 1, y: 2 } }`, not the expression being checked
// (row r005b-nested-field).
const two = 'fn two(w: { ...r, ...s }, f: ({ ...r }) -> Int): Int = 0; '
  + 'fn inner(w: { a: { ...p, ...q }, ...t }): Int = 0; ';

test('a nested equation the drain finds keeps the outer site', () => {
  const source = `${two}fn main(): Int = two({ a: { x: 1, y: 2 } }, inner);`;
  const found = checkRejectedAt(source, 'E_INTERNAL',
    '{ a: { x: 1, y: 2 } }');
  assert.equal(found.message, unresolved);
});
