// BACKLOG R026: the online strategy's check must judge exactly what the
// witness is built from: since the minting switch (dossier §18.172), the
// effect package. The forged-`id2` probe (type bindings forged to `Bool`)
// must be refused by the check, not Solved; legitimate witnesses,
// a defaulted hole's included, are still Solved and elaborate, and the
// hole stays a `Free` binding the hole contract judges.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { forgedFrom, id2Source, unusedShow }
  from './r0-forged-witness-support.mjs';

const { outcomeOf, toBool, toFunction, toHole, unsettledToBool, named } =
  await forgedFrom(load);
const tyName = ty => named(ty);
const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
// Each binding's kind, `Inline` or `Free`, in variable order.
const kinds = compilation => Map.toUnfoldable(unfoldableArray)(
  compilation.value0.bindings).map(pair => named(pair.value1));
// Each `Inline` binding's image, as the witness carries it.
const images = compilation => Map.toUnfoldable(unfoldableArray)(
  compilation.value0.bindings).map(pair => pair.value1)
  .filter(binding => named(binding) === 'Inline')
  .map(binding => `${named(binding.value0)} ${named(binding.value0.value0)}`);

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
  assert.deepEqual(images(found.compilation), ['Base BoolBase']);
  assert.equal(named(found.elaborated), 'Elaborated');
});

// Only the package is evidence: the field the old check read, forged
// alone, changes nothing about the verdict or the witness.
test('the separate pre-default field is not evidence', () => {
  const forged = outcomeOf(id2Source, 'id2', unsettledToBool);
  const honest = outcomeOf(id2Source, 'id2');
  assert.equal(forged.verdict, 'Solved');
  assert.deepEqual(images(forged.compilation), images(honest.compilation));
  assert.equal(tyName(forged.elaborated.value0.result), 'TInt');
});

test('a hole forged to a function type is refused by the check', () => {
  const found = outcomeOf(unusedShow, 'f', toFunction);
  assert.notEqual(found.verdict, 'Solved');
  assert.deepEqual(found.attempts, ['CheckFailed']);
});

// Review of the repairs (P3-8): every binding forged to one hole. The
// check judges the defaults and accepts, but the hole contract refuses
// to leave the hole, so the Solved verdict carries no witness and
// nothing elaborates: a wrong search costs a compilation, never
// soundness (holes stay `Free` for the contract, option A).
test('id2 forged to one hole is Solved without a witness, not built', () => {
  const found = outcomeOf(id2Source, 'id2', toHole);
  assert.equal(named(found.compilation), 'NoWitness');
  assert.equal(named(found.compilation.value0), 'HoleContract');
  assert.equal(named(found.elaborated), 'NotCompiled');
});
