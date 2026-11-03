import test from 'node:test';
import assert from 'node:assert/strict';
import { admission, gateCases } from './r0-t2-honest-gate-cases.mjs';
import { unjudged } from './r0-t2-honest-gate.mjs';

// Tranche 2 Task 13's gate on synthetic rows (fixture-level): the
// must-fail probes (a planted extra refusal, a removed pinned entry, a
// count one below the floor) and ruling §18.155 (7)'s admission, which
// refuses a Malformed, a read fault outside (a), an unexpected refusal
// and a fourth RequirementUnjudged. test/r0-t2-honest.serial.test.mjs
// runs the same probes on the corpus.
const cases = gateCases();
const lowered = (key, from, to) => `d: ${key} ${from} to ${to} refused; `
  + 'a lower floor or candidate count needs the author\'s ruling, '
  + 'not --explain';

test('the gate holds on its own observation', () => {
  assert.deepEqual(cases.holds(), []);
});

test('a planted extra refusal fails the gate', () => {
  assert.match(cases.extraRefusal().join('\n'), /refusal not pinned/);
});

test('a removed pinned entry fails the gate', () => {
  assert.deepEqual(cases.removedEntry(),
    [`refusal pinned, not observed: ${unjudged[0]} `
      + 'RequirementUnjudged {"decl":0}']);
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
  assert.deepEqual(cases.otherRefusal(), ['unexpected validator '
    + `refusal: ${unjudged[2]} NotCertifiable ForcedTail (certify: `
    + 'accepted)']);
  assert.match(cases.differentG0().join('\n'),
    /unexpected validator refusal/);
  assert.match(cases.fourUnjudged().join('\n'), /4 refusals, more than 3/);
});

test('list (b) holds the three named declarations only', () => {
  assert.deepEqual(cases.vanishedRefusal(),
    [`approved refusal not observed: ${unjudged[1]}`]);
  assert.deepEqual(cases.explainedVanish(), []);
  assert.deepEqual(cases.newRefusal(), ['unexpected validator refusal: '
    + 'v.wxw#a RequirementUnjudged {"decl":0} (certify: '
    + 'RequirementUnjudged {"decl":0})']);
});

test('the re-pin rule refuses what it must and keeps explanations',
  () => {
    assert.deepEqual(cases.repinHolds(), []);
    assert.deepEqual(cases.withoutRepin(), ['a pin exists: --repin']);
    assert.deepEqual(cases.repinVanish(),
      [`needs --explain: d: vanished ${unjudged[1]}`]);
    assert.deepEqual(cases.repinLowered(), [lowered('floor', 3, 2)]);
    assert.deepEqual(cases.repinMissing(),
      ['the old pin has no denominator d']);
    assert.deepEqual(cases.repinKeeps(), [
      { explanation: 'earlier', covers: [] },
      { explanation: 'why', covers: [`d: vanished ${unjudged[1]}`] }]);
  });

// §18.157: `--explain` documents a change; it never permits a lower
// floor or candidate count.
test('an explanation does not permit a lower floor or count', () => {
  assert.deepEqual(cases.explainedFloor(), [lowered('floor', 3, 2)]);
  assert.deepEqual(cases.explainedCandidates(),
    [lowered('candidates', 18, 17)]);
  assert.deepEqual(cases.explainedEqual(), []);
  assert.deepEqual(cases.explainedHigher(), []);
});

test('admission is the function the pin script calls', () => {
  assert.equal(typeof admission, 'function');
});
