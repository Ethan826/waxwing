import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { wrongWalkCases, wrongWidthCases, walkCases, widthCases }
  from './r0-t2-walk-cases.mjs';

test('nodeAt: paths, boundaries and the over-applied alias', async () => {
  assert.deepEqual(await wrongWalkCases(load), []);
  assert.equal((await walkCases(load)).cases.length, 17);
});

test('nodeAt reads one sibling, whatever the width', async () => {
  assert.deepEqual(await wrongWidthCases(load), []);
  assert.equal(widthCases(await walkCases(load)).length, 14);
});
