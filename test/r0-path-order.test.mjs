import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { pathOrder, wrongPathOrder } from './r0-path-order-cases.mjs';

test('Ord Path agrees with the derived ordering, in the stated grammar',
  async () => {
    const { wrong, count } = await wrongPathOrder(load);
    assert.deepEqual(wrong, []);
    assert.equal(count, 5 * (1 + 20 + 400));
  });

// The reference itself must distinguish: a flat result would agree with
// a constant comparison.
test('the reference orders roots, step kinds and prefixes', async () => {
  const kit = await pathOrder(load);
  const [body, constraints] = kit.roots;
  const named = new kit.Origin.Named('z');
  const index = new kit.Origin.Index(-1);
  const order = (x, y) => kit.reference(x)(y).constructor.name;
  assert.equal(order(kit.path(body, [index]), kit.path(constraints, [])), 'LT');
  assert.equal(order(kit.path(body, [named]), kit.path(body, [index])), 'LT');
  assert.equal(order(kit.path(body, []), kit.path(body, [named])), 'LT');
  assert.equal(order(kit.path(body, [index]), kit.path(body, [index])), 'EQ');
});
