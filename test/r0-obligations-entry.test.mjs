import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { shape } from './regression-r0-amin-support.mjs';

// §18.124 ruling 2 (statements §4 E8 amendment): where `main`'s declared
// row has an open top-level tail, generation records one minted flexible
// effect variable in its place, shared by the body's ambient row (E11,
// recorded at the body's root) and `Entry`. Written labels are kept and
// a closed row stays closed. The recorded signature keeps its rigid
// variable, and so does every other signature variable.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

const effectsOf = (source, name = 'main') => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  return Recorded.fields(Elaborating.problem(
    Generate.generate(tables)(signatures)(decl).value0)).effects;
};
const root = { root: { InBody: [] }, steps: [] };
const rootRow = effects => Maps.toUnfoldable(Unfoldable.unfoldableArray)(
  effects.ambient).map(pair => [shape(pair.value0), shape(pair.value1)])
  .find(([path]) => JSON.stringify(path) === JSON.stringify(root))[1];
const entryRow = effects => shape(effects.obligations.find(item =>
  item.value.constructor.name === 'Entry').value).Entry[0];
const tailOf = row => row.tail.Just?.[0];
// Carried by the result root, where Entry is recorded (not the body
// root, whose node would mint it a second time).
const flexible = { EffFresh: [{ root: { InResult: [] }, steps: [] },
  { EntryTail: [] }] };

test('an open tail becomes one flexible variable, shared', () => {
  for (const source of ['fn main(): Unit = ();',
    'fn main(): Unit with Console = Console.print(1);']) {
    const effects = effectsOf(source);
    const signature = shape(effects.signature).row;
    assert.ok(tailOf(signature).EffRigid, 'the signature keeps its tail');
    assert.deepEqual(tailOf(rootRow(effects)), flexible);
    assert.deepEqual(tailOf(entryRow(effects)), flexible);
    assert.deepEqual(rootRow(effects).labels, signature.labels);
    assert.deepEqual(entryRow(effects).labels, signature.labels);
    const minted = effects.flexEff.map(item => JSON.stringify(shape(item)));
    assert.equal(minted.filter(item => item ===
      JSON.stringify(flexible)).length, 1, 'minted exactly once');
  }
});

test('a closed row stays closed; other functions are unchanged', () => {
  const closed = effectsOf('fn main(): Unit with pure = ();');
  assert.equal(tailOf(shape(closed.signature).row), undefined);
  assert.equal(tailOf(rootRow(closed)), undefined);
  assert.equal(tailOf(entryRow(closed)), undefined);
  const other = effectsOf('fn f(): Unit = (); fn main(): Unit = ();', 'f');
  assert.deepEqual(rootRow(other), shape(other.signature).row);
});
