// R005 Tranche B Task 2: a record row with several tails reaches the
// checker's placeholder, never a plain mismatch. The rows are built
// directly through the compiled modules, since no source can write two
// tails before the parser learns to (the same commit order as Task 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const { ordInt } = await load('Data.Ord');
const { Tuple } = await load('Data.Tuple');
const { TInt, TRecord } = await load('Domain.Type.Core');
const { recordRow } = await load('Domain.Type.Record');
const { Meta, empty } = await load('Features.Check.Subst');
const { unify } = await load('Features.Check.Unify');

const field = label => Tuple.create(label)(TInt.value);
const record = (labels, tails) => TRecord.create(
  recordRow(ordInt)(labels.map(field))(tails.map(number => new Meta(number))));
const wording = 'rows with several tails are checked in Task 4';

const refusal = (left, right) => {
  const result = unify(empty)(left)(right);
  assert.equal(result.constructor.name, 'Left');
  return result.value0;
};

test('two tails on the left reach the placeholder', () => {
  const failure = refusal(record(['a'], [1, 2]), record(['a'], [3]));
  assert.equal(failure.constructor.name, 'Placeholder');
  assert.equal(failure.value0, wording);
});

test('two tails on the right reach the placeholder', () => {
  const failure = refusal(record([], [3]), record(['b'], [1, 2]));
  assert.equal(failure.constructor.name, 'Placeholder');
  assert.equal(failure.value0, wording);
});

test('a repeated tail is several tails too', () => {
  const failure = refusal(record([], [1, 1]), record([], []));
  assert.equal(failure.constructor.name, 'Placeholder');
});

test('one tail on each side is still checked as before', () => {
  const result = unify(empty)(record(['a'], [1]))(record(['a'], [2]));
  assert.equal(result.constructor.name, 'Right');
});
