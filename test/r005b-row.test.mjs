// R005 Tranche B Task 1: a record row holds several tails (`tails ∷ Array
// v`, sorted, repeats kept). No producer makes two yet; every consumer
// must be total over them. Domain-level checks through the compiled
// modules; the mutant probe or a baseline build may point
// WAXWING_OUTPUT at another build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const { insert } = await load('Data.Map.Internal');
const { ordInt } = await load('Data.Ord');
const { Tuple } = await load('Data.Tuple');
const { TInt, TRecord } = await load('Domain.Type.Core');
const { recordRow, withoutLabels } = await load('Domain.Type.Record');
const { RecordName, IntName } = await load('Domain.Problem');
const { typeName } = await load('Format.Diagnostic.Name');
const { flatten } = await load('Features.Check.FlatRecord');
const { Meta, Rigid, empty } = await load('Features.Check.Subst');

const int = TInt.value;
const field = label => Tuple.create(label)(int);
const row = (labels, tails) => recordRow(ordInt)(labels.map(field))(tails);
const labelsOf = found => found.fields.map(pair => pair.value0);
const meta = number => new Meta(number);
const record = (labels, tails) => TRecord.create(row(labels, tails));
// A substitution binding each meta of `bindings` ([meta, type]) at once.
const binding = bindings => ({
  ...empty,
  types: bindings.reduce(
    (types, [number, ty]) => insert(ordInt)(number)(ty)(types), empty.types)
});

test('recordRow sorts tails and keeps repeats', () => {
  assert.deepEqual(row([], [3, 1, 2]).tails, [1, 2, 3]);
  assert.deepEqual(row([], [2, 1, 2]).tails, [1, 2, 2]);
  assert.deepEqual(row([], [5]).tails, [5]);
  assert.deepEqual(row([], []).tails, []);
});

test('recordRow still sorts the fields by label', () => {
  assert.deepEqual(labelsOf(row(['b', 'a'], [2, 1])), ['a', 'b']);
});

test('flatten follows two bound tails and ends at their tails', () => {
  const subst = binding([
    [1, record(['a'], [meta(3)])],
    [2, record(['b'], [meta(4)])]
  ]);
  const flat = flatten(subst)(row(['c'], [meta(1), meta(2)]));
  assert.deepEqual(labelsOf(flat), ['a', 'b', 'c']);
  assert.deepEqual(flat.tails, [meta(3), meta(4)]);
});

test('flatten sorts the tails it ends at and keeps a repeat', () => {
  const subst = binding([
    [1, record([], [meta(7)])],
    [2, record([], [meta(7), new Rigid(0)])]
  ]);
  const flat = flatten(subst)(row([], [meta(1), meta(2)]));
  assert.deepEqual(flat.tails, [new Rigid(0), meta(7), meta(7)]);
});

test('flatten reads a closed row as no tail', () => {
  const flat = flatten(binding([]))(row(['a'], []));
  assert.deepEqual(flat.tails, []);
  assert.deepEqual(labelsOf(flat), ['a']);
});

test('flatten walks a chain of 10,000 bound tails in constant stack', () => {
  const length = 10000;
  const links = Array.from({ length }, (_, index) =>
    [index + 1, record([], [meta(index + 2)])]);
  const subst = binding([...links, [length + 1, record(['z'], [])]]);
  const flat = flatten(subst)(row([], [meta(1)]));
  assert.deepEqual(labelsOf(flat), ['z']);
  assert.deepEqual(flat.tails, []);
});

test('flatten walks two chains of 10,000 at once', () => {
  const length = 10000;
  const chain = (start, last) => Array.from({ length }, (_, index) =>
    [start + index, record([], [meta(start + index + 1)])])
    .concat([[start + length, record([last], [])]]);
  const subst = binding([...chain(1, 'p'), ...chain(20001, 'q')]);
  const flat = flatten(subst)(row([], [meta(1), meta(20001)]));
  assert.deepEqual(labelsOf(flat), ['p', 'q']);
  assert.deepEqual(flat.tails, []);
});

test('withoutLabels keeps the tails of a row of none or one', () => {
  assert.deepEqual(withoutLabels(['a'])(row(['a', 'b'], [])),
    row(['b'], []));
  assert.deepEqual(withoutLabels(['a'])(row(['a', 'b'], [4])),
    row(['b'], [4]));
  assert.deepEqual(withoutLabels(['c'])(row(['a'], [2, 4])),
    row(['a'], [2, 4]));
});

test('a record name prints each tail, as before for none or one', () => {
  const name = (...tails) => typeName(
    RecordName.create([Tuple.create('a')(IntName.value)])(tails));
  assert.equal(name(), '{ a: Int }');
  assert.equal(name('r'), '{ a: Int, ...r }');
  assert.equal(name('r', 's'), '{ a: Int, ...r, ...s }');
  assert.equal(typeName(RecordName.create([])([])), '{}');
});
