import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// R005 Tranche B B3 follow-up (the user's review, 2026-10-19): rollback at
// the transaction boundary of an effect row pair. A pair whose `Fail`
// label has no family key yet is postponed, and the substitution reverts
// to the one the pair started from (Features.Check.RowFinish `postponed`).
// Predicates live in that substitution, so the revert must take back what
// re-examination did inside the attempt. The state is built directly: a
// waiting `Merge m1 m2 t`, then a pair unified with the re-examining
// unifier (as a settling retry does, Features.Check.Unify `settleRows`)
// whose first label's payload binds m1 to `{}` (solving the predicate by
// case 1, recording its cause) and whose second label's family is
// unknown. Bindings, waiting predicates, identities, causes and lineage
// history must be the starting state's, with only the pair added.
const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const entry = await load('Features.Check.RowEntry');
const { unify, settleRows } = await load('Features.Check.Unify');
const { unifyRows } = await load('Features.Check.UnifyRow');
const { Meta } = await load('Features.Check.Subst');
const { Row, Label, FailEffect, Plain } = await load('Domain.Row');
const loaded = await load('Domain.Type.Core');
const { TRecord, TVar } = loaded;
const { Tuple } = await load('Data.Tuple');
const { Nothing } = await load('Data.Maybe');

const record = (fields, tails = []) => TRecord.create(
  { fields: fields.map(([l, ty]) => Tuple.create(l)(ty)), tails });
const fail = payload => new Label(FailEffect.value, [payload], Plain.value);
const row = labels => new Row(labels, Nothing.value);

// `Merge m1 m2 t` waiting, t unified with m3.
const waiting = () => {
  const made = entry.equate(entry.hypotheses([])([]))(
    entry.row([])([new Meta(1), new Meta(2)]))(entry.row([])([new Meta(3)]));
  assert.equal(made.constructor.name, 'Right');
  assert.equal(entry.merges(made.value0).length, 1);
  return made.value0;
};
// The payload { a: { ...m1 } }: its family is known ({ a }), and
// unifying it with { a: {} } binds m1 to {}.
const known = fail(record([['a', record([], [new Meta(1)])]]));
const fixed = fail(record([['a', record([])]]));
const unknown = fail(TVar.create(new Meta(9)));

// What a revert must restore, read out through the entry.
const snapshot = subst => ({
  bindings: entry.bindings(subst),
  merges: entry.merges(subst),
  next: entry.nextPredicate(subst),
  causes: entry.causes(subst),
  lineages: entry.lineages(subst),
  facts: entry.facts(subst),
  fresh: subst.fresh,
});

test('control: the first label alone solves the predicate in the attempt',
  () => {
    const start = waiting();
    const found = unifyRows(unify)(start)(row([known]))(row([fixed]));
    assert.equal(found.constructor.name, 'Right');
    const after = snapshot(found.value0);
    assert.equal(after.merges.length, 0);
    assert.ok(after.causes.length > 0);
    assert.equal(found.value0.postponed.length, 0);
  });

test('a postponed pair reverts what re-examination did inside it', () => {
  const start = waiting();
  const found = unifyRows(unify)(start)(row([known, unknown]))(
    row([fixed, unknown]));
  assert.equal(found.constructor.name, 'Right');
  assert.deepEqual(snapshot(found.value0), snapshot(start));
  assert.equal(found.value0.postponed.length, 1);
});

test('a settling retry that postpones again restores the same state', () => {
  const start = waiting();
  const postponed = unifyRows(unify)(start)(row([known, unknown]))(
    row([fixed, unknown])).value0;
  const settled = settleRows(postponed);
  assert.equal(settled.constructor.name, 'Right');
  assert.deepEqual(snapshot(settled.value0), snapshot(start));
  assert.equal(settled.value0.postponed.length, 1);
});

// M13 (rules §5): a case's unification of field types can postpone a new
// effect pair. `Merge m1 m2 t` waits with t's row holding a field `f`
// whose function performs `Fail({ a: Int })`; then m1 is fixed to a row
// whose `f` performs `Fail` of an unknown payload. Case 1 unifies the two
// `f`s, the effect rows meet an unknown family, and the pair is
// postponed by the case; settling then stops with it still set aside.
test('a case\'s unification can postpone a pair; settling still ends', () => {
  const { TFun, TUnit, TInt } = loaded;
  const performs = payload => TFun.create(TUnit.value)(row([fail(payload)]))(
    TInt.value);
  const typed = (fields, tails) => entry.typedRow(fields.map(([k, t]) =>
    Tuple.create(k)(t)))(tails);
  const start = waiting();
  const withT = entry.equate(start)(typed([], [new Meta(3)]))(
    typed([['f', performs(record([['a', TInt.value]]))]], [new Meta(2)]));
  assert.equal(withT.constructor.name, 'Right');
  assert.equal(withT.value0.postponed.length, 0);
  assert.equal(entry.merges(withT.value0).length, 1);
  const fixed = entry.equate(withT.value0)(typed([], [new Meta(1)]))(
    typed([['f', performs(TVar.create(new Meta(9)))]], []));
  assert.equal(fixed.constructor.name, 'Right');
  assert.equal(entry.merges(fixed.value0).length, 0);
  assert.equal(fixed.value0.postponed.length, 1);
  const settled = settleRows(fixed.value0);
  assert.equal(settled.constructor.name, 'Right');
  assert.equal(settled.value0.postponed.length, 1);
});
