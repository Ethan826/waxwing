// Domain.Arithmetic, the node shape shared by every tree for Int
// arithmetic (D001 plan, Task 1): its operands come left then right,
// which is evaluation order, both from `operands` and from the derived
// Foldable instance the tree walks use.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Binary, Plus, foldableArithmetic, operands
} from '../output/Domain.Arithmetic/index.js';

const sum = Binary.create(Plus.value)('l')('r');
const prepend = item => found => [item, ...found];

test('operands are left then right', () => {
  assert.deepEqual(operands(sum), ['l', 'r']);
  assert.deepEqual(foldableArithmetic.foldr(prepend)([])(sum), ['l', 'r']);
});
