import test from 'node:test';
import { rejectedAt } from './support.mjs';
import assert from 'node:assert/strict';

// R015: a row parameter written as a type reported E_INTERNAL; it is the
// sort error a signature gives for the same mistake.
const main = ' fn main(): Int = 0;';

const sortError = (source, text, nth = 0) => {
  const diagnostic = rejectedAt(source, 'E_TYPE', text, nth);
  assert.equal(diagnostic.message, 'Expected a type, found an effect row');
};

test('an effect row parameter is not a type', () => {
  sortError(`type T(...e) = T(e);${main}`, 'e', 2);
  sortError(`type T(...e) = T((Int) -> Int with ...e, e);${main}`, 'e', 3);
  sortError(`type T(...e) = T(e) | U((Int) -> Int with ...e);${main}`,
    'e', 2);
});

test('a record row parameter is not a type', () => {
  sortError(`type T(...r) = T({ a: Int, ...r }, r);${main}`, 'r', 2);
  sortError(`type H(...r) = H({ a: Int, ...r }); type T(...r) = `
    + `T(H(...r), r);${main}`, 'r', 4);
});
