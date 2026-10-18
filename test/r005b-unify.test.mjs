import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, spanAt } from './support.mjs';
import { checkedPoly } from './phases.mjs';
import { assertDiagnostic } from './r005b-support.mjs';

// R005 Tranche B Task 4: rows with several tails unify by forced moves
// (design §2.1), on check-phase sources with no literal of two spreads
// (plan, "Test stages"). An equation that would wait reaches Task 5's
// placeholder; a row of several tails under a specialization key reaches
// Task 8's.
const main = ' fn main(): Int = 0;';
const waits = 'R005B placeholder: equations that wait are solved in Task 5';
const lowered = 'R005B placeholder: rows with several tails are lowered in '
  + 'Task 8';
const at = (text, nth = 0) => ({ text, nth });

test('common tails cancel: a row equals its tails in another order', () => {
  checked(`fn swap(p: { ...r, ...s }): { ...s, ...r } = p;${main}`);
  checked('fn swap(p: { a: Int, ...r, ...s }): { a: Int, ...s, ...r } = p;'
    + main);
});

test('a lone meta takes two holes (two holes against one)', () => {
  const source = 'fn pick2(w: { ...r, ...s }): Int = 0; '
    + 'fn wrap(f: ({ ...t }) -> Int): Int = 0; fn main(): Int = wrap(pick2);';
  checkedPoly(source);
  assert.equal(rejected(source, 'E_INTERNAL').message, lowered);
});

test('a field written beside two tails is read; one not written is missing',
  () => {
    checked(`fn get(w: { a: Int, ...r, ...s }): Int = w.a;${main}`);
    const source = `fn get(w: { ...r, ...s }): Int = w.a;${main}`;
    const found = rejected(source, 'E_TYPE');
    assert.equal(found.message, 'a is not a field of { ...r, ...s }');
    assert.deepEqual(found.span, spanAt(source, 'a', 0));
  });

test('a constant with two homes waits: Task 5\'s placeholder, at the call',
  () => {
    const source = 'fn f(w: { ...r, ...s }): Int = 0; '
      + 'fn main(): Int = f({ a: 1 });';
    const found = rejected(source, 'E_INTERNAL');
    assert.equal(found.message, waits);
    assert.deepEqual(found.span, spanAt(source, '{ a: 1 }'));
  });

// R10.2: a bound the written lacks prune to nothing makes U4 bind the
// meta to `{}`; the refusal is still the lack's text, never `Expected {},
// found …` (fixtures lone-meta-lack and -two, one tail, since Task 3).
const granted = clauses => 'fn granted2(p: { ...r, ...s }): Bool '
  + `where ${clauses} = true; `;

test('two lacking tails: the earlier clause is named (R10.2)', () => {
  for (const argument of ['{ admin: false }', '{ name: 1, admin: false }']) {
    const source = `${granted('r lacks { admin }, s lacks { admin }')}`
      + `fn main(): Int = { let b = granted2(${argument}); 0 };`;
    assertDiagnostic(source, { code: 'E_TYPE',
      message: 'admin is not allowed here: r lacks { admin }',
      at: at(argument),
      notes: [{ message: 'required here', at: at('admin') }] });
  }
});

test('one lacking tail: the other takes the label (forced by a fact)', () => {
  const source = `${granted('s lacks { admin }')}`
    + 'fn main(): Int = { let b = granted2({ admin: false }); 0 };';
  checkedPoly(source);
  assert.equal(rejected(source, 'E_INTERNAL').message, lowered);
});
