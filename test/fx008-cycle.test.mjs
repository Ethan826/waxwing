// FX008 Task 5: the feed graph, its settling order and the per-key cycle
// test of design §3.5 (b) and (c), on resolved rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Just } from '../output/Data.Maybe/index.js';
import * as cycle from '../output/Features.Check.Cycle/index.js';
import { feedsOf } from '../output/Features.Check.Feed/index.js';
import { label, row, rowMeta } from './row-support.mjs';
import { toRow } from './unify-support.mjs';

const [log, tick] = [0, 1];
// A restricted row: the labels it holds and its tail meta, its target's
// labels and tail meta, and its source position.
const entry = (own, ownTail, target, targetTail, position, keepFail = false) => ({
  own: toRow(row(own.map(e => label(e)), rowMeta(ownTail))),
  target: toRow(row(target.map(e => label(e)), rowMeta(targetTail))),
  keepFail,
  position
});
const feedOrder = rows => cycle.feedOrder(rows)(feedsOf(rows));
const cycleAt = (rows, starts = rows.map((_, index) => index)) => {
  const found = cycle.positiveCycle(rows)(feedsOf(rows))(starts);
  return found instanceof Just ? found.value0 : null;
};

test('independent rows settle in source order', () => {
  const rows = [entry([log], 10, [], 11, 30), entry([log], 12, [], 13, 10),
    entry([log], 14, [], 15, 20)];
  assert.deepEqual(feedOrder(rows), [1, 2, 0]);
});

test('a feeder settles before the row it feeds, whatever its position', () => {
  // Row 0's target ends where row 1's own row does: 0 feeds 1.
  const rows = [entry([log], 10, [], 11, 5), entry([tick], 11, [], 12, 1)];
  assert.deepEqual(feedOrder(rows), [0, 1]);
  const reversed = [entry([log], 10, [], 11, 1), entry([tick], 11, [], 12, 5)];
  assert.deepEqual(feedOrder(reversed), [0, 1]);
  const swapped = [entry([tick], 11, [], 12, 1), entry([log], 10, [], 11, 5)];
  assert.deepEqual(feedOrder(swapped), [1, 0]);
});

test('rows of one cycle settle together in source order', () => {
  const rows = [entry([log], 10, [], 11, 9), entry([tick], 11, [], 10, 3)];
  assert.deepEqual(feedOrder(rows), [1, 0]);
});

test('a self-loop with an extra duplicate is a positive cycle', () => {
  // dup.wxw: own [Console, Log, Log] + t against target [Log, Console] + t.
  const rows = [entry([log, log], 10, [log], 10, 4)];
  assert.equal(cycleAt(rows), 0);
});

test('a self-loop whose keys are all present once is harmless', () => {
  assert.equal(cycleAt([entry([log], 10, [log], 10, 4)]), null);
});

test('a cycle through two rows with a non-positive sum is allowed', () => {
  // cycle2open.wxw: +1 Log one way, -1 the other.
  const rows = [entry([log], 10, [], 11, 1), entry([], 11, [log], 10, 2)];
  assert.equal(cycleAt(rows), null);
});

test('a positive cycle through two rows is reported at its earliest row', () => {
  const rows = [entry([log], 10, [], 11, 8), entry([log, tick], 11, [], 10, 2)];
  assert.equal(cycleAt(rows), 1);
});

test('rows outside every cycle never give a positive sum', () => {
  const rows = [entry([log, log], 10, [], 11, 1), entry([], 12, [], 13, 2)];
  assert.equal(cycleAt(rows), null);
});

test('a Fail key is left out unless the row keeps Fail', () => {
  const failing = keep => ({
    ...entry([], 10, [], 10, 1, keep),
    own: toRow(row([label('fail', { k: 'int' })], rowMeta(10)))
  });
  assert.equal(cycleAt([failing(false)]), null);
  assert.equal(cycleAt([failing(true)]), 0);
});

test('the search starts only from the given rows', () => {
  const rows = [entry([], 20, [], 21, 1), entry([log, log], 10, [log], 10, 2)];
  assert.equal(cycleAt(rows, [0]), null);
  assert.equal(cycleAt(rows, [1]), 1);
});
