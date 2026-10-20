import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly, checkRejectedAt } from './phases.mjs';
import { byH, finishWithoutH, run, stateOf } from './row-merge-entry.mjs';
import { allOrders } from './row-merge-gen.mjs';

// R005 Tranche B, case 2g (user, 2026-10-19, plan §10 decision 17): case
// 2 with rigid tails, an explicit adaptation like 1g, not PureScript's
// given matching. For `Merge l r t` whose right part and result hold no
// unknown tail once bindings are followed, and whose result holds every
// label and every rigid tail of the right part, `l := t` less those,
// rigid tails cancelled by identity, shared fields' types unified. A
// missing label or rigid tail makes 2g claim nothing: case 3 is tried as
// before 2g (the amendment; the counterexample below), and Sym tries the
// mirror.
// Labels-only problems run through the solver entry (rigids R, S, T;
// metas m<n>); typed ones through the checker.
const row = (fields, tails = []) => ({ fields, tails });
const eq = (l, r) => ({ k: 'eq', l, r });
const apart = { lacks: {}, apart: [['R', 'S'], ['R', 'T'], ['S', 'T']] };
const bound = (found, meta) => stateOf(found.subst).bindings.get(meta);

test('a rigid tail cancels: the self-call shape is solved', () => {
  const found = run(apart, [eq(row([], ['m0']), row([], ['R'])),
    eq(row([], ['m0', 'm1']), row([], ['R', 'S']))]);
  assert.equal(found.v, 'accept');
  assert.deepEqual(bound(found, 'm1'), row([], ['S']));
});

test('two rigid tails of the right part cancel together', () => {
  const found = run(apart, [eq(row([], ['m1']), row([], ['R', 'S'])),
    eq(row([], ['m0', 'm1']), row([], ['R', 'S', 'T']))]);
  assert.equal(found.v, 'accept');
  assert.deepEqual(bound(found, 'm0'), row([], ['T']));
});

test('the inputs exchanged give the same solution (Sym)', () => {
  for (const tails of [['m0', 'm1'], ['m1', 'm0']]) {
    const found = run(apart, [eq(row([], ['m1']), row([], ['R'])),
      eq(row([], tails), row([], ['R', 'S']))]);
    assert.equal(found.v, 'accept', tails.join());
    assert.deepEqual(bound(found, 'm0'), row([], ['S']), tails.join());
  }
});

test('labels beside the rigid tails are taken by name', () => {
  const lacking = { ...apart, lacks: { R: ['a', 'b'], S: ['a', 'b'] } };
  const found = run(lacking, [eq(row([], ['m1']), row(['a'], ['R'])),
    eq(row([], ['m0', 'm1']), row(['a', 'b'], ['R', 'S']))]);
  assert.equal(found.v, 'accept');
  assert.deepEqual(bound(found, 'm0'), row(['b'], ['S']));
});

// No 2g: the predicate waits to the end of the body, where H (B4) finds
// S with no home (the result has no unknown) and refuses; m0 was never
// bound.
test('a rigid tail the result lacks: no 2g, H refuses at the end', () => {
  const found = run(apart, [eq(row([], ['m1']), row([], ['S'])),
    eq(row([], ['m0', 'm1']), row([], ['R']))]);
  assert.equal(found.v, 'refuse');
  assert.ok(found.atEnd && byH(found.failure));
  assert.equal(bound(found, 'm0'), undefined);
});

test('an unknown tail in the result leaves it Unresolved', () => {
  const found = run(apart, [eq(row([], ['m1']), row([], ['S'])),
    eq(row([], ['m0', 'm1']), row([], ['S', 'm2']))]);
  assert.equal(found.v, 'unresolved');
  assert.equal(bound(found, 'm0'), undefined);
});

test('a label the result lacks: no 2g, the mirror\'s case 3 refuses',
  () => {
    const lacking = { ...apart, lacks: { S: ['a'] } };
    const found = run(lacking, [eq(row([], ['m1']), row(['a'], ['S'])),
      eq(row([], ['m0', 'm1']), row([], ['R', 'S']))]);
    assert.equal(found.v, 'refuse');
  });

