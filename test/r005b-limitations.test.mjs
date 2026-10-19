import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly, checkRejectedAt } from './phases.mjs';

// R005 Tranche B B3 follow-up: limitations of the adopted design, pinned
// as behavioural controls (docs/plans/2026-10-19-row-merge-limitations.md,
// for the user's decision; research/purs-given-1g records what purs
// 0.15.16 does with the same shapes). A wanted `Merge L ?v T` whose left
// part and result hold no unknown (only the signature's rigid tails) is
// solved by no case: case 2 and its mirror need the result closed, which
// a rigid tail is not. purs solves the same wanted from the signature's
// given `Union` (dependency union left -> right); Waxwing waits (P5 until
// B4, then Unresolved). Where the unknown part is a lambda's parameter an
// annotation repairs it; where it is a call's own instantiation (a
// self-call, a forwarding wrapper, O4) nothing written at the call can.
const P5 = 'R005B placeholder: merge predicates still waiting at the end of '
  + 'a body are classified in Task B4';
const main = ' fn main(): Int = 0;';
const pickR = 'fn pickR(p: { ...r }, q: { ...s }): { ...r, ...s } '
  + 'where r disjoint s = pickR(p, q); ';
const both = 'fn both(x: { ...u }, k: ({ ...u }) -> { ...u, ...v }): '
  + '{ ...u, ...v } where u disjoint v = k(x); ';
const waits = (source, text, nth = 0) => assert.equal(
  checkRejectedAt(source, 'E_INTERNAL', text, nth).message, P5);

test('a recursive self-call whose result names a free variable waits', () => {
  waits(`fn both(x: { ...u }): { ...u, ...v } = both(x);${main}`, 'both(x)');
});

test('a nonrecursive forwarding wrapper waits; its callee alone is fine',
  () => {
    checkedPoly(`${both}${main}`);
    waits(`${both}fn fwd(x: { ...a }, k: ({ ...a }) -> { ...a, ...b }): `
      + `{ ...a, ...b } where a disjoint b = both(x, k);${main}`,
    'both(x, k)');
  });

test('through a lambda it waits, and annotating the lambda repairs it', () => {
  const fwd = parameter => `${pickR}fn fwd(x: { ...a }, h: `
    + '({ ...a, ...b }) -> Int): Int where a disjoint b = '
    + `{ let f = fn(${parameter}) => h(pickR(x, y)); 0 };${main}`;
  waits(fwd('y'), 'pickR(x, y)');
  checkedPoly(fwd('y: { ...b }'));
});

test('control: both parts given, the wrapper is solved (1g)', () => {
  checkedPoly(`${pickR}fn fwd(x: { ...a }, y: { ...b }): { ...a, ...b } `
    + `where a disjoint b = pickR(x, y);${main}`);
});

test('O4: a split only a lacks clause decides waits at the call', () => {
  waits('fn granted2(p: { ...r, ...s }): Bool where s lacks { admin } = '
    + 'true; fn main(): Int = { let b = granted2({ admin: false }); 0 };',
  'granted2({ admin: false })');
});
