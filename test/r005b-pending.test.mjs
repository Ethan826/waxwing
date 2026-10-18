import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRejectedAt, checkedPoly } from './phases.mjs';
import { unresolved } from './r005b-support.mjs';

// R005 Tranche B Task 5 (plan, Task 5): equations that wait, on
// check-phase sources with no literal of two spreads. A body that ends
// with an equation holding a constant is Unresolved; its text is Task 6's
// (D4), so until then the placeholder's E_INTERNAL, at the earliest site
// of such an equation (R7, R11). Quiet equations are met by the empty
// default and never reported.
const split = 'fn split(p: { ...r, ...s }): Int = 0; ';
const both = 'type Both(...r, ...s) = Both({ ...r, ...s }); ';

test('split({ x: 1, y: 2 }) waits to the end: Unresolved, at the argument',
  () => {
    const source = `${split}fn main(): Int = split({ x: 1, y: 2 });`;
    const found = checkRejectedAt(source, 'E_INTERNAL', '{ x: 1, y: 2 }');
    assert.equal(found.message, unresolved);
  });

test('a split whose label one part lacks is accepted', () => {
  checkedPoly('fn split(p: { ...r, ...s }): Int where s lacks { x } = 0; '
    + 'fn main(): Int = split({ x: 1 });');
});

test('the unannotated Both is Unresolved at the argument', () => {
  for (const body of ['fn main(): Int = { let b = Both({ x: 1, y: 2 }); 0 };',
    'fn example(): Int = { let b = Both({ x: 1, y: 2 }); 0 }; '
      + 'fn main(): Int = example();']) {
    const source = `${both}${body}`;
    const found = checkRejectedAt(source, 'E_INTERNAL', '{ x: 1, y: 2 }');
    assert.equal(found.message, unresolved);
  }
});

test('of two waiting equations the earlier site is reported', () => {
  const source = `${split}fn main(): Int = split({ x: 1, y: 2 }) `
    + '+ split({ a: 1, b: 2 });';
  const found = checkRejectedAt(source, 'E_INTERNAL', '{ x: 1, y: 2 }');
  assert.equal(found.message, unresolved);
});

// h(pick × 12): each pick's result meets d's binding with metas on both
// sides and no constant, a quiet equation; accepted (the empty default),
// no basis built (review F5, row r005b-quiet).
const pick = 'fn pick(w: { ...r, ...s }): { ...r, ...s } = w; ';
const parameters = n => Array.from({ length: n }, (_, i) =>
  `f${i + 1}: (c) -> d`).join(', ');
const quiet = n => `${pick}fn h(${parameters(n)}): Int = 0; `
  + `fn main(): Int = h(${Array(n).fill('pick').join(', ')});`;
const QUIET_BOUND_MS = 5000;

test('quiet equations are accepted: h(pick x 12) within a bound', t => {
  checkedPoly(quiet(2));
  const started = performance.now();
  checkedPoly(quiet(12));
  const took = performance.now() - started;
  t.diagnostic(`h(pick x 12): ${took.toFixed(1)} ms`);
  assert.ok(took < QUIET_BOUND_MS, `${took} ms`);
});
