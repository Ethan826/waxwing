// FX008 Task 6: tail watches. Binding or extending a watched row meta
// marks it dirty and moves the watch to the tail it was bound to; a
// postponed pair reverts the watch with the rest of its substitution.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as watch from '../output/Features.Check.Watch/index.js';
import * as unifier from '../output/Features.Check.Unify/index.js';
import { label, row, rowMeta, unifyRows } from './row-support.mjs';
import { int, meta } from './unify-support.mjs';

const [clock, log] = [label(0), label(3)];
const watching = (...tails) => tails.reduce(
  (subst, tail) => watch.watchTail(tail)(subst), unifier.empty);
const solved = outcome => {
  assert.ok(outcome.subst, outcome.failure?.constructor.name);
  return outcome.subst;
};
const watched = subst => [...watch.watchedTails(subst)];
const dirty = subst => watch.takeDirty(subst).dirty;

test('binding a watched tail marks it dirty and moves the watch', () => {
  const subst = solved(unifyRows(row([], rowMeta(11)), row([], rowMeta(10)),
    watching(11)));
  assert.deepEqual(dirty(subst), [11]);
  assert.deepEqual(watched(subst), [10]);
  assert.deepEqual(dirty(watch.takeDirty(subst).subst), []);
});

test('extension marks it dirty and watches the fresh tail', () => {
  const subst = solved(unifyRows(row([clock], rowMeta(10)),
    row([clock, log], rowMeta(11)), watching(10)));
  assert.deepEqual(dirty(subst), [10]);
  assert.deepEqual(watched(subst), [-1]);
});

test('a postponed pair reverts the watch', () => {
  const left = row([label(1, meta(1)), label(2), label('fail', meta(0))],
    rowMeta(10));
  const right = row([label(1, int)], rowMeta(11));
  const subst = solved(unifyRows(left, right, watching(10, 11)));
  assert.equal(subst.postponed.length, 1);
  assert.deepEqual(dirty(subst), []);
  assert.deepEqual(watched(subst), [10, 11]);
});

test('unwatched bindings mark nothing', () => {
  const subst = solved(unifyRows(row([clock], rowMeta(10)),
    row([clock, log], rowMeta(11))));
  assert.deepEqual(dirty(subst), []);
  assert.deepEqual(watched(subst), []);
});
