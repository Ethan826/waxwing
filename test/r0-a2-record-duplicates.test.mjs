import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { duplicateCases } from './regression-r0-a2-record-duplicates.mjs';

// Record check 6 (dossier §18.155 (2); spec §4.1, §5 item 1): a repeated
// entry in `flexEff` or `positions` is a RecordDefect, reported once as
// the `InDeclaredLists` entry; a variable or position referenced many
// times but listed once is none. Fixture-level checks of `use` (spec
// §12 C1); the corpus check is test/r0-a2-record-corpus.serial.test.mjs.
const cases = await duplicateCases(load);
const { Effect, Nothing, use, owned, referenced } = cases;

for (const [name, problem, expected] of cases.rows)
  test(`record check 6: ${name}`, () => {
    assert.equal(cases.describe(problem), expected);
  });

test('the fixture lists its entries once and names them many times', () => {
  assert.ok(owned !== undefined, 'use records a package-owned variable');
  assert.ok(use.effects.positions.length > 0, 'use records a position');
  const named = JSON.stringify(referenced.effects.obligations);
  const times = text => named.split(text).length - 1;
  assert.ok(times(JSON.stringify(owned)) >= 4);
  assert.ok(times(JSON.stringify(use.effects.positions[0])) >= 4);
  assert.equal(referenced.effects.flexEff, use.effects.flexEff);
  assert.equal(referenced.effects.positions, use.effects.positions);
});

test('a repeat is one report naming no path', () => {
  const problem = cases.rows.find(([name]) =>
    name === 'both lists repeated')[1];
  const found = cases.Record.recordDefect(problem);
  assert.equal(found.constructor.name, 'Just');
  const { provenance, check } = found.value0;
  assert.ok(provenance instanceof Effect.InRecord);
  assert.ok(provenance.value0.table instanceof Effect.InDeclaredLists);
  assert.ok(provenance.value0.path instanceof Nothing);
  assert.equal(check, 6);
});
