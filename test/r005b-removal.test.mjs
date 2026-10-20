import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly } from './phases.mjs';
import { checkWired, offsets } from './r005b-support.mjs';

// R005 Tranche B Task 7 (design draft 3 §5.2, user decision 6): `e
// without { l1, …, ln }` requires `e` against `{ l1: α1, …, ln: αn, ...ρ
// }` in one requirement and has type ρ, never a subtraction from a
// resolved type; a record pattern's named rest likewise. So a label
// removed from a merge whose parts are not yet known is gone from the
// rest at once, and, once they are, the rest is what is left whichever
// part held it (review F1: a subtraction while the label had two homes
// removed nothing, and the label came back). Before Task 7 a removal or
// rest over several tails was a placeholder (P3).
const merge = 'fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }\n'
  + '  where r disjoint s = { ...a, ...b };\n';
// Sources span lines, so spans are compared as offsets.
const rejects = (source, text, nth, message) => {
  const found = checkWired(source);
  assert.notEqual(found, null, `accepted: ${source}`);
  assert.deepEqual(
    [found.code, found.message, found.span.start.offset, found.span.end.offset],
    ['E_TYPE', message, ...offsets(source, { text, nth })]);
};
const dropped = (removed, uses) => `${merge}fn main(): Int = {\n`
  + `  let drop = fn(p, q) => ${removed};\n  ${uses}\n};\n`;
const restOf = 'match merge(p, q) { { x, ...rest } => rest }';

test('without: x in the left part or the right, the rest is { y: Int }',
  () => {
    const removed = 'merge(p, q) without { x }';
    for (const call of ['drop({ x: 1 }, { y: 2 })',
      'drop({ y: 2 }, { x: 1 })']) {
      checkedPoly(dropped(removed, `${call}.y`));
      rejects(dropped(removed, `${call}.x`), 'x', 2,
        'x is not a field of { y: Int }');
    }
  });

test('a named rest: x in either part, the rest is { y: Int }', () => {
  for (const call of ['drop({ x: 1 }, { y: 2 })',
    'drop({ y: 2 }, { x: 1 })']) {
    checkedPoly(dropped(restOf, `${call}.y`));
    rejects(dropped(restOf, `${call}.x`), 'x', 2,
      'x is not a field of { y: Int }');
  }
});

test('.x on the rest is refused while the predicate waits', () => {
  rejects(dropped('{ let rest = merge(p, q) without { x }; rest.x }', '0'),
    'x', 1, 'x is not a field of { ..._ }');
  rejects(dropped(`{ let rest = ${restOf}; rest.x }`, '0'), 'x', 1,
    'x is not a field of { ..._ }');
});

// Over several rigid tails nothing waits: the rest is the other tails.
test('removal and a named rest over several rigid tails', () => {
  const tails = '{ x: Int, ...r, ...s }';
  checkedPoly(`fn f(p: ${tails}): { ...r, ...s } = p without { x };\n`
    + 'fn main(): Int = 0;');
  checkedPoly(`fn f(p: ${tails}): { ...r, ...s } = `
    + 'match p { { x, ...rest } => rest };\nfn main(): Int = 0;');
  rejects(`fn f(p: ${tails}): Int = (p without { x }).x;\n`
    + 'fn main(): Int = 0;', 'x', 2, 'x is not a field of { ...r, ...s }');
});
