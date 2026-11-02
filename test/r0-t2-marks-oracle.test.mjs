import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { oracleCases } from './r0-t2-marks-oracle-cases.mjs';

// Tranche 2 Task 9 (statements §5; design §F): the PureScript least
// terms against U1's bounded mark oracle (research/amin-mark-oracle/).
// Bounded, and a seeded subset here: pairs36 (the validator's `holds`,
// which the terms feed) and 20,000 of the random family's seeded graphs,
// with every node's term against the oracle's own least terms. Every
// family in full ran once as evidence (research/t2-read-back-design/
// marks-oracle.mjs). Standing (§18.153): bounded agreement with the
// definition; not independent evidence of recorded/live correspondence
// (P1 untested).
const SAMPLE = 20000;
const oracle = await oracleCases(load);
const { verdict, holds, counts, families } = oracle;

test('pairs36: holds against the meaning over every valuation', () => {
  assert.deepEqual(families.pairsFamily(holds).found, []);
});

test('random (seeded, 20,000): three verdicts and every term agree', () => {
  const result = families.randomFamily(verdict(), SAMPLE);
  assert.deepEqual(result.found, []);
  assert.equal(counts.graphs, SAMPLE);
  assert.equal(counts.differ, 0);
  assert.equal(counts.clashDiffer, 0);
  // Nodes of the graphs without a clash (seeded, so exact).
  assert.equal(counts.nodes, 79117);
});

test('the equalities-ignored mutant is detected', () => {
  const result = families.randomFamily(verdict(false), SAMPLE);
  assert.ok(result.found.length > 0);
});
