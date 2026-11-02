import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { fixtures, onlineChecks, pinnedDecisions }
  from './r0-t2-online-checks.mjs';

// Tranche 2 Task 12 (design §C.6, Task 7; dossier §18.155 (4), (5);
// statements §7's interim amendment): the online certificate's `effects`
// is the honest package or its read fault, and nothing reads it. A read
// fault keeps the candidate and G0's verdict (legacy certification under
// F14). Fixture-level; checks in test/r0-t2-online-checks.mjs. The scan
// that Online imports no Effects.Validate or Effects.Complete is in
// test/structure-r0.test.mjs.
const checks = await onlineChecks(load);

test('the fixtures cover a package and both read-fault routes', () => {
  assert.deepEqual(fixtures.map(fixture => fixture.outcome),
    ['Right', 'Right', 'Declined', 'UnreadImage', 'UnreadImage']);
});

// The pin is not vacuous: every fixture has one, and the Solved ones carry
// G0's `Valid`, `Pending` assurance and a witnessed compilation.
test('the pinned decisions cover every fixture with whole Solutions', () => {
  const pinned = pinnedDecisions();
  assert.deepEqual(Object.keys(pinned), fixtures.map(item => item.name));
  for (const name of ['lone', 'held', 'c7', 'q7']) {
    const [solution] = pinned[name].Right[0].verdict.Solved;
    assert.deepEqual(Object.keys(solution), ['strategy', 'validity',
      'assurance', 'compilation'], name);
    assert.deepEqual(solution.validity, { Valid: [] }, name);
    assert.ok('Pending' in solution.assurance, name);
    assert.ok('Witnessed' in solution.compilation, name);
  }
});

test('the certificate carries the package read from recheck', () => {
  assert.deepEqual(checks.carriedWrong(), []);
});

test('a read fault keeps the candidate, its σ, claim and holes', () => {
  assert.deepEqual(checks.keptWrong(), []);
});

test('G0 decides as before; no read fault reads as effect validation',
  () => {
    assert.deepEqual(checks.verdictWrong(), []);
  });
