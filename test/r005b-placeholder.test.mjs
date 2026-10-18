// R005 Tranche B Task 2: a record row with several tails reached the
// checker's placeholder, never a plain mismatch; since Task 4 it is
// solved by forced moves, and what would wait reaches Task 5's. The rows
// are built directly through the compiled modules.
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
const waits = 'equations that wait are solved in Task 5';

const result = (left, right) => unify(empty)(left)(right);

// Task 4 removed Task 2's placeholder (`rows with several tails are
// checked in Task 4`): such rows unify by forced moves, and only an
// equation that would wait reaches Task 5's placeholder.
test('two tails against labels with two homes reach Task 5\'s placeholder',
  () => {
    const found = result(record(['a'], [1, 2]), record(['a', 'b'], []));
    assert.equal(found.constructor.name, 'Left');
    assert.equal(found.value0.constructor.name, 'Placeholder');
    assert.equal(found.value0.value0, waits);
  });

test('two tails against one meta: the lone meta takes both', () => {
  const found = result(record([], [3]), record(['b'], [1, 2]));
  assert.equal(found.constructor.name, 'Right');
});

test('a repeated tail against the empty row: the meta is empty', () => {
  const found = result(record([], [1, 1]), record([], []));
  assert.equal(found.constructor.name, 'Right');
});

test('one tail on each side is still checked as before', () => {
  const found = result(record(['a'], [1]), record(['a'], [2]));
  assert.equal(found.constructor.name, 'Right');
});
