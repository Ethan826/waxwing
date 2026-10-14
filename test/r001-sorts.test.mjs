import test from 'node:test';
import assert from 'node:assert/strict';
import { resolved, resolveRejectedAt } from './phases.mjs';
import { spanAt } from './support.mjs';

// R001 Task 3: row sorts settle in both directions until neither adds a
// sort, so a sort that a caller gives a callee travels back up to the
// callee's other callers, and the result does not depend on the order of
// the declarations.
const main = ' fn main(): Int = 0;';
const siblings = 'type C1(...a) = C1({ x: Int, ...a }, P(...a)); '
  + 'type C2(...b) = C2(P(...b)); type P(...p) = P(Int); ';

const sortsOf = (source, index) => resolved(source).types[index].sorts
  .map(sort => sort.constructor.name);

test('a callee sort given by one caller reaches the other caller', () => {
  assert.deepEqual(sortsOf(`${siblings}${main}`, 1), ['RecordSort']);
  assert.deepEqual(sortsOf(`${siblings}${main}`, 2), ['RecordSort']);
});

test('so using that caller as an effect row is the sort error', () => {
  const source = `${siblings}fn f(x: C2(...e)): Unit with ...e = ();${main}`;
  const diagnostic = resolveRejectedAt(source, 'E_TYPE', 'with ...e');
  assert.equal(diagnostic.message, 'e is a record row, not an effect row');
  assert.deepEqual(diagnostic.related, [{ span: spanAt(source, '...e'),
    message: 'first written here' }]);
});

test('and using it as a record row is accepted', () => {
  resolved(`${siblings}fn f(x: C2(...e), y: { z: Int, ...e }): Int = 1;`
    + main);
});

// B's own uses disagree; A only passes its effect row on to B.
const declarations = [
  'type X(...p) = X({ a: Int, ...p }); ',
  'type A(...t) = A((Unit) -> Unit with ...t, B(...t)); ',
  'type B(...s) = B(X(...s), (Unit) -> Unit with ...s); '
];
const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1],
  [2, 1, 0]];

for (const order of orders) {
  test(`declaration order ${order.join('')} gives one diagnostic`, () => {
    const source = order.map(index => declarations[index]).join('') + main;
    const diagnostic = resolveRejectedAt(source, 'E_TYPE', 'with ...s');
    assert.equal(diagnostic.message, 's is a record row, not an effect row');
    assert.deepEqual(diagnostic.related, [{ span: spanAt(source, '...s', 1),
      message: 'first written here' }]);
  });
}
