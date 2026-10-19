// R005 Tranche B Task 2: a record row with several tails reached the
// checker's placeholder, never a plain mismatch; since Task 4 the
// one-tail rules decide it where a side has at most one meta. Since B3
// every row the checker makes has at most one unknown tail (desugared
// into `Merge` predicates where it is made), so a row of two unknown
// tails reaching the unifier is a checker defect, the invariant guard's
// `Unexpected` (a `Stop Internal`). These rows are built directly
// through the compiled modules, bypassing the desugaring, so they reach
// the guard.
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
const guard = 'a record row holds two unknown tails';

const result = (left, right) => unify(empty)(left)(right);

// Task 4 removed Task 2's placeholder; B3 turned Task 4's (P1) into the
// invariant guard.
test('two tails made without desugaring against labels: the guard',
  () => {
    const found = result(record(['a'], [1, 2]), record(['a', 'b'], []));
    assert.equal(found.constructor.name, 'Left');
    assert.equal(found.value0.constructor.name, 'Unexpected');
    assert.equal(found.value0.value0, guard);
  });

test('two tails against one meta: the lone meta takes both', () => {
  const found = result(record([], [3]), record(['b'], [1, 2]));
  assert.equal(found.constructor.name, 'Right');
});

// Before B2 the sum rule emptied the meta; such a row is now the guard's.
test('a repeated tail made without desugaring: the guard', () => {
  const found = result(record([], [1, 1]), record([], []));
  assert.equal(found.constructor.name, 'Left');
  assert.equal(found.value0.value0, guard);
});

test('one tail on each side is still checked as before', () => {
  const found = result(record(['a'], [1]), record(['a'], [2]));
  assert.equal(found.constructor.name, 'Right');
});
