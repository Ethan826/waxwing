import test from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../output/Features.Check/index.js';
import { Left } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { checkedPoly, resolved } from './phases.mjs';

// R005 Tranche B Task 5, the older paths that add a lack or a pair
// outside the row rules (the user's review of Task 4, 2026-10-18): once
// equations wait, a lack a record extension adds to a spread's tail
// (Check/Extension), the lacks of a fresh record (Check/FreshRecord, field
// access) and the facts a use seeds (Check/Seed through Check/UseFacts)
// must prune the bound (U2, U4) and wake the equations that read them.
// Each program is checked in both orders, the equation first and the
// older path first, and must reach the same verdict (C2).
const outcomeOf = source => {
  const result = check(resolved(source));
  return result instanceof Left ? wire(result.value0).code : 'accepted';
};
const bothOrders = (first, second) => {
  const found = [outcomeOf(first), outcomeOf(second)];
  assert.equal(found[0], found[1], JSON.stringify(found));
  return found[0];
};

// Check/Extension: `{ ...p, x: 1, y: 2 }` makes p's tail lack x and y.
const extended = 'fn(p) => { let e = { ...p, x: 1, y: 2 }; 0 }';

test('an extension\'s lacks prune and wake: accepted in both orders', () => {
  assert.equal(bothOrders(
    'fn two(f: ({ ...r }) -> Int, w: { ...r, ...s }): Int = 0; '
      + `fn main(): Int = two(${extended}, { x: 1, y: 2 });`,
    'fn two(w: { ...r, ...s }, f: ({ ...r }) -> Int): Int = 0; '
      + `fn main(): Int = two({ x: 1, y: 2 }, ${extended});`), 'accepted');
});

test('extensions lacking a label in both parts: refused in both orders',
  () => {
    const lambdas = `${extended}, ${extended}`;
    assert.notEqual(bothOrders(
      'fn three(f: ({ ...r }) -> Int, g: ({ ...s }) -> Int, '
        + 'w: { ...r, ...s }): Int = 0; '
        + `fn main(): Int = three(${lambdas}, { x: 1, y: 2 });`,
      'fn three(w: { ...r, ...s }, f: ({ ...r }) -> Int, '
        + 'g: ({ ...s }) -> Int): Int = 0; '
        + `fn main(): Int = three({ x: 1, y: 2 }, ${lambdas});`), 'accepted');
  });

// Check/FreshRecord through field access: `p.x` gives p's row the label.
test('a field access binds a part: the same verdict in both orders', () => {
  const clause = ' where s lacks { y }';
  assert.equal(bothOrders(
    `fn get(f: ({ ...r }) -> Int, w: { ...r, ...s }): Int${clause} = 0; `
      + 'fn main(): Int = get(fn(p) => p.x, { x: 1, y: 2 });',
    `fn get(w: { ...r, ...s }, f: ({ ...r }) -> Int): Int${clause} = 0; `
      + 'fn main(): Int = get({ x: 1, y: 2 }, fn(p) => p.x);'), 'accepted');
});

// Check/Seed and Check/UseFacts: a callee's clauses seed its use's fresh
// metas, whose binding passes the lacks to the parts that wait.
const g = 'fn g(a: { ...u }, b: { ...v }): Int '
  + 'where u disjoint v, v lacks { x, y } = 0; ';

test('a use\'s seeded facts reach a waiting equation in both orders', () => {
  assert.equal(bothOrders(
    `${g}fn three(w: { ...r, ...s }, f: ({ ...r }, { ...s }) -> Int): Int `
      + '= 0; fn main(): Int = three({ x: 1, y: 2 }, fn(p, q) => g(p, q));',
    `${g}fn three(f: ({ ...r }, { ...s }) -> Int, w: { ...r, ...s }): Int `
      + '= 0; fn main(): Int = three(fn(p, q) => g(p, q), { x: 1, y: 2 });'),
  'accepted');
  checkedPoly(`${g}fn main(): Int = 0;`);
});
