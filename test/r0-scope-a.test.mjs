import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { scopeAChecks } from './r0-scope-a-checks.mjs';

// Scope A's implementation checks (dossier §18.198-§18.200; proposal §8
// task 4). Each check is also a restored-defect probe
// (test/regression-r0-scope-a.mjs, rows in
// scripts/regression-r0-scope-a.mjs).
const checks = await scopeAChecks(load);

test('under is canonicalization after one substitution, idempotent', () => {
  assert.deepEqual(checks.canonicalWrong(), []);
});

test('generated tables: holder set, admitted set, S7, TableBases', () => {
  assert.deepEqual(checks.tablesWrong(), []);
  const seen = checks.coverage;
  // The generator reaches what the checks are about (not vacuous).
  assert.ok(seen.resolved >= 140, JSON.stringify(seen));
  assert.ok(seen.holders >= 50 && seen.transitive >= 5, JSON.stringify(seen));
  assert.ok(seen.marked >= 50 && seen.unmarked >= 50, JSON.stringify(seen));
});

test('out-of-scope shapes stay out of Solved; exposure alone blocks',
  () => {
    assert.deepEqual(checks.boundaryWrong(), []);
  });

test('an undefined requirement type with an app node is refused',
  async () => {
    assert.deepEqual(await checks.definednessWrong(), []);
  });

test('GroundRule reads a nullary declared base as its type', async () => {
  assert.deepEqual(await checks.groundKindWrong(), []);
});
