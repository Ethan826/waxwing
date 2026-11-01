import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { companionCases, missed } from './regression-r0-a2-companions.mjs';

// A2 completion wave (dossier §18.148 (2)): record validation's check 4
// (spec §4.1) reads the companions of `Install`, `HandlerLit` and `Defer`
// against one table, identities, sources and targets included. Local
// record consistency only: it does not show that generation recorded
// every source site needing an owner (U6 stays open). The corpus check is
// test/r0-a2-record-corpus.serial.test.mjs.
const cases = await companionCases(load);
const { Record, Effect } = cases;

test('the unchanged problems record no companion defect', () => {
  for (const [name, problem] of Object.entries(cases.unchanged))
    assert.equal(Record.recordDefect(problem).constructor.name, 'Nothing',
      name);
});

// Every mutant really changes the problem's obligations.
test('every mutant differs from its problem', () => {
  for (const mutants of [cases.deleted, cases.miswired, cases.unowned])
    for (const [name, [problem]] of Object.entries(mutants)) {
      const original = Object.values(cases.unchanged).find(item =>
        item.decl === problem.decl);
      const same = original.effects.obligations.length
        === problem.effects.obligations.length
        && original.effects.obligations.every((placed, index) =>
          Effect.eqProvenance.eq(placed.provenance)(
            problem.effects.obligations[index].provenance)
          && Effect.eqObligation.eq(placed.value)(
            problem.effects.obligations[index].value));
      assert.ok(!same, name);
    }
});

// Deleting a required companion: the owner's row is violated, so the
// defect is at the owner's provenance. C15 without its InstallR is the
// whole-branch reviewer's probe (§18.147 (2)), validated before check 4.
test('a deleted companion is a defect at its owner', () => {
  assert.equal(Object.keys(cases.deleted).length, 7);
  assert.deepEqual(missed(cases, cases.deleted), []);
});

// Wrong source, wrong target, wrong path, wrong role or clause index, or
// a second copy: the owner lacks exactly one companion of its identity
// and record, and is recorded before it, so the owner is reported.
test('a miswired companion is a defect at its owner', () => {
  assert.equal(Object.keys(cases.miswired).length, 14);
  assert.deepEqual(missed(cases, cases.miswired), []);
});

// A companion no owner requires is reported at its own provenance; an
// owner whose identity is not the table's is reported at its own.
test('an unowned companion is a defect at the companion', () => {
  assert.equal(Object.keys(cases.unowned).length, 7);
  assert.deepEqual(missed(cases, cases.unowned), []);
});
