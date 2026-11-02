import test from 'node:test';
import assert from 'node:assert/strict';
import { admission, gateCases } from './r0-t2-honest-gate-cases.mjs';

// Tranche 2 Task 13's gate on synthetic rows (fixture-level): the
// must-fail probes (a planted extra refusal, a removed pinned entry, a
// count one below the floor) and ruling §18.155 (7)'s admission, which
// refuses a Malformed, a read fault outside (a), an unexpected refusal
// and a fourth RequirementUnjudged. test/r0-t2-honest.serial.test.mjs
// runs the same probes on the corpus.
const cases = gateCases();

test('the gate holds on its own observation', () => {
  assert.deepEqual(cases.holds(), []);
});

test('a planted extra refusal fails the gate', () => {
  assert.match(cases.extraRefusal().join('\n'), /refusal not pinned/);
});

test('a removed pinned entry fails the gate', () => {
  assert.match(cases.removedEntry().join('\n'),
    /pinned, not observed|not pinned/);
});

test('a validated count one below the floor fails the gate', () => {
  assert.match(cases.belowFloor().join('\n'), /below the floor/);
});

test('a certify-accepted declaration refused and unpinned fails', () => {
  assert.match(cases.acceptedRefused().join('\n'),
    /certify accepts, not validated nor pinned/);
});

test('ruling (7) admits the identified lists only', () => {
  assert.deepEqual(cases.admitted(), []);
  assert.match(cases.malformed().join('\n'), /^Malformed: /m);
  assert.match(cases.extraFault().join('\n'), /read fault not approved/);
  assert.match(cases.missingFault().join('\n'),
    /approved read fault not observed/);
  assert.match(cases.otherRefusal().join('\n'),
    /unexpected validator refusal: .* NotCertifiable ForcedTail/);
  assert.match(cases.differentG0().join('\n'),
    /unexpected validator refusal/);
  assert.match(cases.fourUnjudged().join('\n'), /4 refusals, more than 3/);
});

test('admission is the function the pin script calls', () => {
  assert.equal(typeof admission, 'function');
});
