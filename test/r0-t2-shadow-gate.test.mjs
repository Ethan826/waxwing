import test from 'node:test';
import assert from 'node:assert/strict';
import { verdictsWrong, wrongShadowCases }
  from './r0-t2-shadow-gate-cases.mjs';

test('shadow and live decisions are measured apart', () => {
  assert.deepEqual(wrongShadowCases(), []);
});

test('a live-only gap leaves the shadow verdict met', () => {
  assert.deepEqual(verdictsWrong(), []);
});
