import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { Just } from '../output/Data.Maybe/index.js';
import { Tuple } from '../output/Data.Tuple/index.js';
import { TInt, TRecord } from '../output/Domain.Type/index.js';
import * as unifier from '../output/Features.Check.Unify/index.js';
import * as rows from '../output/Features.Check.UnifyRow/index.js';
import { atSite } from '../output/Features.Check.RowStore/index.js';
import * as entry from '../output/Features.Check.RowEntry/index.js';
import { onStore } from '../output/Features.Check.Subst/index.js';
import { FailEffect, Label, Plain, Row, UserEffect, normalMark }
  from '../output/Domain.Row/index.js';
import { toTy } from './unify-support.mjs';
import { checkRejectedAt, checkedPoly } from './phases.mjs';
import { unresolved } from './r005b-support.mjs';

// R005 Tranche B Task 5, the end of a body with postponed effect pairs
// (design §6; rules §12; ledger L18, L19; review F7). The row store lives
// in the substitution, so a postponed pair that reverts it reverts the
// pending equations, the facts, the wake-up index and the metadata made
// inside it, together, and its retry defers them again with the pair's
// site. The settle rounds and the drain alternate until neither moves.

const span = (start, end) => ({ start: { offset: start, line: 1,
  column: start + 1 }, end: { offset: end, line: 1, column: end + 1 } });
const record = (labels, tails) => TRecord.create({
  fields: labels.map(label => Tuple.create(label)(TInt.value)),
  tails: tails.map(n => new unifier.Meta(n)) });
const labelOf = (effect, args) =>
  Label.create(effect)(args)(normalMark(effect)(Plain.value));
const meta = n => toTy({ k: 'meta', n });

// A pair whose first label's argument makes a record equation wait, and
// whose Fail label (key still deferred) postpones it all.
const left = () => Row.create([
  labelOf(UserEffect.create(1), [record([], [20, 21])]),
  labelOf(FailEffect.value, [meta(0)])])(new Just(new unifier.Meta(10)));
const right = () => Row.create([
  labelOf(UserEffect.create(1), [record(['x', 'y'], [])])])(
  new Just(new unifier.Meta(11)));

test('a postponed pair reverts the whole store, pending equations too', () => {
  const site = span(3, 9);
  const start = onStore(atSite(new Just(site)))(unifier.empty);
  const result = rows.unifyRows(unifier.unify)(start)(left())(right());
  assert.ok(result instanceof Right, result.value0?.constructor.name);
  const reverted = result.value0;
  assert.equal(reverted.postponed.length, 1);
  assert.deepEqual(reverted.store, start.store);
  assert.deepEqual(reverted.postponed[0].site, new Just(site));
});

test('the retry defers the equation again, with the pair\'s site', () => {
  const site = span(3, 9);
  const start = onStore(atSite(new Just(site)))(unifier.empty);
  const postponed = rows.unifyRows(unifier.unify)(start)(left())(right())
    .value0;
  const keyed = unifier.unify(onStore(atSite(Just.create(span(20, 25))))(
    postponed))(meta(0))(TInt.value);
  assert.ok(keyed instanceof Right);
  const settled = unifier.settleRows(keyed.value0);
  assert.ok(settled instanceof Right, settled.value0?.constructor.name);
  assert.equal(settled.value0.postponed.length, 0);
  const waiting = entry.pending(settled.value0);
  assert.equal(waiting.length, 1);
  assert.deepEqual(waiting[0].site, new Just(site));
});

const pick = 'fn pick(w: { ...r, ...s }): { ...r, ...s } = w; ';

test('a Fail payload whose key waits reports the unresolved equation', () => {
  const source = `${pick}fn main(): Int = handle { Fail.fail(pick({ x: 1, `
    + 'y: 2 })) } { fail(e: { x: Int, y: Int }) => 0 };';
  const found = checkRejectedAt(source, 'E_INTERNAL', '{ x: 1, y: 2 }');
  assert.equal(found.message, unresolved);
});

// Joint fixpoint, both directions (row r005b-end-fixpoint). An effect
// retry gives `?r` its labels through a Fail payload's field once the
// payload's key is known; the round's drain then solves the equation that
// waited on `?r`. And a drain binds the meta a postponed pair's key
// waits on, so a later round settles that pair.
const pair = 'fn pair(p: { ...r, ...s }, f: ({ ...r }) -> Int): Int = 0; ';

test('a body whose effect retry unblocks a record equation is accepted',
  () => {
    checkedPoly(`${pair}fn main(): Int = handle { let g = fn(e) => `
      + 'Fail.fail(e); pair({ x: 1, y: 2 }, fn(q) => g({ code: 1, w: q })) } '
      + '{ fail(e: { code: Int, w: { x: Int } }) => 0 };');
  });

test('a drain that binds a postponed pair\'s key settles that pair', () => {
  checkedPoly(`${pair}fn main(): Int = handle { let g = fn(e) => `
    + 'Fail.fail(e); let h = fn(e) => Fail.fail(e); '
    + 'pair({ x: 1, y: 2 }, fn(q) => g({ code: 1, w: q })) '
    + '+ pair({ a: 1 }, fn(q) => h({ tag: 1, ...q })) } '
    + '{ fail(e: { code: Int, w: { x: Int } }) => 0, '
    + 'fail(e: { a: Int, tag: Int }) => 1 };');
});
