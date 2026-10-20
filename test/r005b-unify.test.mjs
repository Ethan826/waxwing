import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, spanAt } from './support.mjs';
import { checkedPoly } from './phases.mjs';
import { assertDiagnostic } from './r005b-support.mjs';

// R005 Tranche B Task 4: rows with several tails unify, on check-phase
// sources with no literal of two spreads (plan, "Test stages"). Since B3
// a row made with two unknown tails is one unknown tail and a `Merge`
// predicate (plan §2.1); a predicate no case decides waits to the end of
// the body; since B4 an Unresolved body is placeholder P6 at the use
// that made it; a row of several tails under a specialization key
// reaches Task 8's.
const main = ' fn main(): Int = 0;';
const waits = 'R005B placeholder: unresolved merge predicates are reported '
  + 'in Task B5';
const lowered = 'R005B placeholder: rows with several tails are lowered in '
  + 'Task 8';
const at = (text, nth = 0) => ({ text, nth });

test('common tails cancel: a row equals its tails in another order', () => {
  checked(`fn swap(p: { ...r, ...s }): { ...s, ...r } = p;${main}`);
  checked('fn swap(p: { a: Int, ...r, ...s }): { a: Int, ...s, ...r } = p;'
    + main);
});

// Before B3 the lone meta took both holes and only lowering stopped it;
// now nothing fixes how `t` splits between `r` and `s`: it waits (QT-strict
// leaves it Unresolved).
test('a lone meta against two holes: Unresolved (P6)', () => {
  const source = 'fn pick2(w: { ...r, ...s }): Int = 0; '
    + 'fn wrap(f: ({ ...t }) -> Int): Int = 0; fn main(): Int = wrap(pick2);';
  const found = rejected(source, 'E_INTERNAL');
  assert.equal(found.message, waits);
  assert.deepEqual(found.span, spanAt(source, 'pick2', 1));
});

// Case 1: the left part known when the parts are checked, so the
// predicate is solved and only lowering (Task 8) stops the program.
test('known parts solve the predicate (case 1)', () => {
  const source = 'fn pick2(p: { ...r }, q: { ...s }, w: { ...r, ...s }): '
    + '{ ...r, ...s } where r disjoint s = w; fn main(): Int = '
    + '{ let x = pick2({ a: 1 }, { b: 2 }, { a: 1, b: 2 }); 0 };';
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

test('a constant with two homes: Unresolved, P6 at the call',
  () => {
    const source = 'fn f(w: { ...r, ...s }): Int = 0; '
      + 'fn main(): Int = f({ a: 1 });';
    const found = rejected(source, 'E_INTERNAL');
    assert.equal(found.message, waits);
    assert.deepEqual(found.span, spanAt(source, 'f({ a: 1 })'));
  });

// Two unknown tails against labels: before B2 a bound the written lacks
// pruned to nothing made U4 bind both metas to `{}` and the lack's text
// was reported (R10.2), and with one tail lacking the label a commit put
// it in the other. Both were the removed machinery's; from B3 both
// waited at the end of the body. Since B4 H refuses the first (recovery
// obligations O1, O2): `admin` has no home, both tails lacking it; the
// predicate's contradiction is placeholder P2 at the call until B5
// renders it, with the written fact's text preferred (R10.2's principle,
// plan §10 decision 5). The second stays Unresolved (O4, an accepted
// limitation: no annotation at the call can fix it), P6 at the call. The
// one-tail fixtures lone-meta-lack and -two keep D1 through the bind
// rule.
const granted = clauses => 'fn granted2(p: { ...r, ...s }): Bool '
  + `where ${clauses} = true; `;
const contradicted = 'R005B placeholder: contradictions from merge '
  + 'predicates are reported in Task B5';

test('two tails against labels: H refuses O1, O2; O4 is Unresolved', () => {
  for (const [clauses, message] of [
    ['r lacks { admin }, s lacks { admin }', contradicted],
    ['s lacks { admin }', waits]]) {
    for (const argument of ['{ admin: false }',
      '{ name: 1, admin: false }']) {
      const source = `${granted(clauses)}`
        + `fn main(): Int = { let b = granted2(${argument}); 0 };`;
      const found = rejected(source, 'E_INTERNAL');
      assert.equal(found.message, message, clauses);
      assert.deepEqual(found.span, spanAt(source, `granted2(${argument})`));
    }
  }
});

// The old inputs of the two probes Task 4 rewrote (rows `r001-lacks`,
// `r005b-self-apart`) stay rejected, with their current texts: from Task
// 4 to B2 the bound's pruning (U2, U4) refused them before the guard the
// rows now isolate; since B2 the bind rule and the rigid pair's check
// do.
test('a lone meta against a label it lacks is still refused', () => {
  const source = 'fn k(y: { ...r }): { a: Int, ...r } = k(y); '
    + 'fn f(q: { a: Int }): Int = { let u = k(q); 1 }; fn main(): Int = 0;';
  const found = rejected(source, 'E_TYPE');
  assert.equal(found.message, 'Expected { ..._ }, found { a: Int }');
  assert.deepEqual(found.span, spanAt(source, 'q', 1));
});

test('one rigid passed for both disjoint parameters is still D3\'', () => {
  const source = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = '
    + '0; fn h(p: { ...r }): Int = g(p, p); fn main(): Int = 0;';
  assertDiagnostic(source, { code: 'E_TYPE',
    message: 'r is in both records and may have fields', at: at('p', 2),
    notes: [{ message: 'required here', at: at('r disjoint s') }] });
});
