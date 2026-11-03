import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { shapeChecks } from './r0-t2-shapes-checks.mjs';

// Final review A-M1, A-M2: a recorded data type meets a live one only
// with one owner and as many arguments and rows; an annotation is read
// only at a `Lambda/params/j` path. Fixture-level.
const checks = await shapeChecks(load);

test('the effect matcher pairs data of one owner and equal lengths', () => {
  assert.deepEqual(checks.effectDataWrong(), []);
});

test('the mark matcher pairs data of one owner and equal lengths', () => {
  assert.deepEqual(checks.markDataWrong(), []);
});

test('an annotation is read only at its Lambda/params/j path', () => {
  assert.deepEqual(checks.annotationWrong(), []);
});
