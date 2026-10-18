import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRejectedAt, checkedPoly } from './phases.mjs';
import { unresolved } from './r005b-support.mjs';

// R005 Tranche B Task 5, `r005b-both-annotation` (design §8; review F9;
// fixtures design-both-annotated and diag-07-fix): a declared type's
// record-row arguments fix what its payload equation leaves open. The
// payload `{ ...?r, ...?s } ~ { x: Int, y: Int }` waits; the result
// `Both(...?r, ...?s)` against the annotation binds `?r` and `?s` one
// argument at a time (R012); the drain then finds the equation holds.
// Met in the other order (the expected result first) the payload is an
// ordinary closed equation: the same verdict (C2). It runs from Task 8.
const both = 'type Both(...r, ...s) = Both({ ...r, ...s }); ';
const annotated = `${both}fn example(): Both({ x: Int }, { y: Int }) = `
  + 'Both({ x: 1, y: 2 }); fn main(): Int = { let b = example(); 0 };';

test('the annotated Both is accepted (argument first)', () => {
  checkedPoly(annotated);
});

// `build(Both, example(), payload)`: `k` fixes `p` and `b` from Both's
// type, `x` binds Both's row arguments from the annotated value, and only
// then is the payload checked, against a row already known.
const build = 'fn build(k: (p) -> b, x: b, y: p): Int = 0; ';
const value = `${both}fn example(): Both({ x: Int }, { y: Int }) = `
  + 'Both({ x: 1, y: 2 }); ';

test('the annotated Both, expected result first, is accepted', () => {
  checkedPoly(`${value}${build}`
    + 'fn main(): Int = build(Both, example(), { x: 1, y: 2 });');
});

test('payload first, through the same helper, is accepted too', () => {
  checkedPoly(`${value}fn build2(k: (p) -> b, y: p, x: b): Int = 0; `
    + 'fn main(): Int = build2(Both, { x: 1, y: 2 }, example());');
});

test('a wrong annotation is refused, not Unresolved', () => {
  const source = `${both}fn example(): Both({ x: Int }, { z: Int }) = `
    + 'Both({ x: 1, y: 2 }); fn main(): Int = 0;';
  assert.throws(() => checkedPoly(source));
});

test('the unannotated Both is Unresolved at the argument', () => {
  const source = `${both}fn main(): Int = { let b = Both({ x: 1, y: 2 }); 0 };`;
  const found = checkRejectedAt(source, 'E_INTERNAL', '{ x: 1, y: 2 }');
  assert.equal(found.message, unresolved);
});
