import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly, checkRejectedAt } from './phases.mjs';

// R005 Tranche B B3 follow-up: limitations of the adopted design, pinned
// as behavioural controls (docs/plans/2026-10-19-row-merge-limitations.md;
// research/purs-given-1g records what purs 0.15.16 does with the same
// shapes). A wanted `Merge L ?v T` whose left part and result hold no
// unknown (only the signature's rigid tails) waited at B3: case 2 and its
// mirror needed the result closed. purs solves it from the signature's
// given `Union`; Waxwing since 2g (user, 2026-10-19, plan §10 decision
// 17) solves it by cancelling the rigid tails, a different rule that
// agrees on these probes. O4 is kept as an accepted limitation: nothing
// written at the call names its row arguments, and only the `lacks`
// clause decides the split.
const P5 = 'R005B placeholder: merge predicates still waiting at the end of '
  + 'a body are classified in Task B4';
const main = ' fn main(): Int = 0;';
const pickR = 'fn pickR(p: { ...r }, q: { ...s }): { ...r, ...s } '
  + 'where r disjoint s = pickR(p, q); ';
const both = 'fn both(x: { ...u }, k: ({ ...u }) -> { ...u, ...v }): '
  + '{ ...u, ...v } where u disjoint v = k(x); ';
const waits = (source, text, nth = 0) => assert.equal(
  checkRejectedAt(source, 'E_INTERNAL', text, nth).message, P5);

test('a recursive self-call whose result names a free variable (2g)', () => {
  checkedPoly(`fn both(x: { ...u }): { ...u, ...v } = both(x);${main}`);
});

test('a nonrecursive forwarding wrapper and its callee (2g)', () => {
  checkedPoly(`${both}${main}`);
  checkedPoly(`${both}fn fwd(x: { ...a }, k: ({ ...a }) -> { ...a, ...b }): `
    + `{ ...a, ...b } where a disjoint b = both(x, k);${main}`);
});

test('through a lambda, with or without its annotation (2g)', () => {
  const fwd = parameter => `${pickR}fn fwd(x: { ...a }, h: `
    + '({ ...a, ...b }) -> Int): Int where a disjoint b = '
    + `{ let f = fn(${parameter}) => h(pickR(x, y)); 0 };${main}`;
  checkedPoly(fwd('y'));
  checkedPoly(fwd('y: { ...b }'));
});

test('control: both parts given, the wrapper is solved (1g)', () => {
  checkedPoly(`${pickR}fn fwd(x: { ...a }, y: { ...b }): { ...a, ...b } `
    + `where a disjoint b = pickR(x, y);${main}`);
});

test('O4, kept: a split only a lacks clause decides waits at the call', () => {
  waits('fn granted2(p: { ...r, ...s }): Bool where s lacks { admin } = '
    + 'true; fn main(): Int = { let b = granted2({ admin: false }); 0 };',
  'granted2({ admin: false })');
});