// The counterexample to the first 2g proposal (generated family
// 'program-shaped, shared', seed 25, minimized): `Merge R {a | u} {c}`'s
// mirror meets 2g's preconditions; R is missing from `{c}`. Waiting there
// kept case 3 from moving `a` into `{c}`, so some orders waited where
// every order refused before 2g. It has no solution; it refuses in every
// order, and with H off too (B4: H would refuse it at the end anyway,
// which must not hide that case 3 is kept from it).
test('a missing atom never keeps case 3 from a refusal, in any order', () => {
  const hyp = { lacks: { R: ['a', 'b', 'c'] }, apart: [] };
  const steps = [eq(row([], ['m2']), row([], ['R'])),
    eq(row([], ['m3']), row([])), eq(row([], ['m5']), row(['a'], ['R'])),
    eq(row([], ['m0']), row([], ['m2', 'm3'])),
    eq(row([], ['m1']), row([], ['m4', 'm5'])),
    eq(row([], ['m0', 'm1']), row(['c']))];
  for (const order of allOrders(steps)) {
    assert.equal(run(hyp, order).v, 'refuse', JSON.stringify(order));
    const off = run(hyp, order, finishWithoutH);
    assert.ok(off.v === 'refuse' && !off.atEnd, JSON.stringify(order));
  }
});

const pickR = 'fn pickR(p: { ...r }, q: { ...s }): { ...r, ...s } '
  + 'where r disjoint s = pickR(p, q); ';
const same = 'fn same(a: z, b: z): Int = 0; ';
const main = ' fn main(): Int = 0;';
// A clash a predicate caused that no part of it explains keeps the
// failure's own text (B5: Features.Check.Contradicted renders D6 only for
// a part at fault).
const caused = (source, text, nth, message) => assert.equal(
  checkRejectedAt(source, 'E_TYPE', text, nth).message, message);
const last = (source, text) => source.split(text).length - 2;

// `y` is the unknown part beside `x: { ...a }`; `h` fixes the result.
const lambda = (result, body, clauses = '') => `${pickR}${same}fn g(x: `
  + `{ ...a }, z: { ...b }, h: (${result}) -> Int): Int where a disjoint b`
  + `${clauses} = { let f = fn(y, w) => { let k = ${body}; 0 }; 0 };${main}`;

test('the cancelled part is the other rigid tail, either way round', () => {
  for (const call of ['pickR(x, y)', 'pickR(y, x)']) {
    const body = `h(${call}); let s = same(y, z)`;
    checkedPoly(lambda('{ ...a, ...b }', body));
    const clash = lambda('{ ...a, ...b }', `h(${call}); let s = same(y, x)`);
    caused(clash, 'x', last(clash, 'x'), 'Expected { ...b }, found { ...a }');
  }
});

test('a shared field\'s types are unified: a clash is refused', () => {
  const result = '{ n: Int, ...a, ...b }';
  const clauses = ', a lacks { n }';
  checkedPoly(lambda(result, 'h(pickR(y, { n: 1, ...x }))', clauses));
  const call = 'pickR(y, { n: true, ...x })';
  caused(lambda(result, `h(${call})`, clauses), call, 0,
    'Expected { n: Int, ...a, ...b }, found { n: Bool, ..._ }');
});

// `w` is bound to `{ m: Int }` by the shared field; a later clash on it
// is an ordinary mismatch (R10.1 attributes a failure whose rows' tails
// reach a case's binding; these records have none).
test('nested fields unify through the shared field', () => {
  const result = '{ n: { m: Int }, ...a, ...b }';
  const clauses = ', a lacks { n }';
  const call = 'h(pickR(y, { n: w, ...x }))';
  checkedPoly(lambda(result, `${call}; let s = w.m + 1`, clauses));
  const clash = lambda(result, `${call}; let s = same(w, { m: true })`,
    clauses);
  assert.equal(checkRejectedAt(clash, 'E_TYPE', '{ m: true }').message,
    'Expected { m: Int }, found { m: Bool }');
});
