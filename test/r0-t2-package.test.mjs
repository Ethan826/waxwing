import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { sameSubstitution } from './r0-a2-canonical.mjs';
import { packageCases } from './r0-t2-package-cases.mjs';
import { packageChecks } from './r0-t2-package-checks.mjs';

// Tranche 2 Task 11 (design §C.3, §C.6, §C.7, Task 6; dossier §18.155
// (3), (5), (6)): `readEffects` assembles one declaration's package from
// the row, mark and image read-backs on one hole numbering. Fixture-level.
const cases = await packageCases(load);
const checks = await packageChecks(load);
const Erase = await load('Features.Check.Strategy.Effects.Package');
const every = cases.every();

test('every fixture reads a package', () => {
  assert.deepEqual(every.map(item => `${item.name}:${cases.faultOf(
    cases.effectsOf(item))}`).filter(text => !text.endsWith(':Right')), []);
});

test('one live meta is one hole number in every map reading it', () => {
  assert.deepEqual(checks.sharedWrong(), []);
});

test('two metas are two hole numbers', () => {
  assert.deepEqual(checks.distinctWrong(), []);
});

test('effect and type holes never share a number', () => {
  assert.deepEqual(checks.sortsWrong(), []);
});

test("extension numbers follow the body's, in the stated order", () => {
  assert.deepEqual(checks.extensionWrong(), []);
});

test('a hole θ binds reads bound on both sides', () => {
  assert.deepEqual(checks.thetaWrong(), []);
});

test('a θ binding the package cannot hold is UnreadImage', () => {
  assert.deepEqual(checks.thetaFaultWrong(), []);
});

test("erased types equal today's unsettled", () => {
  for (const item of every)
    assert.ok(sameSubstitution(Erase.erase(cases.packageOf(item)),
      item.readBack.unsettled), item.name);
});

test('no forced binding', () => {
  assert.deepEqual(checks.forcedWrong(), []);
});

test('Declined for an Unsupported problem', () => {
  assert.deepEqual(checks.declinedWrong(), []);
});

test('the first Unsupported in recorded order is declined', () => {
  assert.deepEqual(checks.declinedOrderWrong(), []);
});

test('a bound record tail follows Merge, else UnreadImage', () => {
  assert.deepEqual(checks.recordTailWrong(), []);
});

test('MarkClash first', () => {
  assert.deepEqual(checks.clashWrong(), []);
});

test('a partial call with an arrow result validates', () => {
  assert.deepEqual(checks.arrowResultWrong(), []);
});

test('a mark the injected terms do not read is an unread label', () => {
  assert.deepEqual(checks.unmarkedWrong(), []);
});
