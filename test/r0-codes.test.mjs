import test from 'node:test';
import assert from 'node:assert/strict';
import { Unresolved } from '../output/Domain.Syntax/index.js';
import { codeName } from '../output/Format.Diagnostic.Code/index.js';

// Task 1.3: the wire string of the Unresolved code. Nothing renders it in
// this tranche; this asserts the name only, not that any Problem maps to it.
test('Unresolved has the wire name E_UNRESOLVED', () => {
  assert.equal(codeName(Unresolved.value), 'E_UNRESOLVED');
});
