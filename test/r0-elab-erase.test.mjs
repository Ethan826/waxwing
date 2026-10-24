import test from 'node:test';
import assert from 'node:assert/strict';
import { erasedType } from './r0-elab-erase.mjs';

// BACKLOG R027 (c): the effect-erased projection fails closed. A type
// constructor it does not know is an error, never `undefined`, which
// would compare equal to any other unknown constructor and hide a
// difference from T2 and T8.
class TInt {}
class TFloat {}
class TFun { constructor(...values) { values.forEach((value, index) => {
  this[`value${index}`] = value; }); } }

test('a known base type erases to its name', () => {
  assert.equal(erasedType(new TInt()), 'Int');
  assert.deepEqual(erasedType(new TFun(new TInt(), null, new TInt())),
    { fun: ['Int', 'Int'] });
});

test('an unknown type constructor is an error, also nested', () => {
  assert.throws(() => erasedType(new TFloat()), /unknown type .*TFloat/);
  assert.throws(() => erasedType(new TFun(new TInt(), null, new TFloat())),
    /unknown type .*TFloat/);
});
