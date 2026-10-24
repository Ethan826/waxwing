// BACKLOG R026: the online strategy's check must judge exactly what the
// witness is built from. The forged-`id2` probe (bindings forged to
// `Bool`) must be refused by the check, not Solved; legitimate witnesses,
// a defaulted hole's included, are still Solved and elaborate, and the
// hole stays a `Free` binding the hole contract judges.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { forgedFrom, id2Source, unusedShow }
  from './r0-forged-witness-support.mjs';

const { outcomeOf, toBool, toFunction, named } = await forgedFrom(load);
const tyName = ty => named(ty);
const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
// Each binding's kind, `Inline` or `Free`, in variable order.
const kinds = compilation => Map.toUnfoldable(unfoldableArray)(
  compilation.value0.bindings).map(pair => named(pair.value1));

test('id2 forged to Bool is refused by the check, not Solved', () => {
  const found = outcomeOf(id2Source, 'id2', toBool);
  assert.notEqual(found.verdict, 'Solved');
  assert.deepEqual(found.attempts, ['CheckFailed']);
  assert.equal(found.elaborated, undefined);
});

test('id2 as searched is Solved and elaborates at Int', () => {
  const found = outcomeOf(id2Source, 'id2');
  assert.equal(found.verdict, 'Solved');
  assert.equal(named(found.compilation), 'Witnessed');
  assert.equal(named(found.elaborated), 'Elaborated');
  const decl = found.elaborated.value0;
  assert.equal(tyName(decl.result), 'TInt');
  assert.equal(tyName(decl.body.value0.ty), 'TInt');
});

test('a defaulted hole is Solved, stays Free, and elaborates', () => {
  const found = outcomeOf(unusedShow, 'f');
  assert.equal(found.verdict, 'Solved');
  assert.equal(named(found.compilation), 'Witnessed');
  assert.ok(kinds(found.compilation).includes('Free'),
    kinds(found.compilation).join(', '));
  assert.equal(named(found.elaborated), 'Elaborated');
});

// `show`'s instance is the only flexible variable of `f`, and `Bool` is
// a valid answer for it: the check accepts, and the witness is what it
// judged, `Inline Bool`, not the searched hole's `Free`.
test('a hole forged to a valid type is witnessed as checked', () => {
  const found = outcomeOf(unusedShow, 'f', toBool);
  assert.equal(found.verdict, 'Solved');
  assert.deepEqual(kinds(found.compilation), ['Inline']);
  assert.equal(named(found.elaborated), 'Elaborated');
});

test('a hole forged to a function type is refused by the check', () => {
  const found = outcomeOf(unusedShow, 'f', toFunction);
  assert.notEqual(found.verdict, 'Solved');
  assert.deepEqual(found.attempts, ['CheckFailed']);
});
