// Absolute time bounds moved out of functional.test.mjs. They run only under
// `npm run perf` (scripts/perf.mjs); the routine half is
// functional-timing.serial.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TData } from '../output/Domain.Type/index.js';
import { functional } from '../output/Features.Check.Functional/index.js';
import { int, fun, ctor, holds } from './functional-support.mjs';

// TypeId and VarId are newtypes, so plain numbers at run time.
const applied = (id, ...args) => TData.create(id)(args)([]);

const chainLength = 50000;
const chainBoundMs = 5000;

test('a 50,000-type chain settles without stack failure', () => {
  // Type i holds type i + 1; only the last holds an arrow.
  const chain = Array.from({ length: chainLength }, (_, index) =>
    ctor(index, [index + 1 < chainLength
      ? applied(index + 1) : fun(int, int)]));
  const started = performance.now();
  const found = functional(chain);
  const elapsed = performance.now() - started;
  assert.equal(holds(found, 0), true);
  assert.equal(holds(found, chainLength - 1), true);
  assert.ok(elapsed < chainBoundMs, `${elapsed} ms`);
});
